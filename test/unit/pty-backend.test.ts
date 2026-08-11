import { describe, expect, it } from "vitest";
import { FULL_VIEWPORT_NATIVE_PROJECTION, type CommandTerminalProfile, type TerminalDimensions } from "../../src/domain/index.js";
import { defaultShellProfile, resolveTerminalLaunch } from "../../src/drivers/terminal/pty-backend.js";

const dimensions: TerminalDimensions = { columns: 80, rows: 24 };

describe("cross-platform terminal process backend", () => {
  it("preserves an exact direct executable and argument vector", () => {
    const profile: CommandTerminalProfile = {
      id: "command-1",
      kind: "command",
      executable: process.execPath,
      arguments: ["--version"],
      cwd: process.cwd(),
      environment: {},
      terminalType: "xterm-256color",
      dimensions,
      projection: FULL_VIEWPORT_NATIVE_PROJECTION,
      conptyMouseFallback: "none",
      resume: "none",
    };
    expect(resolveTerminalLaunch(profile, process.env as Record<string, string>, process.platform)).toEqual({ executable: process.execPath, arguments: ["--version"] });
  });

  it("creates one persistent platform shell profile for successive commands", () => {
    const windows = defaultShellProfile("shell-win", "C:/work", dimensions, { ComSpec: "C:/Windows/System32/cmd.exe" }, "win32");
    expect(windows).toMatchObject({ kind: "shell", executable: "C:/Windows/System32/cmd.exe", arguments: ["/d"], shellIntegration: "none" });
    const unix = defaultShellProfile("shell-unix", "/work", dimensions, { SHELL: "/bin/bash" }, "linux");
    expect(unix).toMatchObject({ kind: "shell", executable: "/bin/bash", arguments: ["-i"], shellIntegration: "none" });
    expect(unix).not.toHaveProperty("commandPty");
  });
});
