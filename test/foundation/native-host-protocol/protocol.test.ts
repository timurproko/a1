import { describe, expect, it } from "vitest";
import {
  MAX_NATIVE_HOST_MESSAGE_BYTES,
  NativeHostFrameCodec,
  NativeHostProtocolError,
  NATIVE_HOST_PROTOCOL_NAME,
  createFixedTwoByTwoCommand,
  nativeHostCommandResult,
  nativeHostFailure,
  nativeHostTimedOut,
  negotiateNativeHostHello,
  type NativeHostProofMessage,
} from "../../../src/foundation/native-host-protocol/index.js";
import { NATIVE_HOST_PROTOCOL_VERSION, type NativeHostHello, type TerminalSessionLaunch } from "../../../src/foundation/workspace-contracts/index.js";

function hello(overrides: Partial<NativeHostHello> = {}): NativeHostHello {
  return {
    protocolVersion: NATIVE_HOST_PROTOCOL_VERSION,
    hostInstanceId: "host-1",
    buildId: "proof-build-1",
    platform: "windows",
    capabilities: ["exact-command", "revisioned-topology", "native-input", "native-rendering", "retained-terminal-state"],
    ...overrides,
  };
}

function session(id: string): TerminalSessionLaunch {
  return {
    id,
    executable: "C:\\Windows\\System32\\cmd.exe",
    arguments: ["/d", "/q"],
    cwd: "C:\\work",
    environment: { A1_TERMINAL_SESSION_ID: id },
    dimensions: { columns: 80, rows: 24, widthPixels: 640, heightPixels: 480 },
    inactivity: "live-unpainted",
  };
}

function fixedCommand() {
  return createFixedTwoByTwoCommand({
    correlationId: "create-grid-1",
    hostInstanceId: "host-1",
    windowId: "window-1",
    tabId: "tab-1",
    expectedRevision: 0,
    panes: [
      { paneId: "pane-1", session: session("session-1") },
      { paneId: "pane-2", session: session("session-2") },
      { paneId: "pane-3", session: session("session-3") },
      { paneId: "pane-4", session: session("session-4") },
    ],
  });
}

