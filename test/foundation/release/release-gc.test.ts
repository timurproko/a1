import { lstat, mkdir, mkdtemp, readFile, rename, rm, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CohortStateStore,
  materializeRelease,
  runBoundedReleaseCleanup,
  runReleaseCleanupWorker,
  scheduleReleaseCleanup,
  type MaterializedRelease,
  type UpdateTransaction,
} from "../../../src/foundation/release/index.js";
import { resolveProductPaths } from "../../../src/foundation/lifecycle/index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

const noTransaction = { read: async () => null };

describe("bounded immutable release cleanup", () => {
  it("detaches historical releases, preserves active and rollback, and removes certification after content", async () => {
    const fixture = await releaseFixture(3);
    const [obsolete, rollback, active] = fixture.releases;
    await activateAll(fixture.store, fixture.releases);
    const obsoleteCertification = resolve(fixture.dataDir, `certification-${obsolete!.releaseId}.json`);
    await writeFile(obsoleteCertification, "certified");
    await fixture.store.update(state => ({
      ...state,
      releases: { ...state.releases, [obsolete!.releaseId]: { ...state.releases[obsolete!.releaseId]!, diagnosticsPath: obsoleteCertification } },
      references: { ...state.references, retention: fixture.releases.map(release => release.releaseId) },
    }));

    const result = await runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore: noTransaction });
    const state = await fixture.store.read();

    expect(result.completed).toBe(1);
    expect(state.references).toMatchObject({ active: active!.releaseId, rollback: rollback!.releaseId, retention: [rollback!.releaseId, active!.releaseId].sort() });
    expect(Object.keys(state.releases).sort()).toEqual([rollback!.releaseId, active!.releaseId].sort());
    await expect(lstat(obsolete!.releaseRoot)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(obsoleteCertification)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(active!.releaseRoot)).resolves.toBeTruthy();
    await expect(lstat(rollback!.releaseRoot)).resolves.toBeTruthy();
  });

  it("deletes only canonical managed certification evidence when legacy metadata uses another path spelling", async () => {
    const fixture = await releaseFixture(3);
    const obsolete = fixture.releases[0]!;
    await activateAll(fixture.store, fixture.releases);
    const canonical = resolve(fixture.dataDir, `certification-${obsolete.releaseId}.json`);
    const unrelated = resolve(fixture.root, "outside-certification.json");
    await writeFile(unrelated, "keep");
    await fixture.store.update(state => ({
      ...state,
      releases: {
        ...state.releases,
        [obsolete.releaseId]: {
          ...state.releases[obsolete.releaseId]!,
          diagnosticsPath: process.platform === "win32" ? canonical.toUpperCase() : unrelated,
        },
      },
    }));

    await runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore: noTransaction });

    await expect(lstat(canonical)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(unrelated, "utf8")).resolves.toBe("keep");
  });

  it("recovers when interruption occurs after trash movement but before state advancement", async () => {
    const fixture = await releaseFixture(3);
    const obsolete = fixture.releases[0]!;
    await activateAll(fixture.store, fixture.releases);
    await fixture.store.reconcileRetention(() => ({}));
    const trashRoot = resolve(fixture.dataDir, "releases", ".trash");
    await mkdir(trashRoot, { recursive: true });
    const interruptedTrash = resolve(trashRoot, `${obsolete.releaseId}--interrupted`);
    await rename(obsolete.releaseRoot, interruptedTrash);

    await expect(runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore: noTransaction })).resolves.toMatchObject({ completed: 1 });

    expect((await fixture.store.read()).cleanup.pending[obsolete.releaseId]).toBeUndefined();
    await expect(lstat(interruptedTrash)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("refuses escaping records and linked orphan roots without deleting either target", async () => {
    const fixture = await releaseFixture(3);
    const obsolete = fixture.releases[0]!;
    await activateAll(fixture.store, fixture.releases);
    const external = resolve(fixture.root, "outside");
    await mkdir(external);
    await writeFile(resolve(external, "keep.txt"), "keep");
    await fixture.store.update(state => ({
      ...state,
      releases: { ...state.releases, [obsolete.releaseId]: { ...state.releases[obsolete.releaseId]!, releaseRoot: external } },
    }));
    const link = resolve(fixture.dataDir, "releases", "linked-orphan");
    await symlink(external, link, "junction");

    await runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore: noTransaction });
    const state = await fixture.store.read();

    await expect(readFile(resolve(external, "keep.txt"), "utf8")).resolves.toBe("keep");
    await expect(lstat(obsolete.releaseRoot)).resolves.toBeTruthy();
    expect(state.cleanup.pending[obsolete.releaseId]?.lastError).toMatch(/recorded release path differs|ENOENT/);
    expect(state.cleanup.diagnostics.some(item => item.releaseId === "linked-orphan")).toBe(true);
  });

  it("keeps live, transaction, and external-hold releases until every authority releases them", async () => {
    const fixture = await releaseFixture(5);
    await activateAll(fixture.store, fixture.releases);
    const [live, held, transaction] = fixture.releases;
    const activeTransaction = transactionFixture(transaction!.releaseId);

    await fixture.store.reconcileRetention(() => ({
      liveReleaseIds: [live!.releaseId],
      externalHolds: [{ authority: "agent", releaseId: held!.releaseId }],
      transaction: activeTransaction,
    }));
    const protectedState = await fixture.store.read();
    expect(protectedState.releases[live!.releaseId]).toBeDefined();
    expect(protectedState.releases[held!.releaseId]).toBeDefined();
    expect(protectedState.releases[transaction!.releaseId]).toBeDefined();

    await runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore: noTransaction });
    const released = await fixture.store.read();
    expect(released.releases[live!.releaseId]).toBeUndefined();
    expect(released.releases[held!.releaseId]).toBeUndefined();
    expect(released.releases[transaction!.releaseId]).toBeUndefined();
  });

  it("attempts eligible work even when its physical batch clock is already exhausted", async () => {
    const fixture = await releaseFixture(3);
    await activateAll(fixture.store, fixture.releases);
    let tick = 0;

    const result = await runBoundedReleaseCleanup(fixture.dataDir, undefined, {
      transactionStore: noTransaction,
      limits: { maxItems: 3, concurrency: 1, maxDurationMs: 1 },
      now: () => { tick += 10; return tick; },
    });

    expect(result.attempted).toBe(1);
    expect(result.completed).toBe(1);
  });

  it("bounds a large backlog by item count and leaves retry dispositions", async () => {
    const fixture = await releaseFixture(42);
    await activateAll(fixture.store, fixture.releases);

    const first = await runBoundedReleaseCleanup(fixture.dataDir, undefined, {
      transactionStore: noTransaction,
      limits: { maxItems: 3, concurrency: 2, maxDurationMs: 60_000 },
    });

    expect(first.attempted).toBe(3);
    expect(first.completed).toBe(3);
    expect(first.remaining).toBe(37);
    expect(Object.keys((await fixture.store.read()).releases)).toHaveLength(2);
  }, 30_000);

  it("drains a backlog larger than one worker batch without another user command", async () => {
    const fixture = await releaseFixture(12);
    await activateAll(fixture.store, fixture.releases);
    const environment = cleanupEnvironment(fixture.dataDir, "drain-run");

    const result = await runReleaseCleanupWorker(environment, {
      cleanup: { transactionStore: noTransaction, limits: { maxItems: 2, concurrency: 1, maxDurationMs: 60_000 } },
      maxDurationMs: 60_000,
    });
    const state = await fixture.store.read();

    expect(result.completed).toBe(10);
    expect(result.remaining).toBe(0);
    expect(Object.keys(state.releases)).toHaveLength(2);
    expect(state.cleanup.workerRuns.find(run => run.runId === "drain-run")).toMatchObject({
      status: "completed",
      attempted: 10,
      completed: 10,
      remaining: 0,
    });
  }, 30_000);

  it("preserves stale candidates during an active transaction and removes them afterward", async () => {
    const fixture = await releaseFixture(1);
    const candidate = resolve(fixture.dataDir, "releases", ".candidate-abandoned");
    const recent = resolve(fixture.dataDir, "releases", ".candidate-recent");
    await mkdir(candidate);
    await mkdir(recent);
    const old = new Date(Date.now() - 2 * 60 * 60 * 1_000);
    await utimes(candidate, old, old);
    const active = transactionFixture(null);

    await runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore: { read: async () => active }, candidateAgeMs: 60_000 });
    await expect(lstat(candidate)).resolves.toBeTruthy();

    await runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore: noTransaction, candidateAgeMs: 60_000 });
    await expect(lstat(candidate)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(recent)).resolves.toBeTruthy();
  });

  it("records a transient Windows-style sharing failure and succeeds on retry", async () => {
    const fixture = await releaseFixture(3);
    const obsolete = fixture.releases[0]!;
    await activateAll(fixture.store, fixture.releases);
    let locked = true;
    const remove = vi.fn<typeof rm>(async (path, options) => {
      if (locked && String(path).includes(".trash")) {
        const error = Object.assign(new Error("sharing violation"), { code: "EPERM" });
        throw error;
      }
      return await rm(path, options);
    });

    const failed = await runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore: noTransaction, operations: { remove } });
    expect(failed.completed).toBe(0);
    expect((await fixture.store.read()).cleanup.pending[obsolete.releaseId]?.lastError).toContain("sharing violation");

    locked = false;
    const retried = await runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore: noTransaction, operations: { remove } });
    expect(retried.completed).toBe(1);
    expect((await fixture.store.read()).cleanup.pending[obsolete.releaseId]).toBeUndefined();
  });

  it("does not let one persistently blocked release starve other eligible releases", async () => {
    const fixture = await releaseFixture(5);
    const blocked = fixture.releases[0]!;
    await activateAll(fixture.store, fixture.releases);
    const remove = vi.fn<typeof rm>(async (path, options) => {
      if (String(path).includes(`${blocked.releaseId}--`)) throw Object.assign(new Error("sharing violation"), { code: "EPERM" });
      return await rm(path, options);
    });

    await runReleaseCleanupWorker(cleanupEnvironment(fixture.dataDir, "blocked-run"), {
      cleanup: { transactionStore: noTransaction, operations: { remove } },
      maxNoProgressBatches: 2,
      retryDelayMs: 1,
      sleep: async () => {},
    });
    const state = await fixture.store.read();

    expect(Object.keys(state.cleanup.pending)).toEqual([blocked.releaseId]);
    expect(state.cleanup.pending[blocked.releaseId]?.attempts).toBeGreaterThanOrEqual(2);
    expect(state.cleanup.workerRuns.find(run => run.runId === "blocked-run")?.status).toBe("blocked");
    for (const release of fixture.releases.slice(1, 3)) await expect(lstat(release!.releaseRoot)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rechecks transaction protection after detachment before moving content", async () => {
    const fixture = await releaseFixture(3);
    const obsolete = fixture.releases[0]!;
    await activateAll(fixture.store, fixture.releases);
    let reads = 0;
    const transactionStore = {
      read: async () => {
        reads += 1;
        return reads === 1 ? null : transactionFixture(obsolete.releaseId);
      },
    };

    const result = await runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore });

    expect(result.completed).toBe(0);
    await expect(lstat(obsolete.releaseRoot)).resolves.toBeTruthy();
    expect((await fixture.store.read()).cleanup.pending[obsolete.releaseId]).toBeDefined();
  });

  it("uses one physical worker lease and records duplicate workers as skipped", async () => {
    const fixture = await releaseFixture(3);
    await activateAll(fixture.store, fixture.releases);
    let releaseRemovalStarted!: () => void;
    let allowRemoval!: () => void;
    const started = new Promise<void>(resolvePromise => { releaseRemovalStarted = resolvePromise; });
    const allowed = new Promise<void>(resolvePromise => { allowRemoval = resolvePromise; });
    let paused = false;
    const remove = vi.fn<typeof rm>(async (path, options) => {
      if (!paused && String(path).includes(".trash")) {
        paused = true;
        releaseRemovalStarted();
        await allowed;
      }
      return await rm(path, options);
    });
    const first = runReleaseCleanupWorker(cleanupEnvironment(fixture.dataDir, "lease-owner"), {
      cleanup: { transactionStore: noTransaction, operations: { remove } },
    });
    await started;

    const duplicate = await runReleaseCleanupWorker(cleanupEnvironment(fixture.dataDir, "lease-duplicate"), {
      cleanup: { transactionStore: noTransaction },
    });
    allowRemoval();
    await first;
    const state = await fixture.store.read();

    expect(duplicate.attempted).toBe(0);
    expect(state.cleanup.workerRuns.find(run => run.runId === "lease-duplicate")?.status).toBe("skipped");
  });

  it("reclaims a stale worker lease before draining", async () => {
    const fixture = await releaseFixture(3);
    await activateAll(fixture.store, fixture.releases);
    await writeFile(resolve(fixture.dataDir, "release-cleanup-worker.lock"), JSON.stringify({ runId: "dead", pid: 999_999 }));

    const result = await runReleaseCleanupWorker(cleanupEnvironment(fixture.dataDir, "recovered-run"), {
      cleanup: { transactionStore: noTransaction },
    });

    expect(result.completed).toBe(1);
    await expect(lstat(resolve(fixture.dataDir, "release-cleanup-worker.lock"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("keeps spawn success scheduled until the worker records real progress", async () => {
    const fixture = await releaseFixture(3);
    await activateAll(fixture.store, fixture.releases);
    const environment = cleanupEnvironment(fixture.dataDir, "unused");
    const paths = resolveProductPaths(environment);
    let workerEnvironment: NodeJS.ProcessEnv | undefined;

    await scheduleReleaseCleanup(fixture.dataDir, paths, {
      transactionStore: noTransaction,
      workerSpawner: async (_entry, childEnvironment) => { workerEnvironment = childEnvironment; },
    });
    const scheduled = (await fixture.store.read()).cleanup.workerRuns.at(-1)!;
    expect(scheduled).toMatchObject({ status: "scheduled", attempted: 0, completed: 0 });

    await runReleaseCleanupWorker(workerEnvironment!, { cleanup: { transactionStore: noTransaction } });
    const completed = (await fixture.store.read()).cleanup.workerRuns.find(run => run.runId === scheduled.runId);
    expect(completed).toMatchObject({ status: "completed", completed: 1, remaining: 0 });
  });

  it("records scheduling failure without claiming that maintenance ran", async () => {
    const fixture = await releaseFixture(3);
    await activateAll(fixture.store, fixture.releases);
    const environment = cleanupEnvironment(fixture.dataDir, "unused");
    const paths = resolveProductPaths(environment);

    await scheduleReleaseCleanup(fixture.dataDir, paths, {
      transactionStore: noTransaction,
      workerSpawner: async () => { throw new Error("worker executable missing"); },
    });
    const state = await fixture.store.read();
    const run = state.cleanup.workerRuns.at(-1);

    expect(run).toMatchObject({ status: "failed", batches: 0, attempted: 0, completed: 0 });
    expect(run?.error).toContain("worker executable missing");
    expect(state.cleanup.diagnostics.at(-1)).toMatchObject({ releaseId: "worker", stage: "spawn" });
  });

  it("persists a fatal worker failure and rejects the private entry operation", async () => {
    const fixture = await releaseFixture(3);
    await activateAll(fixture.store, fixture.releases);

    await expect(runReleaseCleanupWorker(cleanupEnvironment(fixture.dataDir, "failed-run"), {
      cleanup: { transactionStore: { read: async () => { throw new Error("transaction journal unavailable"); } } },
    })).rejects.toThrow("transaction journal unavailable");
    const run = (await fixture.store.read()).cleanup.workerRuns.find(item => item.runId === "failed-run");

    expect(run).toMatchObject({ status: "failed", attempted: 0, completed: 0 });
    expect(run?.error).toContain("transaction journal unavailable");
  });

  it("records successor handoff when the worker lifetime expires", async () => {
    const fixture = await releaseFixture(5);
    await activateAll(fixture.store, fixture.releases);
    let tick = 0;
    const continuation = vi.fn(async () => {});

    const result = await runReleaseCleanupWorker(cleanupEnvironment(fixture.dataDir, "continued-run"), {
      cleanup: { transactionStore: noTransaction, limits: { maxItems: 1, concurrency: 1, maxDurationMs: 60_000 } },
      maxDurationMs: 1,
      now: () => { tick += 10; return tick; },
      continueWorker: continuation,
    });
    const run = (await fixture.store.read()).cleanup.workerRuns.find(item => item.runId === "continued-run");

    expect(result.completed).toBe(1);
    expect(run?.status).toBe("continued");
    expect(continuation).toHaveBeenCalledOnce();
  });

  it("converges when two cleanup coordinators overlap", async () => {
    const fixture = await releaseFixture(5);
    await activateAll(fixture.store, fixture.releases);

    await Promise.all([
      runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore: noTransaction }),
      runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore: noTransaction }),
    ]);
    await runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore: noTransaction });

    const state = await fixture.store.read();
    expect(Object.keys(state.releases)).toHaveLength(2);
    expect(Object.keys(state.cleanup.pending)).toHaveLength(0);
    await expect(lstat(fixture.releases[3]!.releaseRoot)).resolves.toBeTruthy();
    await expect(lstat(fixture.releases[4]!.releaseRoot)).resolves.toBeTruthy();
  });

  it("adopts a canonical orphan but never touches profile and unrelated roots", async () => {
    const fixture = await releaseFixture(1);
    const config = resolve(fixture.root, "config", "settings.json");
    const sessions = resolve(fixture.root, "sessions", "session.jsonl");
    await mkdir(resolve(config, ".."), { recursive: true });
    await mkdir(resolve(sessions, ".."), { recursive: true });
    await writeFile(config, "settings");
    await writeFile(sessions, "session");
    const abandonedCertification = resolve(fixture.dataDir, "certification-obsolete-release.json");
    await writeFile(abandonedCertification, "certification");

    await runBoundedReleaseCleanup(fixture.dataDir, undefined, { transactionStore: noTransaction });

    await expect(lstat(fixture.releases[0]!.releaseRoot)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(lstat(abandonedCertification)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(readFile(config, "utf8")).resolves.toBe("settings");
    await expect(readFile(sessions, "utf8")).resolves.toBe("session");
  });
});

