import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  LaunchInstance,
  NativeProcessIdentity,
  SupervisorCommand,
  TransparentTerminalLaunchProfile,
} from "../../../src/foundation/lifecycle/index.js";
import { encodeFrame, LineFrameDecoder, localControlHello } from "../../../src/foundation/protocol/index.js";

const profile: TransparentTerminalLaunchProfile = {
  id: "profile-transparent",
  terminalCapability: "transparent",
  executable: "pi",
  arguments: ["--offline"],
  cwd: "D:/workspace",
  environment: { TERM: "xterm-256color" },
  terminalType: "xterm-256color",
  dimensions: { columns: 120, rows: 32 },
  ownerDisconnect: "stop",
  recovery: "none",
  surface: "none",
  visualReconnection: "none",
};

const guardianIdentity: NativeProcessIdentity = { pid: 1233, startIdentity: "1233:guardian-start" };
const rootIdentity: NativeProcessIdentity = { pid: 1234, startIdentity: "1234:process-start" };

const instance: LaunchInstance = {
  id: "instance-1",
  ownerClientId: "client-1",
  profileId: "sandbox",
  state: "active",
  shutdownPolicy: "terminate-tree-on-close",
  guardianIdentity,
  rootIdentity,
  containmentIdentity: { provider: "test", token: "scope-1" },
  createdAt: "2026-01-01T00:00:00.000Z",
  activatedAt: "2026-01-01T00:00:01.000Z",
  stoppingAt: null,
  completedAt: null,
  outcome: null,
};

describe("transparent terminal contracts", () => {
  it("declares exact launch identity and explicit absence of surface/reconnection", () => {
    expect(profile).toMatchObject({
      terminalCapability: "transparent",
      executable: "pi",
      arguments: ["--offline"],
      surface: "none",
      visualReconnection: "none",
      recovery: "none",
    });
    expect(Object.keys(profile)).not.toContain("applicationKind");
    expect(Object.keys(profile)).not.toContain("contentMatcher");
  });

  it("models independent instance ownership and no terminal surface", () => {
    expect(instance).toMatchObject({
      id: "instance-1",
      profileId: "sandbox",
      shutdownPolicy: "terminate-tree-on-close",
      rootIdentity,
    });
    expectTypeOf(profile.surface).toEqualTypeOf<"none">();
    expectTypeOf(profile.visualReconnection).toEqualTypeOf<"none">();
  });

  it("round-trips instance lifecycle commands without terminal bytes or surfaces", () => {
    const commands: SupervisorCommand[] = [
      { type: "create-launch-instance", requestId: "request-1", instanceId: instance.id, profileId: "sandbox", shutdownPolicy: "terminate-tree-on-close", guardianIdentity },
      { type: "activate-launch-instance", requestId: "request-2", instanceId: instance.id, rootIdentity, containmentIdentity: { provider: "test", token: "scope-1" } },
      { type: "begin-launch-instance-stop", requestId: "request-3", instanceId: instance.id, reason: "user-request" },
      { type: "complete-launch-instance", requestId: "request-4", instanceId: instance.id, terminalState: "completed", outcome: { kind: "stopped", reason: "user-request" } },
      { type: "reconcile-launch-instance", requestId: "request-5", instanceId: instance.id },
    ];
    const decoder = new LineFrameDecoder();
    const decoded = decoder.push(commands.map(command => encodeFrame({ type: "command", command })).join(""));
    expect(decoded).toHaveLength(5);
    expect(decoded).toEqual(commands.map(command => ({ type: "command", command })));
    expect(JSON.stringify(decoded)).not.toMatch(/dataBase64|terminal-input|terminal-output|render-transaction|framebuffer|surface_json/);
  });

  it("negotiates launch-instance lifecycle independently of composed surfaces", () => {
    const hello = localControlHello();
    expect(hello.requiredFeatures).toContain("launch.instance-lifecycle.v1");
    expect(hello.requiredFeatures).not.toContain("terminal.foreground-lease.v1");
    expect(hello.requiredFeatures.join(" ")).not.toMatch(/composed|surface|framebuffer|render/);
  });
});
