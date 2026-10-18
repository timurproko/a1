import { describe, expect, it, vi } from "vitest";
import { exitWatcherArguments, runExitWatcher } from "../../../src/foundation/launch-guardian/exit-watcher.js";
import type { ProcessGuardianAddon } from "../../../src/foundation/process-containment/index.js";

const base = {
  guardianPid: 10,
  noticePath: "D:/runtime/notice",
  encodedModes: "1:2",
  addonPath: "D:/release/process-guardian.node",
  runtimePid: 11,
  processGroup: 12,
  foregroundGroup: 13,
};

describe("launch exit watcher", () => {
  it("waits for the Windows guardian and runtime before delivering the notice", async () => {
    const events: string[] = [];
    const addon = fakeAddon({
      ignoreConsoleControl: () => { events.push("ignore"); },
      waitForProcessExit: async pid => { events.push(`wait:${pid}`); },
      deliverExitNotice: () => { events.push("deliver"); },
    });

    await expect(runExitWatcher(exitWatcherArguments(base), "win32", () => addon)).resolves.toBe(0);
    expect(events).toEqual(["ignore", "wait:10", "wait:11", "deliver"]);
  });

  it("performs bounded Unix group cleanup and foreground restoration before delivery", async () => {
    const events: string[] = [];
    const addon = fakeAddon({
      waitForProcessExit: async pid => { events.push(`wait:${pid}`); },
      stopProcessGroup: group => { events.push(`stop:${group}`); },
      restoreForegroundGroup: group => { events.push(`foreground:${group}`); },
      deliverExitNotice: () => { events.push("deliver"); },
    });

    await expect(runExitWatcher(exitWatcherArguments(base), "linux", () => addon)).resolves.toBe(0);
    expect(events).toEqual(["wait:10", "stop:12", "foreground:13", "deliver"]);
  });

  it("rejects malformed and unknown arguments", async () => {
    await expect(runExitWatcher(["--guardian-pid", "0"], "win32", () => fakeAddon())).rejects.toThrow(/positive safe integer/u);
    await expect(runExitWatcher([...exitWatcherArguments(base), "--other", "x"], "win32", () => fakeAddon())).rejects.toThrow(/unknown argument/u);
  });
});

function fakeAddon(overrides: Partial<ProcessGuardianAddon> = {}): ProcessGuardianAddon {
  return {
    version: () => ({ crateVersion: "0.1.0-dev", protocolVersion: 2, target: "windows" }),
    inspectProcessStart: () => "windows-filetime:1",
    captureTerminalModes: () => "modes",
    restoreTerminalModes() {},
    deliverExitNotice: vi.fn(),
    spawnContained: () => { throw new Error("unused"); },
    spawnWatcher: () => 1,
    waitForProcessExit: async () => undefined,
    stopProcessGroup() {},
    restoreForegroundGroup() {},
    ignoreConsoleControl() {},
    ...overrides,
  };
}
