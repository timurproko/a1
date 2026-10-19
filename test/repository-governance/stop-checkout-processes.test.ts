import { describe, expect, it } from "vitest";
import { selectCheckoutProcesses, stopCheckoutProcesses } from "../../scripts/development/stop-checkout-processes.mjs";

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

  it("never selects the current process", () => {
    const own = { pid: 42, commandLine: `node ${join(root, "dist", "x.js")}` };
    expect(selectCheckoutProcesses([own], root, 42)).toEqual([]);
  });

  it("does nothing in CI", () => {
    expect(stopCheckoutProcesses({ root, environment: { CI: "true" } })).toEqual([]);
  });
});