describe("native-host proof protocol messages", () => {
  it("uses the A1 native-host schema name", () => {
    expect(NATIVE_HOST_PROTOCOL_NAME).toBe("a1-native-host-v1");
  });
  it("negotiates build identity, platform, and required capabilities", () => {
    expect(negotiateNativeHostHello(hello())).toEqual({
      accepted: true,
      negotiatedCapabilities: ["exact-command", "native-input", "native-rendering", "retained-terminal-state", "revisioned-topology"],
      diagnostic: "native host handshake accepted",
    });
    expect(negotiateNativeHostHello(hello({ protocolVersion: 2 as 1 }))).toMatchObject({ accepted: false, diagnostic: expect.stringContaining("unsupported native-host protocol") });
    expect(negotiateNativeHostHello(hello({ platform: "freebsd" as "windows" }))).toMatchObject({ accepted: false });
    expect(negotiateNativeHostHello(hello({ capabilities: ["exact-command"] }))).toMatchObject({ accepted: false, diagnostic: expect.stringContaining("lacks required capabilities") });
  });

  it("creates a revisioned fixed 2x2 topology with four exact independent sessions", () => {
    const command = fixedCommand();
    expect(command).toMatchObject({ type: "apply-topology", correlationId: "create-grid-1", expectedRevision: 0 });
    if (command.type !== "apply-topology") throw new Error("fixture mismatch");
    expect(command.topology.revision).toBe(0);
    expect(command.topology.windows[0]?.tabs[0]?.panes).toHaveLength(4);
    expect(new Set(command.topology.sessions.map(value => value.id))).toEqual(new Set(["session-1", "session-2", "session-3", "session-4"]));
    expect(command.topology.sessions[0]).toMatchObject({ executable: "C:\\Windows\\System32\\cmd.exe", arguments: ["/d", "/q"], cwd: "C:\\work" });
  });

  it("rejects duplicate pane identities and invalid exact launch definitions", () => {
    const invalidSessions: [TerminalSessionLaunch, TerminalSessionLaunch, TerminalSessionLaunch, TerminalSessionLaunch] = [session("s1"), session("s2"), session("s3"), session("s4")];
    expect(() => createFixedTwoByTwoCommand({
      correlationId: "bad-grid",
      hostInstanceId: "host-1",
      windowId: "window-1",
      tabId: "tab-1",
      expectedRevision: 0,
      panes: [
        { paneId: "pane-1", session: invalidSessions[0] },
        { paneId: "pane-1", session: invalidSessions[1] },
        { paneId: "pane-3", session: invalidSessions[2] },
        { paneId: "pane-4", session: invalidSessions[3] },
      ],
    })).toThrow(/duplicate proof pane/);
    invalidSessions[0] = { ...invalidSessions[0], environment: { ...invalidSessions[0].environment, "BAD=NAME": "value" } };
    expect(() => createFixedTwoByTwoCommand({
      correlationId: "bad-grid",
      hostInstanceId: "host-1",
      windowId: "window-1",
      tabId: "tab-1",
      expectedRevision: 0,
      panes: [
        { paneId: "pane-1", session: invalidSessions[0] },
        { paneId: "pane-2", session: invalidSessions[1] },
        { paneId: "pane-3", session: invalidSessions[2] },
        { paneId: "pane-4", session: invalidSessions[3] },
      ],
    })).toThrow(/environment/);
  });

  it("rejects stale topology revisions and represents bounded failures", () => {
    const command = fixedCommand();
    expect(() => createFixedTwoByTwoCommand({
      correlationId: "stale-grid",
      hostInstanceId: "host-1",
      windowId: "window-1",
      tabId: "tab-1",
      expectedRevision: -1,
      panes: [
        { paneId: "pane-1", session: session("session-1") },
        { paneId: "pane-2", session: session("session-2") },
        { paneId: "pane-3", session: session("session-3") },
        { paneId: "pane-4", session: session("session-4") },
      ],
    })).toThrow(/revision/);
    if (command.type !== "apply-topology") throw new Error("fixture mismatch");
    expect(nativeHostCommandResult(command.correlationId, command.topology.revision)).toEqual({
      type: "command-result",
      correlationId: "create-grid-1",
      accepted: true,
      revision: 0,
      failure: null,
    });
    expect(nativeHostFailure("stale-revision", "expected revision 0", false)).toEqual({ code: "stale-revision", message: "expected revision 0", retryable: false });
  });

  it("provides deterministic timeout decisions", () => {
    expect(nativeHostTimedOut(100, 99)).toBe(false);
    expect(nativeHostTimedOut(100, 100)).toBe(true);
    expect(() => nativeHostTimedOut(-1, 0)).toThrow(/deadline/);
  });
});

describe("native-host proof frame codec", () => {
  it("round-trips partial and combined bounded frames", () => {
    const codec = new NativeHostFrameCodec();
    const commandMessage: NativeHostProofMessage = { type: "command", command: fixedCommand() };
    const eventMessage: NativeHostProofMessage = { type: "event", event: { type: "process-exited", paneId: "pane-1", sessionId: "session-1", exitCode: 0, signal: null } };
    const frame = codec.encode(commandMessage) + codec.encode(eventMessage);
    expect(codec.push(frame.slice(0, 17))).toEqual([]);
    const decoded = codec.push(frame.slice(17));
    expect(decoded).toEqual([commandMessage, eventMessage]);
  });

  it("rejects malformed, unknown, oversized, and semantically invalid frames", () => {
    const codec = new NativeHostFrameCodec();
    expect(() => codec.push("not-json\n")).toThrowError(NativeHostProtocolError);
    expect(() => codec.push('{"type":"future"}\n')).toThrowError(/proof message contract/);
    expect(() => codec.push(`{"type":"command","command":${" ".repeat(MAX_NATIVE_HOST_MESSAGE_BYTES)}}\n`)).toThrowError(/1 MiB/);
    expect(() => codec.push(JSON.stringify({ type: "command-result", correlationId: "bad", accepted: false, revision: null, failure: null }) + "\n")).toThrowError(/requires a failure/);
  });
});
