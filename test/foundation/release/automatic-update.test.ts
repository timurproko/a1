import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AUTOMATIC_UPDATE_RETRY_MS,
  AUTOMATIC_UPDATE_STATE_SCHEMA,
  AutomaticUpdateStateStore,
  requestAutomaticUpdate,
  runAutomaticUpdateWorker,
  type AutomaticUpdateState,
} from "../../../src/foundation/release/automatic-update.js";
import { acquireUpdateExecutionLease } from "../../../src/foundation/release/update-execution-lease.js";
import { CohortStateStore, emptyState } from "../../../src/foundation/release/cohort-state.js";
import { UpdateTransactionStore } from "../../../src/foundation/release/update-transaction.js";

const roots: string[] = [];
const release = {
  channel: "stable" as const,
  version: "1.2.4",
  command: "a1 update",
  changelogUrl: "https://example.test/1.2.4",
};

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

async function harness() {
  const dataDir = await mkdtemp(join(tmpdir(), "a1-automatic-update-"));
  roots.push(dataDir);
  return { dataDir, environment: { A1_DATA_DIR: dataDir } };
}

function failedState(now: number): AutomaticUpdateState {
  return {
    schema: AUTOMATIC_UPDATE_STATE_SCHEMA,
    channel: "stable",
    targetVersion: release.version,
    status: "failed",
    attemptedAt: now,
    updatedAt: now,
    installedVersion: null,
    failure: "exit-1",
  };
}

