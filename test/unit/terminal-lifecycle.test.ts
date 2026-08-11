import { describe, expect, it } from "vitest";
import { FULL_VIEWPORT_NATIVE_PROJECTION, type ShellTerminalProfile, type TerminalSurface } from "../../src/domain/index.js";
import { TerminalOwnershipTransaction, terminalExitDisposition } from "../../src/ui/terminal-lifecycle.js";

const shell: ShellTerminalProfile = {
  id: "shell-1",
  kind: "shell",
  executable: "/bin/sh",
  arguments: ["-i"],
  cwd: "/work",
  environment: {},
  terminalType: "xterm-256color",
  dimensions: { columns: 80, rows: 24 },
  projection: FULL_VIEWPORT_NATIVE_PROJECTION,
  resume: "none",
  shellIntegration: "none",
};

describe("terminal ownership transaction", () => {
  it("stops input, commits state, discards virtual modes, drains, and restores once", async () => {
    const order: string[] = [];
    const final = { revision: 7 } as TerminalSurface;
    const transaction = new TerminalOwnershipTransaction({
      stopInput: () => { order.push("stop-input"); },
      commitFinalSurface: () => { order.push("commit-final"); return final; },
      discardChildModes: surface => { order.push(`discard-${surface?.revision}`); },
      drainInput: () => { order.push("drain-input"); },
      restoreHost: () => { order.push("restore-host"); },
    });
    expect(await transaction.close()).toBe(final);
    expect(await transaction.close()).toBe(final);
    expect(order).toEqual(["stop-input", "commit-final", "discard-7", "drain-input", "restore-host"]);
  });

  it("retains a shell session when only its foreground command returns", () => {
    expect(terminalExitDisposition(shell, true)).toBe("retain-shell-session");
    expect(terminalExitDisposition(shell, false)).toBe("exit-foreground-ui");
    expect(terminalExitDisposition({ ...shell, kind: "command" }, true)).toBe("exit-foreground-ui");
  });
});
