import { describe, expect, it } from "vitest";
import { developmentCheckoutId, selectCheckoutProcesses, stopCheckoutProcesses } from "../../scripts/development/stop-checkout-processes.mjs";
import { resolveDevelopmentLaunchEnvironment } from "../../src/features/launch/development-launch.js";

describe("stopping a checkout's running A1 before a rebuild", () => {
  const root = process.platform === "win32" ? "E:\\Git\\a1\\.worktrees\\polish" : "/work/a1/.worktrees/polish";
  const join = (...parts: string[]) => parts.join(process.platform === "win32" ? "\\" : "/");

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

  it("does nothing in CI", () => {
    expect(stopCheckoutProcesses({ root, environment: { CI: "true" } })).toEqual([]);
  });
});
