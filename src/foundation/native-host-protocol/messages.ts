import {
  NATIVE_HOST_PROTOCOL_VERSION,
  assertNativeHostCommand,
  assertTerminalSessionLaunch,
  type CorrelationId,
  type NativeHostCommand,
  type NativeHostEvent,
  type NativeHostHello,
  type PaneId,
  type TerminalSessionLaunch,
  type TerminalTopologySnapshot,
} from "../workspace-contracts/index.js";
import { PRODUCT_IDENTITY } from "../../product-identity.js";

export const NATIVE_HOST_PROTOCOL_NAME = PRODUCT_IDENTITY.protocol.nativeHostSchema;
export const MAX_NATIVE_HOST_MESSAGE_BYTES = 1024 * 1024;

export type NativeHostProofMessage =
  | { readonly type: "hello"; readonly hello: NativeHostHello }
  | { readonly type: "hello-result"; readonly accepted: boolean; readonly negotiatedCapabilities: readonly string[]; readonly diagnostic: string }
  | { readonly type: "command"; readonly command: NativeHostCommand }
  | { readonly type: "command-result"; readonly correlationId: CorrelationId; readonly accepted: boolean; readonly revision: number | null; readonly failure: NativeHostFailure | null }
  | { readonly type: "event"; readonly event: NativeHostEvent }
  | { readonly type: "error"; readonly failure: NativeHostFailure };

export interface NativeHostFailure {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
}

export interface NativeHostNegotiationResult {
  readonly accepted: boolean;
  readonly negotiatedCapabilities: readonly string[];
  readonly diagnostic: string;
}

export interface FixedTwoByTwoPaneDefinition {
  readonly paneId: PaneId;
  readonly session: TerminalSessionLaunch;
}

export function negotiateNativeHostHello(value: NativeHostHello): NativeHostNegotiationResult {
  if (value.protocolVersion !== NATIVE_HOST_PROTOCOL_VERSION) {
    return negotiation(false, [], `unsupported native-host protocol version ${value.protocolVersion}`);
  }
  if (!isText(value.hostInstanceId, 128) || !isText(value.buildId, 256)) {
    return negotiation(false, [], "native host instance and build identities must be bounded non-empty values");
  }
  if (!["windows", "macos", "linux"].includes(value.platform)) {
    return negotiation(false, [], `unsupported native-host platform ${String(value.platform)}`);
  }
  const required = ["exact-command", "revisioned-topology", "native-input", "native-rendering", "retained-terminal-state"];
  const capabilities = new Set(value.capabilities);
  const missing = required.filter(capability => !capabilities.has(capability as NativeHostHello["capabilities"][number]));
  if (missing.length > 0) return negotiation(false, [...capabilities].sort(), `native host lacks required capabilities: ${missing.join(", ")}`);
  return negotiation(true, [...capabilities].sort(), "native host handshake accepted");
}

export function createFixedTwoByTwoCommand(input: {
  readonly correlationId: CorrelationId;
  readonly hostInstanceId: string;
  readonly windowId: string;
  readonly tabId: string;
  readonly expectedRevision: number;
  readonly panes: readonly [FixedTwoByTwoPaneDefinition, FixedTwoByTwoPaneDefinition, FixedTwoByTwoPaneDefinition, FixedTwoByTwoPaneDefinition];
}): NativeHostCommand {
  if (input.panes.length !== 4) throw new RangeError("fixed 2x2 proof requires exactly four panes");
  const paneIds = new Set<string>();
  const sessions: TerminalSessionLaunch[] = [];
  for (const pane of input.panes) {
    if (paneIds.has(pane.paneId)) throw new TypeError(`duplicate proof pane id: ${pane.paneId}`);
    paneIds.add(pane.paneId);
    assertTerminalSessionLaunch(pane.session);
    sessions.push(pane.session);
  }
  const [topLeft, topRight, bottomLeft, bottomRight] = input.panes;
  const topology: TerminalTopologySnapshot = {
    hostInstanceId: input.hostInstanceId,
    revision: input.expectedRevision,
    windows: [{
      id: input.windowId,
      activeTabId: input.tabId,
      tabs: [{
        id: input.tabId,
        rootNodeId: "root",
        focusedPaneId: topLeft.paneId,
        panes: input.panes.map(pane => ({ id: pane.paneId, sessionId: pane.session.id })),
        nodes: [
          { id: "root", kind: "split", axis: "horizontal", ratio: 0.5, first: "top", second: "bottom" },
          { id: "top", kind: "split", axis: "vertical", ratio: 0.5, first: "leaf-top-left", second: "leaf-top-right" },
          { id: "bottom", kind: "split", axis: "vertical", ratio: 0.5, first: "leaf-bottom-left", second: "leaf-bottom-right" },
          { id: "leaf-top-left", kind: "leaf", paneId: topLeft.paneId },
          { id: "leaf-top-right", kind: "leaf", paneId: topRight.paneId },
          { id: "leaf-bottom-left", kind: "leaf", paneId: bottomLeft.paneId },
          { id: "leaf-bottom-right", kind: "leaf", paneId: bottomRight.paneId },
        ],
      }],
    }],
    sessions,
  };
  const command: NativeHostCommand = {
    type: "apply-topology",
    correlationId: input.correlationId,
    expectedRevision: input.expectedRevision,
    topology,
  };
  assertNativeHostCommand(command);
  return command;
}

