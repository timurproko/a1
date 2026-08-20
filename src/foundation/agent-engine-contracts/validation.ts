import {
  AGENT_ENGINE_CONTRACT_VERSION,
  type AgentCapabilityContract,
  type AgentCommand,
  type AgentCommandCapability,
  type AgentEvent,
  type AgentSnapshot,
} from "./model.js";

const COMMANDS = new Set<AgentCommandCapability>(["prompt", "steer", "follow-up", "abort", "retry", "compact", "bash", "replace-session"]);
const EVENTS = new Set(["lifecycle", "content", "command-outcome", "snapshot-invalidated", "diagnostic"]);
const LIFECYCLES = new Set(["starting", "ready", "busy", "stopping", "stopped", "failed"]);
const OUTCOMES = new Set(["accepted", "completed", "rejected", "failed", "cancelled"]);
const MAX_TEXT_BYTES = 256 * 1024;
const MAX_COLLECTION = 10_000;

export function assertAgentCapabilityContract(value: AgentCapabilityContract): void {
  assertVersion(value.contractVersion);
  assertUniqueEnum(value.commands, COMMANDS, "agent command capabilities");
  assertUniqueEnum(value.events, EVENTS, "agent event capabilities");
  if (typeof value.snapshots?.supported !== "boolean" || !Number.isSafeInteger(value.snapshots.maxBytes) || value.snapshots.maxBytes < 1024) {
    throw new TypeError("agent snapshot capability is invalid");
  }
}

export function assertAgentCommand(command: AgentCommand, capabilities?: AgentCapabilityContract): void {
  assertVersion(command.contractVersion);
  assertId(command.commandId, "agent command id");
  assertId(command.sessionId, "agent command session id");
  if (!COMMANDS.has(command.type)) throw new TypeError("agent command type is unknown");
  if (capabilities !== undefined) {
    assertAgentCapabilityContract(capabilities);
    if (!capabilities.commands.includes(command.type)) throw new TypeError(`agent command capability is unavailable: ${command.type}`);
  }
  if (command.type === "prompt" || command.type === "steer" || command.type === "follow-up") assertText(command.text, "agent command text");
  if (command.type === "bash") assertText(command.command, "agent bash command");
  if (command.type === "replace-session" && command.source.kind === "resume") assertText(command.source.sessionPath, "agent resume path");
}

export function assertAgentEvent(event: AgentEvent, capabilities?: AgentCapabilityContract): void {
  assertVersion(event.contractVersion);
  assertId(event.sessionId, "agent event session id");
  assertNonNegative(event.sequence, "agent event sequence");
  if (!EVENTS.has(event.type)) throw new TypeError("agent event type is unknown");
  if (capabilities !== undefined) {
    assertAgentCapabilityContract(capabilities);
    if (!capabilities.events.includes(event.type)) throw new TypeError(`agent event capability is unavailable: ${event.type}`);
  }
  switch (event.type) {
    case "lifecycle":
      if (!LIFECYCLES.has(event.lifecycle)) throw new TypeError("agent lifecycle is invalid");
      if (event.reason !== null) assertText(event.reason, "agent lifecycle reason");
      return;
    case "content":
      assertId(event.content.id, "agent content id");
      if (!["user", "assistant", "tool", "system"].includes(event.content.role) || !["streaming", "final"].includes(event.content.status)) throw new TypeError("agent content metadata is invalid");
      assertPossiblyEmptyText(event.content.text, "agent content text");
      return;
    case "command-outcome":
      assertId(event.commandId, "agent outcome command id");
      if (!OUTCOMES.has(event.outcome)) throw new TypeError("agent command outcome is invalid");
      if (event.diagnostic !== null) assertText(event.diagnostic, "agent outcome diagnostic");
      return;
    case "snapshot-invalidated":
      assertNonNegative(event.expectedRevision, "agent expected snapshot revision");
      return;
    case "diagnostic":
      assertId(event.code, "agent diagnostic code");
      assertText(event.message, "agent diagnostic message");
      if (typeof event.recoverable !== "boolean") throw new TypeError("agent diagnostic recovery flag is invalid");
  }
}

export function assertAgentSnapshot(snapshot: AgentSnapshot): void {
  assertVersion(snapshot.contractVersion);
  assertId(snapshot.snapshotId, "agent snapshot id");
  assertId(snapshot.sessionId, "agent snapshot session id");
  assertNonNegative(snapshot.revision, "agent snapshot revision");
  assertNonNegative(snapshot.sequence, "agent snapshot sequence");
  if (!LIFECYCLES.has(snapshot.lifecycle)) throw new TypeError("agent snapshot lifecycle is invalid");
  assertAgentCapabilityContract(snapshot.capabilities);
  if (!Array.isArray(snapshot.content) || snapshot.content.length > MAX_COLLECTION) throw new RangeError("agent snapshot content collection is invalid");
  for (const content of snapshot.content) assertAgentEvent({ contractVersion: AGENT_ENGINE_CONTRACT_VERSION, sessionId: snapshot.sessionId, sequence: snapshot.sequence, type: "content", content });
  if (!Array.isArray(snapshot.activeCommandIds) || snapshot.activeCommandIds.length > MAX_COLLECTION) throw new RangeError("agent active command collection is invalid");
  const ids = new Set<string>();
  for (const id of snapshot.activeCommandIds) {
    assertId(id, "agent active command id");
    if (ids.has(id)) throw new TypeError(`duplicate agent active command id: ${id}`);
    ids.add(id);
  }
}

function assertVersion(version: unknown): asserts version is typeof AGENT_ENGINE_CONTRACT_VERSION {
  if (version !== AGENT_ENGINE_CONTRACT_VERSION) throw new TypeError("unsupported agent engine contract version");
}

function assertUniqueEnum(values: readonly unknown[], allowed: ReadonlySet<unknown>, label: string): void {
  if (!Array.isArray(values)) throw new TypeError(`${label} must be an array`);
  const unique = new Set();
  for (const value of values) {
    if (!allowed.has(value)) throw new TypeError(`${label} contains an unknown value: ${String(value)}`);
    if (unique.has(value)) throw new TypeError(`${label} contains a duplicate value: ${String(value)}`);
    unique.add(value);
  }
}

function assertId(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value)) throw new TypeError(`${label} is invalid`);
}

function assertText(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${label} is invalid`);
  assertPossiblyEmptyText(value, label);
}

function assertPossiblyEmptyText(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || Buffer.byteLength(value, "utf8") > MAX_TEXT_BYTES) throw new RangeError(`${label} exceeds its byte limit`);
}

function assertNonNegative(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new TypeError(`${label} is invalid`);
}
