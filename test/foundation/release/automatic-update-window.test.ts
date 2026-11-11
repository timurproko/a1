import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const observed = vi.hoisted(() => ({ spawns: [] as unknown[][] }));
vi.mock("node:child_process", async importOriginal => ({
  ...await importOriginal<typeof import("node:child_process")>(),
  spawn: vi.fn((...args: unknown[]) => {
    observed.spawns.push(args);
    const child = Object.assign(new EventEmitter(), { unref: vi.fn() });
    // Concurrency: real child spawn events run on the next tick, after the async launcher returns.
    process.nextTick(() => child.emit("spawn"));
    return child;
  }),
}));

const { requestAutomaticUpdate } = await import("../../../src/foundation/release/automatic-update.js");
const roots: string[] = [];
afterEach(async () => {
  observed.spawns.length = 0;
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe("automatic update worker launch", () => {
  it("detaches the certified release worker with no console or inherited terminal", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "a1-automatic-window-"));
    roots.push(dataDir);
    const worker = { entry: resolve(dataDir, "release", "bin", "automatic-update.js"), packageRoot: resolve(dataDir, "release") };
    await mkdir(worker.packageRoot);
    const environment = { A1_DATA_DIR: dataDir };
    let active: string | null = null;
    expect(await requestAutomaticUpdate({
      release: { channel: "stable", version: "1.2.4", command: "a1 update", changelogUrl: null },
      runningVersion: "1.2.3",
      environment,
      worker,
      activeVersion: async () => active,
      sleep: async () => { active = "1.2.4"; },
    })).toBe("1.2.4");
    expect(observed.spawns).toHaveLength(1);
    expect(observed.spawns[0]).toEqual([
      process.execPath,
      [worker.entry, "--package-root", worker.packageRoot, "--channel", "stable", "--target-version", "1.2.4", "--data-dir", dataDir],
      { detached: true, env: environment, stdio: "ignore", windowsHide: true },
    ]);
  });

  it("rejects a missing release root before spawning the worker", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "a1-automatic-window-missing-"));
    roots.push(dataDir);
    const sleep = vi.fn(async () => undefined);
    expect(await requestAutomaticUpdate({
      release: { channel: "stable", version: "1.2.4", command: "a1 update", changelogUrl: null },
      runningVersion: "1.2.3",
      environment: { A1_DATA_DIR: dataDir },
      worker: { entry: resolve(dataDir, "missing", "bin", "automatic-update.js"), packageRoot: resolve(dataDir, "missing") },
      activeVersion: async () => null,
      sleep,
    })).toBeNull();
    expect(observed.spawns).toHaveLength(0);
    expect(sleep).not.toHaveBeenCalled();
    expect(JSON.parse(await readFile(join(dataDir, "automatic-update.json"), "utf8"))).toMatchObject({
      targetVersion: "1.2.4", status: "failed", installedVersion: null, failure: "worker-start-failed",
    });
  });
});
