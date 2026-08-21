import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import type { CommandResult, SupervisorCommand, TransparentTerminalLaunchProfile } from "../../../src/foundation/lifecycle/index.js";
import { runForegroundBroker, type ForegroundBrokerRequest, type ForegroundLeaseControl, type TransparentNativeLauncher } from "../../../src/foundation/transparent-terminal/foreground-broker.js";

const profile: TransparentTerminalLaunchProfile = {
  id: "profile", terminalCapability: "transparent", executable: "pi", arguments: ["--offline"], cwd: ".", environment: {},
  terminalType: "xterm-256color", dimensions: { columns: 100, rows: 30 }, ownerDisconnect: "stop", recovery: "none",
  surface: "none", visualReconnection: "none",
};

const request: ForegroundBrokerRequest = {
  instanceId: "instance",
  profileId: "sandbox",
  guardianIdentity: { pid: 9000, startIdentity: "9000:guardian" },
  profile,
};

describe("transparent foreground broker", () => {
  it("coordinates exact launch identity and outcome without terminal data", async () => {
    const commands: SupervisorCommand[] = [];
    const control = acceptingControl(commands);
    const launcher: TransparentNativeLauncher = {
      launch: vi.fn(async received => ({
        processIdentity: { pid: 9001, startIdentity: "9001:start" },
        outcome: Promise.resolve({ kind: "exited" as const, exitCode: 0 }),
        stop: vi.fn(async reason => ({ kind: "stopped" as const, reason })),
        received,
      })),
    };
    let sequence = 0;
    const result = await runForegroundBroker(request, control, launcher, () => `request-${++sequence}`);

    expect(launcher.launch).toHaveBeenCalledWith(profile);
    expect(commands.map(command => command.type)).toEqual([
      "create-launch-instance", "activate-launch-instance", "complete-launch-instance",
    ]);
    expect(commands[0]).toMatchObject({ instanceId: "instance", profileId: "sandbox", guardianIdentity: { pid: 9000 } });
    expect(commands[1]).toMatchObject({ rootIdentity: { pid: 9001 }, containmentIdentity: { provider: "direct-child-transition" } });
    expect(result).toMatchObject({ instanceId: "instance", processIdentity: { pid: 9001 }, outcome: { kind: "exited", exitCode: 0 } });
    expect(JSON.stringify(commands)).not.toMatch(/terminal-input|terminal-output|dataBase64|framebuffer|surface_json/);
  });

  it("requests bounded child stop only when an explicit lifecycle signal arrives", async () => {
    const commands: SupervisorCommand[] = [];
    let requestStop!: (reason: "update") => void;
    const stopRequested = new Promise<"update">(resolve => { requestStop = resolve; });
    const stop = vi.fn(async (reason: "owner-disconnect" | "user-request" | "update") => ({ kind: "stopped" as const, reason }));
    const run = runForegroundBroker(
      { ...request, stopRequested },
      acceptingControl(commands),
      { launch: async () => ({ processIdentity: { pid: 44, startIdentity: "44:start" }, outcome: new Promise(() => undefined), stop }) },
      () => `request-${commands.length + 1}`,
    );
    await vi.waitFor(() => expect(commands.map(command => command.type)).toContain("activate-launch-instance"));
    expect(stop).not.toHaveBeenCalled();
    requestStop("update");
    await expect(run).resolves.toMatchObject({ outcome: { kind: "stopped", reason: "update" } });
    expect(stop).toHaveBeenCalledWith("update");
    expect(commands.map(command => command.type)).toEqual([
      "create-launch-instance", "activate-launch-instance", "begin-launch-instance-stop", "complete-launch-instance",
    ]);
  });

  it("completes an unactivated instance after a spawn error", async () => {
    const commands: SupervisorCommand[] = [];
    const error = Object.assign(new Error("missing executable"), { code: "ENOENT" });
    const result = await runForegroundBroker(
      request,
      acceptingControl(commands),
      { launch: async () => { throw error; } },
      () => `request-${commands.length + 1}`,
    );
    expect(commands.map(command => command.type)).toEqual(["create-launch-instance", "complete-launch-instance"]);
    expect(commands[1]).toMatchObject({ terminalState: "completed", outcome: { kind: "spawn-error", code: "ENOENT" } });
    expect(result).toMatchObject({ processIdentity: null, outcome: { kind: "spawn-error", code: "ENOENT" } });
  });

  it("contains no ordinary input/output read, relay, parser, or timer mechanism", async () => {
    const source = await readFile("src/foundation/transparent-terminal/foreground-broker.ts", "utf8");
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
