import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  ForegroundTerminalLease,
  NativeProcessIdentity,
  SupervisorCommand,
  TransparentTerminalLaunchProfile,
  TransparentTerminalLifecycleOutcome,
} from "../../src/foundation/lifecycle/index.js";
import { encodeFrame, LineFrameDecoder, localControlHello } from "../../src/foundation/protocol/index.js";

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

const identity: NativeProcessIdentity = { pid: 1234, startIdentity: "boot-observed-start-identity" };

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

  it("models one foreground lease with boot-observed process identity and outcome", () => {
    const outcome: TransparentTerminalLifecycleOutcome = { kind: "exited", exitCode: 0 };
    const lease: ForegroundTerminalLease = {
      id: "lease-1",
      ownerId: "broker-1",
      profile,
      state: "released",
      generationId: "generation-1",
      processIdentity: identity,
      acquiredAt: "2026-01-01T00:00:00.000Z",
      heartbeatAt: "2026-01-01T00:00:01.000Z",
      releasedAt: "2026-01-01T00:00:02.000Z",
      outcome,
    };
    expect(lease).toMatchObject({ state: "released", processIdentity: identity, outcome });
    expectTypeOf(lease.profile.surface).toEqualTypeOf<"none">();
    expectTypeOf(lease.profile.visualReconnection).toEqualTypeOf<"none">();
  });

  it("round-trips lease lifecycle commands without terminal bytes or surfaces", () => {
    const commands: SupervisorCommand[] = [
      { type: "acquire-foreground-terminal-lease", requestId: "request-1", leaseId: "lease-1", ownerId: "broker-1", profile },
      { type: "activate-foreground-terminal-lease", requestId: "request-2", leaseId: "lease-1", generationId: "generation-1", processIdentity: identity },
      { type: "heartbeat-foreground-terminal-lease", requestId: "request-3", leaseId: "lease-1", processIdentity: identity },
      { type: "release-foreground-terminal-lease", requestId: "request-4", leaseId: "lease-1", processIdentity: identity, outcome: { kind: "exited", exitCode: 0 } },
    ];
    const decoder = new LineFrameDecoder();
    const decoded = decoder.push(commands.map(command => encodeFrame({ type: "command", command })).join(""));
    expect(decoded).toHaveLength(4);
    expect(decoded).toEqual(commands.map(command => ({ type: "command", command })));
    expect(JSON.stringify(decoded)).not.toMatch(/dataBase64|terminal-input|terminal-output|render-transaction|framebuffer|surface_json/);
  });

  it("requires foreground lease negotiation independently of composed surfaces", () => {
    const hello = localControlHello();
    expect(hello.requiredFeatures).toContain("terminal.foreground-lease.v1");
    expect(hello.requiredFeatures.join(" ")).not.toMatch(/composed|surface|framebuffer|render/);
  });
});
