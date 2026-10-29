import { EventEmitter } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const observed = vi.hoisted(() => ({ spawns: [] as unknown[][] }));
vi.mock("node:child_process", async importOriginal => ({
  ...await importOriginal<typeof import("node:child_process")>(),
  spawn: vi.fn((...args: unknown[]) => {
    observed.spawns.push(args);
    const child = Object.assign(new EventEmitter(), { unref: vi.fn() });
    queueMicrotask(() => child.emit("spawn"));
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
});
