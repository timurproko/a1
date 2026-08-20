import type { AgentCapabilityContract, AgentCommand, AgentEvent, AgentSnapshot } from "./model.js";
import { assertAgentCommand, assertAgentEvent, assertAgentSnapshot } from "./validation.js";

const MAX_ENVELOPE_BYTES = 1024 * 1024;

export function encodeAgentCommand(command: AgentCommand, capabilities?: AgentCapabilityContract): string {
  assertAgentCommand(command, capabilities);
  return encode(command);
}

export function decodeAgentCommand(source: string, capabilities?: AgentCapabilityContract): AgentCommand {
  const value = decode(source) as AgentCommand;
  assertAgentCommand(value, capabilities);
  return value;
}

export function encodeAgentEvent(event: AgentEvent, capabilities?: AgentCapabilityContract): string {
  assertAgentEvent(event, capabilities);
  return encode(event);
}

export function decodeAgentEvent(source: string, capabilities?: AgentCapabilityContract): AgentEvent {
  const value = decode(source) as AgentEvent;
  assertAgentEvent(value, capabilities);
  return value;
}

export function encodeAgentSnapshot(snapshot: AgentSnapshot): string {
  assertAgentSnapshot(snapshot);
  const encoded = encode(snapshot);
  if (Buffer.byteLength(encoded, "utf8") > snapshot.capabilities.snapshots.maxBytes) throw new RangeError("agent snapshot exceeds negotiated byte limit");
  return encoded;
}

export function decodeAgentSnapshot(source: string): AgentSnapshot {
  const value = decode(source) as AgentSnapshot;
  assertAgentSnapshot(value);
  if (Buffer.byteLength(source, "utf8") > value.capabilities.snapshots.maxBytes) throw new RangeError("agent snapshot exceeds negotiated byte limit");
  return value;
}

function encode(value: unknown): string {
  let encoded: string;
  try {
    encoded = JSON.stringify(value);
  } catch (error) {
    throw new TypeError("agent contract value must be JSON serializable", { cause: error });
  }
  if (encoded === undefined) throw new TypeError("agent contract value must be JSON serializable");
  if (Buffer.byteLength(encoded, "utf8") > MAX_ENVELOPE_BYTES) throw new RangeError("agent contract envelope exceeds its byte limit");
  return encoded;
}

function decode(source: string): unknown {
  if (typeof source !== "string" || Buffer.byteLength(source, "utf8") > MAX_ENVELOPE_BYTES) throw new RangeError("agent contract envelope exceeds its byte limit");
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new TypeError("agent contract envelope is invalid JSON", { cause: error });
  }
}