describe("automatic update coordination", () => {
  it("spawns the immutable worker with an exact target and observes activation for this session", async () => {
    const { dataDir, environment } = await harness();
    const spawnWorker = vi.fn(async (_entry: string, _arguments: readonly string[], _environment: NodeJS.ProcessEnv) => undefined);
    let active: string | null = null;
    const installed = await requestAutomaticUpdate({
      release,
      runningVersion: "1.2.3",
      environment,
      worker: { entry: resolve(dataDir, "release", "bin", "automatic-update.js"), packageRoot: resolve(dataDir, "release") },
      spawnWorker,
      activeVersion: async () => active,
      sleep: async () => { active = release.version; },
    });

    expect(installed).toBe(release.version);
    expect(spawnWorker).toHaveBeenCalledTimes(1);
    expect(spawnWorker.mock.calls[0]?.[1]).toEqual([
      "--package-root", resolve(dataDir, "release"),
      "--channel", "stable",
      "--target-version", release.version,
      "--data-dir", dataDir,
    ]);
  });

  it("observes a live execution owner without starting a duplicate worker", async () => {
    const { dataDir, environment } = await harness();
    const packageRoot = resolve(dataDir, "release");
    const lease = await acquireUpdateExecutionLease({
      dataDir,
      packageRoot,
      channel: "stable",
      targetVersion: release.version,
      mode: "automatic",
    });
    expect(lease.status).toBe("acquired");
    if (lease.status !== "acquired") return;
    const controller = new AbortController();
    const spawnWorker = vi.fn(async (_entry: string, _arguments: readonly string[], _environment: NodeJS.ProcessEnv) => undefined);
    try {
      await expect(requestAutomaticUpdate({
        release,
        runningVersion: "1.2.3",
        environment,
        signal: controller.signal,
        worker: { entry: resolve(dataDir, "worker.js"), packageRoot },
        spawnWorker,
        activeVersion: async () => null,
        sleep: async () => { controller.abort(); },
      })).resolves.toBeNull();
      expect(spawnWorker).not.toHaveBeenCalled();
    } finally {
      await lease.release();
    }
  });

  it("observes an already active newer release without starting another worker", async () => {
    const { dataDir, environment } = await harness();
    const spawnWorker = vi.fn(async (_entry: string, _arguments: readonly string[], _environment: NodeJS.ProcessEnv) => undefined);
    await expect(requestAutomaticUpdate({
      release,
      runningVersion: "1.2.3",
      environment,
      worker: { entry: resolve(dataDir, "worker.js"), packageRoot: resolve(dataDir, "release") },
      spawnWorker,
      activeVersion: async () => release.version,
    })).resolves.toBe(release.version);
    expect(spawnWorker).not.toHaveBeenCalled();
  });

  it("does not claim a different channel's approved active cohort satisfies the target", async () => {
    const { dataDir, environment } = await harness();
    const id = `1.2.4-dev.2-${"a".repeat(20)}`;
    const cohort = new CohortStateStore(dataDir);
    await writeFile(cohort.path, JSON.stringify({ ...emptyState(), releases: { [id]: {
      releaseId: id, releaseRoot: resolve(dataDir, "releases", id), packageVersion: "1.2.4-dev.2",
      launchContract: "neutral-launch-v1", contentDigest: "a".repeat(64), approval: "approved",
      materializedAt: new Date(0).toISOString(), certifiedAt: new Date(0).toISOString(), diagnosticsPath: resolve(dataDir, "diagnostics.json"),
    } }, references: { active: id, pending: null, approved: id, rollback: null, retention: [] } }));
    const spawnWorker = vi.fn(async () => undefined);
    let clock = 10_000;
    expect(await requestAutomaticUpdate({ release, runningVersion: "1.2.3", environment, now: () => clock,
      worker: { entry: resolve(dataDir, "worker.js"), packageRoot: resolve(dataDir, "release") },
      spawnWorker, sleep: async () => { clock += 5_001; } })).toBeNull();
    expect(spawnWorker).toHaveBeenCalledTimes(1);
  });

  it("suppresses a failed target for the retry interval but permits a newer target and later retry", async () => {
    const { dataDir, environment } = await harness();
    const now = 10_000;
    const store = new AutomaticUpdateStateStore(dataDir);
    await store.write(failedState(now));
    const spawnWorker = vi.fn(async (_entry: string, _arguments: readonly string[], _environment: NodeJS.ProcessEnv) => undefined);
    const common = {
      release,
      runningVersion: "1.2.3",
      environment,
      worker: { entry: resolve(dataDir, "worker.js"), packageRoot: resolve(dataDir, "release") },
      spawnWorker,
      activeVersion: async () => null,
      sleep: async () => undefined,
    };

    await expect(requestAutomaticUpdate({ ...common, now: () => now + AUTOMATIC_UPDATE_RETRY_MS - 1 })).resolves.toBeNull();
    await expect(requestAutomaticUpdate({
      ...common,
      release: { ...release, version: "1.2.3" },
      now: () => now + 1,
    })).resolves.toBeNull();
    expect(spawnWorker).not.toHaveBeenCalled();

    let newerClock = now + 1;
    await expect(requestAutomaticUpdate({
      ...common,
      release: { ...release, version: "1.2.5" },
      now: () => newerClock,
      sleep: async () => { newerClock += 5_001; },
    })).resolves.toBeNull();
    expect(spawnWorker).toHaveBeenCalledTimes(1);

    let clock = now + AUTOMATIC_UPDATE_RETRY_MS;
    await expect(requestAutomaticUpdate({ ...common, now: () => clock, sleep: async () => { clock += 5_001; } })).resolves.toBeNull();
    expect(spawnWorker).toHaveBeenCalledTimes(2);
  });

  it("settles a dead running record before trying a newer stable or preview target", async () => {
    for (const channel of ["stable", "development"] as const) {
      const { dataDir, environment } = await harness();
      const store = new AutomaticUpdateStateStore(dataDir);
      await store.write({ ...failedState(1), channel, status: "running", targetVersion: "1.2.2", failure: null });
      const spawnWorker = vi.fn(async () => undefined);
      let clock = 10_000;
      await requestAutomaticUpdate({ release: { ...release, channel,
        version: channel === "stable" ? "1.2.4" : "1.2.4-dev.2" },
      runningVersion: channel === "stable" ? "1.2.3" : "1.2.4-dev.1", environment,
      now: () => clock, worker: { entry: resolve(dataDir, "worker.js"), packageRoot: resolve(dataDir, "release") },
      spawnWorker, activeVersion: async () => null, sleep: async () => { clock += 5_001; } });
      expect(spawnWorker).toHaveBeenCalledTimes(1);
      expect(await store.read()).toMatchObject({ status: "failed", failure: "worker-exited" });
    }
  });

  it("does not overwrite or spawn into a foreign unfinished transaction", async () => {
    const { dataDir, environment } = await harness();
    const store = new AutomaticUpdateStateStore(dataDir);
    const existing = { ...failedState(1), status: "running" as const, targetVersion: "1.2.2", failure: null };
    await store.write(existing);
    const transactionStore = new UpdateTransactionStore(dataDir);
    await transactionStore.begin({ channel: "stable", targetVersion: "1.2.7", packageRoot: resolve(dataDir, "release"), priorActiveReleaseId: null });
    const spawnWorker = vi.fn(async () => undefined);
    await expect(requestAutomaticUpdate({ release, runningVersion: "1.2.3", environment, now: () => 10_000,
      worker: { entry: resolve(dataDir, "worker.js"), packageRoot: resolve(dataDir, "release") },
      spawnWorker, activeVersion: async () => null })).resolves.toBeNull();
    expect(spawnWorker).not.toHaveBeenCalled();
    expect(await store.read()).toEqual(existing);
    expect(await transactionStore.read()).toMatchObject({ status: "active", targetVersion: "1.2.7" });
  });

  it("records worker startup failure instead of leaving a running attempt", async () => {
    const { dataDir, environment } = await harness();
    const store = new AutomaticUpdateStateStore(dataDir);
    await expect(requestAutomaticUpdate({ release, runningVersion: "1.2.3", environment,
      worker: { entry: resolve(dataDir, "worker.js"), packageRoot: resolve(dataDir, "release") },
      spawnWorker: async () => { throw new Error("could not spawn"); },
      activeVersion: async () => null })).resolves.toBeNull();
    expect(await store.read()).toMatchObject({ status: "failed", failure: "worker-start-failed", targetVersion: release.version });
  });

  it("records rejected worker provenance only when no foreign transaction owns the data root", async () => {
    const { dataDir, environment } = await harness();
    const arguments_ = ["--package-root", resolve(dataDir, "release"), "--channel", "stable",
      "--target-version", release.version, "--data-dir", dataDir];
    expect(await runAutomaticUpdateWorker(arguments_, environment)).toBe(1);
    const store = new AutomaticUpdateStateStore(dataDir);
    expect(await store.read()).toMatchObject({ status: "failed", failure: "worker-preflight-failed" });
    const transactionStore = new UpdateTransactionStore(dataDir);
    await transactionStore.begin({ channel: "stable", targetVersion: "1.2.7",
      packageRoot: resolve(dataDir, "release"), priorActiveReleaseId: null });
    expect(await runAutomaticUpdateWorker(arguments_, environment)).toBe(1);
    expect(await store.read()).toMatchObject({ status: "failed", failure: "worker-preflight-failed" });
  });

  it("fails closed on oversized or malformed persisted state", async () => {
    const { dataDir } = await harness();
    const store = new AutomaticUpdateStateStore(dataDir);
    await writeFile(store.path, "{".repeat(20_000));
    await expect(store.read()).rejects.toThrow(/oversized/);
    await writeFile(store.path, JSON.stringify({ ...failedState(1), targetVersion: "latest" }));
    await expect(store.read()).rejects.toThrow(/invalid automatic update state/);
  });
});