export function nativeHostCommandResult(correlationId: CorrelationId, revision: number): Extract<NativeHostProofMessage, { type: "command-result" }> {
  return { type: "command-result", correlationId, accepted: true, revision, failure: null };
}

export function nativeHostFailure(code: string, message: string, retryable = false): NativeHostFailure {
  if (!isText(code, 128) || !isText(message, 4_096)) throw new TypeError("native-host failure outcome is invalid");
  return Object.freeze({ code, message, retryable });
}

export function nativeHostTimedOut(deadlineAt: number, now: number): boolean {
  if (!Number.isSafeInteger(deadlineAt) || deadlineAt < 0 || !Number.isSafeInteger(now) || now < 0) {
    throw new RangeError("native-host deadline and clock must be non-negative safe integers");
  }
  return now >= deadlineAt;
}

export function assertNativeHostProofMessage(message: NativeHostProofMessage): void {
  switch (message.type) {
    case "hello": {
      const result = negotiateNativeHostHello(message.hello);
      if (!result.accepted) throw new TypeError(result.diagnostic);
      return;
    }
    case "hello-result":
      if (typeof message.accepted !== "boolean" || !Array.isArray(message.negotiatedCapabilities) || !isText(message.diagnostic, 4_096)) {
        throw new TypeError("native-host hello result is invalid");
      }
      return;
    case "command":
      assertNativeHostCommand(message.command);
      return;
    case "command-result":
      if (!isText(message.correlationId, 128) || typeof message.accepted !== "boolean") throw new TypeError("native-host command result is invalid");
      if (message.revision !== null && (!Number.isSafeInteger(message.revision) || message.revision < 0)) throw new RangeError("native-host result revision is invalid");
      if (message.accepted && message.failure !== null) throw new TypeError("accepted native-host result cannot carry a failure");
      if (!message.accepted && message.failure === null) throw new TypeError("rejected native-host result requires a failure");
      if (message.failure !== null) assertFailure(message.failure);
      return;
    case "event":
      assertNativeHostEvent(message.event);
      return;
    case "error":
      assertFailure(message.failure);
  }
}

function assertNativeHostEvent(event: NativeHostEvent): void {
  switch (event.type) {
    case "topology-changed":
      assertNativeHostCommand({ type: "apply-topology", correlationId: "topology-validation", expectedRevision: event.topology.revision, topology: event.topology });
      return;
    case "pane-ready":
      if (!isText(event.paneId, 128) || !isText(event.sessionId, 128)) throw new TypeError("pane-ready event is invalid");
      return;
    case "process-exited":
      if (!isText(event.paneId, 128) || !isText(event.sessionId, 128)) throw new TypeError("process-exited event is invalid");
      if (event.exitCode !== null && (!Number.isSafeInteger(event.exitCode) || event.exitCode < 0)) throw new RangeError("process exit code is invalid");
      if (event.signal !== null && !isText(event.signal, 64)) throw new TypeError("process exit signal is invalid");
      return;
    case "host-degraded":
      if (!isText(event.code, 128) || !isText(event.message, 4_096)) throw new TypeError("host-degraded event is invalid");
  }
}

function assertFailure(failure: NativeHostFailure): void {
  if (!isText(failure.code, 128) || !isText(failure.message, 4_096) || typeof failure.retryable !== "boolean") {
    throw new TypeError("native-host failure outcome is invalid");
  }
}

function negotiation(accepted: boolean, negotiatedCapabilities: readonly string[], diagnostic: string): NativeHostNegotiationResult {
  return Object.freeze({ accepted, negotiatedCapabilities: Object.freeze(negotiatedCapabilities), diagnostic });
}

function isText(value: string, maximum: number): boolean {
  return typeof value === "string" && value.length > 0 && value.length <= maximum && !value.includes("\0");
}
