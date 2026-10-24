import { describe, expect, it, vi } from "vitest";
import {
  describeSurvivors,
  developmentCheckoutId,
  selectCheckoutProcesses,
  STOP_PASS_DELAY_MS,
  STOP_PASS_LIMIT,
  stopCheckoutProcesses,
} from "../../scripts/development/stop-checkout-processes.mjs";
import { resolveDevelopmentLaunchEnvironment } from "../../src/features/launch/development-launch.js";

describe("stopping a checkout's running A1", () => {
  const root = process.platform === "win32" ? "E:\\Git\\a1\\.worktrees\\polish" : "/work/a1/.worktrees/polish";
  const join = (...parts: string[]) => parts.join(process.platform === "win32" ? "\\" : "/");
  const ownProcess = (pid: number) => ({ pid, commandLine: `node ${join(root, "dist", "foundation", "resident-tabs", "host-entry.js")} --resident-role-child holder` });
  const foreignProcess = (pid: number) => ({ pid, commandLine: `node ${join(root + "-other", "dist", "foundation", "host-entry.js")}` });
  const sleep = vi.fn(async () => undefined);

  it("selects only processes running this checkout's dist or bin code", () => {
    const processes = [
      { pid: 1, commandLine: `node ${join(root, "dist", "foundation", "resident-tabs", "host-entry.js")} --resident-role server` },
      { pid: 2, commandLine: `"\\\\?\\C:\\node.exe" "\\\\?\\${join(root, "bin", "ui.js")}" --tab` },
      { pid: 3, commandLine: `node ${join(root + "-other", "dist", "foundation", "host-entry.js")}` },
      { pid: 4, commandLine: `node ${join(root, "scripts", "clean.mjs")}` },
      { pid: 5, commandLine: `node ${join(root, "node_modules", "vitest", "vitest.mjs")}` },
      { pid: 6, commandLine: null },
      { pid: 7, commandLine: `node ${join(root.toUpperCase(), "DIST", "app", "paste-helper.js")}` },
    ];
    expect(selectCheckoutProcesses(processes, root, 99).map(({ pid }) => pid)).toEqual([1, 2, 7]);
  });

  it("selects the development copies ./scripts/dev launched for this checkout only", () => {
    const id = developmentCheckoutId(root);
    expect(id).toBe(resolveDevelopmentLaunchEnvironment(root, "0.0.0-dev", {}).checkoutId);
    const temp = process.platform === "win32" ? "C:\\Users\\me\\AppData\\Local\\Temp" : "/tmp";
    const processes = [
      { pid: 1, commandLine: `node ${join(temp, "a1-development", id, "0.2.7-dev-x", "instances", "i", "data", "releases", "r", "bin", "supervisor.js")}` },
      { pid: 2, commandLine: `node ${join(temp, "a1-development", "ffffffffffffffff", "r", "bin", "supervisor.js")}` },
    ];
    expect(selectCheckoutProcesses(processes, root, 99).map(({ pid }) => pid)).toEqual([1]);
  });

  it("never selects the current process", () => {
    const own = { pid: 42, commandLine: `node ${join(root, "dist", "x.js")}` };
    expect(selectCheckoutProcesses([own], root, 42)).toEqual([]);
  });

  it("repeats passes until a pass finds nothing, so roles that restart each other still end", async () => {
    const listings = [[ownProcess(1), ownProcess(2), foreignProcess(9)], [ownProcess(3)], []];
    const list = vi.fn(() => listings.shift() ?? []);
    const terminate = vi.fn();

    const result = await stopCheckoutProcesses({ root, environment: {}, list, terminate, sleep });

    expect(result).toEqual({ stopped: [1, 2, 3], survivors: [] });
    expect(terminate.mock.calls.map(([pid]) => pid)).toEqual([1, 2, 3]);
    expect(list).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledWith(STOP_PASS_DELAY_MS);
    expect(describeSurvivors(result.survivors)).toBe("");
  });

  it("gives up after the pass limit and names what survived", async () => {
    const list = vi.fn(() => [ownProcess(7)]);
    const terminate = vi.fn(() => { throw new Error("access denied"); });

    const result = await stopCheckoutProcesses({ root, environment: {}, list, terminate, sleep, passLimit: 3 });

    expect(result).toEqual({ stopped: [], survivors: [7] });
    expect(terminate).toHaveBeenCalledTimes(3);
    expect(list).toHaveBeenCalledTimes(4);
    expect(describeSurvivors(result.survivors)).toBe("A1 process(es) from this checkout are still running after the stop: 7.\n");
    expect(STOP_PASS_LIMIT).toBeGreaterThanOrEqual(3);
  });

  it("does nothing in CI", async () => {
    const list = vi.fn();
    const terminate = vi.fn();

    expect(await stopCheckoutProcesses({ root, environment: { CI: "true" }, list, terminate, sleep })).toEqual({ stopped: [], survivors: [] });
    expect(list).not.toHaveBeenCalled();
    expect(terminate).not.toHaveBeenCalled();
  });

  it("treats an unreadable process list as nothing to stop", async () => {
    const list = vi.fn(() => { throw new Error("powershell unavailable"); });
    const terminate = vi.fn();

    expect(await stopCheckoutProcesses({ root, environment: {}, list, terminate, sleep })).toEqual({ stopped: [], survivors: [] });
    expect(terminate).not.toHaveBeenCalled();
  });
});
