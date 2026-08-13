import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import type { CommandResult, SupervisorCommand, TransparentTerminalLaunchProfile } from "../../src/domain/model.js";
import { runForegroundBroker, type ForegroundLeaseControl, type TransparentNativeLauncher } from "../../src/transparent/foreground-broker.js";

const profile: TransparentTerminalLaunchProfile = {
  id: "profile", terminalCapability: "transparent", executable: "pi", arguments: ["--offline"], cwd: ".", environment: {},
  terminalType: "xterm-256color", dimensions: { columns: 100, rows: 30 }, ownerDisconnect: "stop", recovery: "none",
  surface: "none", visualReconnection: "none",
};

describe("transparent foreground broker", () => {
  it("coordinates exact launch identity and outcome without terminal data", async () => {
    const commands: SupervisorCommand[] = [];
    const control = acceptingControl(commands);
    const launcher: TransparentNativeLauncher = {
      launch: vi.fn(async received => ({
        processIdentity: { pid: 9001, startIdentity: "9001:start" },
        outcome: Promise.resolve({ kind: "exited" as const, exitCode: 0 }),
        received,
      })),
    };
    let request = 0;
    const result = await runForegroundBroker(
      { leaseId: "lease", generationId: "generation", ownerId: "broker", profile },
      control,
      launcher,
      () => `request-${++request}`,
    );

    expect(launcher.launch).toHaveBeenCalledWith(profile);
    expect(commands.map(command => command.type)).toEqual([
      "acquire-foreground-terminal-lease", "activate-foreground-terminal-lease", "release-foreground-terminal-lease",
    ]);
    expect(commands[1]).toMatchObject({ processIdentity: { pid: 9001, startIdentity: "9001:start" } });
    expect(result).toMatchObject({ processIdentity: { pid: 9001 }, outcome: { kind: "exited", exitCode: 0 } });
    expect(JSON.stringify(commands)).not.toMatch(/terminal-input|terminal-output|dataBase64|framebuffer|surface_json/);
  });

  it("releases an unactivated lease after a spawn error", async () => {
    const commands: SupervisorCommand[] = [];
    const error = Object.assign(new Error("missing executable"), { code: "ENOENT" });
    const result = await runForegroundBroker(
      { leaseId: "lease", generationId: "generation", ownerId: "broker", profile },
      acceptingControl(commands),
      { launch: async () => { throw error; } },
      () => `request-${commands.length + 1}`,
    );
    expect(commands.map(command => command.type)).toEqual(["acquire-foreground-terminal-lease", "release-foreground-terminal-lease"]);
    expect(commands[1]).toMatchObject({ processIdentity: null, outcome: { kind: "spawn-error", code: "ENOENT" } });
    expect(result).toMatchObject({ processIdentity: null, outcome: { kind: "spawn-error", code: "ENOENT" } });
  });

  it("contains no ordinary input/output read, relay, parser, or timer mechanism", async () => {
    const source = await readFile("src/transparent/foreground-broker.ts", "utf8");
    expect(source).not.toMatch(/process\.(?:stdin|stdout|stderr)|\.on\(["']data|\.pipe\(|setTimeout|setInterval|Buffer|TextDecoder|parse|encode|relay|render/i);
    expect(source).not.toMatch(/node:child_process|node-pty|conpty|@xterm/);
  });
});

function acceptingControl(commands: SupervisorCommand[]): ForegroundLeaseControl {
  return {
    async command(command): Promise<CommandResult> {
      commands.push(command);
      return { requestId: command.requestId, ok: true, revision: commands.length };
    },
  };
}
