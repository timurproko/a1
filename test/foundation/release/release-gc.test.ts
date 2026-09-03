import { lstat, mkdir, mkdtemp, readFile, rename, rm, symlink, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CohortStateStore,
  materializeRelease,
  runBoundedReleaseCleanup,
  type MaterializedRelease,
  type UpdateTransaction,
} from "../../../src/foundation/release/index.js";

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