async function releaseFixture(count: number) {
  const root = await mkdtemp(resolve(tmpdir(), "a1-release-gc-"));
  roots.push(root);
  const dataDir = resolve(root, "data");
  const releases: MaterializedRelease[] = [];
  for (let index = 0; index < count; index += 1) {
    const packageRoot = resolve(root, `package-${index}`);
    await mkdir(resolve(packageRoot, "dist"), { recursive: true });
    await writeFile(resolve(packageRoot, "package.json"), JSON.stringify({ name: "@timurproko/a1", version: `1.0.${index}`, files: ["dist"] }));
    await writeFile(resolve(packageRoot, "dist", "app.js"), `export default ${index};`);
    releases.push(await materializeRelease(packageRoot, dataDir));
  }
  return { root, dataDir, releases, store: new CohortStateStore(dataDir) };
}

async function activateAll(store: CohortStateStore, releases: readonly MaterializedRelease[]): Promise<void> {
  for (const release of releases) {
    await store.recordCandidate(release);
    const certification = resolve(release.releaseRoot, "..", "..", `certification-${release.releaseId}.json`);
    await writeFile(certification, JSON.stringify({ releaseId: release.releaseId }));
    await store.approve(release.releaseId, certification);
    await store.activate(release.releaseId);
  }
}

function cleanupEnvironment(dataDir: string, runId: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    A1_DATA_DIR: dataDir,
    A1_RUNTIME_DIR: resolve(dataDir, "runtime"),
    A1_RELEASE_CLEANUP_RUN_ID: runId,
  };
}

function transactionFixture(priorActiveReleaseId: string | null): UpdateTransaction {
  return {
    schema: "a1-update-journal-v1",
    transactionId: "transaction",
    channel: "stable",
    targetVersion: "2.0.0",
    packageRoot: "/package",
    priorActiveReleaseId,
    phase: "materialized",
    status: "active",
    error: null,
    startedAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}
