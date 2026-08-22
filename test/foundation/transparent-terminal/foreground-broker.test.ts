import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import type { TransparentTerminalLaunchProfile } from "../../../src/foundation/lifecycle/index.js";
import { runForegroundBroker, type TransparentNativeLauncher } from "../../../src/foundation/transparent-terminal/foreground-broker.js";

const profile: TransparentTerminalLaunchProfile = {
  id: "profile", terminalCapability: "transparent", executable: "pi", arguments: ["--offline"], cwd: ".", environment: {},
  terminalType: "xterm-256color", dimensions: { columns: 100, rows: 30 }, ownerDisconnect: "stop", recovery: "none",
  surface: "none", visualReconnection: "none",
};

describe("transparent foreground broker", () => {
  it("waits for exact child identity and outcome without owning supervisor lifecycle", async () => {
    const launcher: TransparentNativeLauncher = {
      launch: vi.fn(async received => ({
        processIdentity: { pid: 9001, startIdentity: "9001:start" },
        outcome: Promise.resolve({ kind: "exited" as const, exitCode: 0 }),
        stop: vi.fn(async reason => ({ kind: "stopped" as const, reason })),
        received,
      })),
    };
    const result = await runForegroundBroker({ profile }, launcher);

    expect(launcher.launch).toHaveBeenCalledWith(profile);
    expect(result).toMatchObject({ processIdentity: { pid: 9001 }, outcome: { kind: "exited", exitCode: 0 } });
  });

  it("requests bounded child stop only when an explicit lifecycle signal arrives", async () => {
    let requestStop!: (reason: "update") => void;
    const stopRequested = new Promise<"update">(resolve => { requestStop = resolve; });
    const stop = vi.fn(async (reason: "owner-disconnect" | "user-request" | "update") => ({ kind: "stopped" as const, reason }));
    const run = runForegroundBroker(
      { profile, stopRequested },
      { launch: async () => ({ processIdentity: { pid: 44, startIdentity: "44:start" }, outcome: new Promise(() => undefined), stop }) },
    );
    await vi.waitFor(() => expect(stop).not.toHaveBeenCalled());
    requestStop("update");
    await expect(run).resolves.toMatchObject({ outcome: { kind: "stopped", reason: "update" } });
    expect(stop).toHaveBeenCalledWith("update");
  });

  it("returns a spawn error without creating partial inner ownership", async () => {
    const error = Object.assign(new Error("missing executable"), { code: "ENOENT" });
    const result = await runForegroundBroker(
      { profile },
      { launch: async () => { throw error; } },
    );
    expect(result).toMatchObject({ processIdentity: null, outcome: { kind: "spawn-error", code: "ENOENT" } });
  });

  it("contains no control protocol, ordinary I/O, relay, parser, or timer mechanism", async () => {
    const source = await readFile("src/foundation/transparent-terminal/foreground-broker.ts", "utf8");
    expect(source).not.toMatch(/SupervisorClient|SupervisorCommand|create-launch-instance|complete-launch-instance/);
    expect(source).not.toMatch(/process\.(?:stdin|stdout|stderr)|\.on\(["']data|\.pipe\(|setTimeout|setInterval|Buffer|TextDecoder|parse|encode|relay|render/i);
    expect(source).not.toMatch(/node:child_process|node-pty|conpty|@xterm/);
  });
});
