import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AGENT_ENGINE_CONTRACT_VERSION,
  assertAgentCapabilityContract,
  assertAgentCommand,
  assertAgentEvent,
  assertAgentSnapshot,
  decodeAgentCommand,
  decodeAgentEvent,
  decodeAgentSnapshot,
  encodeAgentCommand,
  encodeAgentEvent,
  encodeAgentSnapshot,
  type AgentCapabilityContract,
  type AgentCommand,
  type AgentEvent,
  type AgentSnapshot,
} from "../../../src/contracts/agent-engine/index.js";

const capabilities: AgentCapabilityContract = {
  contractVersion: AGENT_ENGINE_CONTRACT_VERSION,
  commands: ["prompt", "abort", "replace-session"],
  events: ["lifecycle", "content", "command-outcome", "snapshot-invalidated", "diagnostic"],
  snapshots: { supported: true, maxBytes: 512 * 1024 },
};

const command: AgentCommand = {
  contractVersion: AGENT_ENGINE_CONTRACT_VERSION,
  type: "prompt",
  commandId: "command-1",
  sessionId: "session-1",
  text: "Inspect the repository",
};

const event: AgentEvent = {
  contractVersion: AGENT_ENGINE_CONTRACT_VERSION,
  type: "content",
  sessionId: "session-1",
  sequence: 4,
  content: { id: "content-1", role: "assistant", status: "final", content: [{ kind: "text", text: "Done" }] },
};

const snapshot: AgentSnapshot = {
  contractVersion: AGENT_ENGINE_CONTRACT_VERSION,
  snapshotId: "snapshot-1",
  sessionId: "session-1",
  revision: 2,
  sequence: 4,
  lifecycle: "ready",
  content: [event.content],
  activeCommandIds: [],
  capabilities,
};

describe("vendor-neutral agent engine contracts", () => {
  it("exposes no Pi package references or Pi-named public symbols", async () => {
    const root = resolve("src/contracts/agent-engine");
    const source = (await Promise.all((await readdir(root)).filter(name => name.endsWith(".ts")).map(name => readFile(resolve(root, name), "utf8")))).join("\n");
    expect(source).not.toMatch(/@earendil-works\/pi-|\bPi[A-Z]/);
  });

  it("validates lifecycle, command, event, snapshot, and explicit capabilities", () => {
    expect(() => assertAgentCapabilityContract(capabilities)).not.toThrow();
    expect(() => assertAgentCommand(command, capabilities)).not.toThrow();
    expect(() => assertAgentEvent(event, capabilities)).not.toThrow();
    expect(() => assertAgentSnapshot(snapshot)).not.toThrow();
  });

  it("round-trips every serializable envelope", () => {
    expect(decodeAgentCommand(encodeAgentCommand(command, capabilities), capabilities)).toEqual(command);
    expect(decodeAgentEvent(encodeAgentEvent(event, capabilities), capabilities)).toEqual(event);
    expect(decodeAgentSnapshot(encodeAgentSnapshot(snapshot))).toEqual(snapshot);
  });

  it("rejects commands and events outside negotiated capabilities", () => {
    const unavailableCommand = { ...command, type: "steer" as const };
    const restrictedEvents = { ...capabilities, events: ["lifecycle"] as const };
    expect(() => assertAgentCommand(unavailableCommand, capabilities)).toThrow(/capability is unavailable/);
    expect(() => assertAgentEvent(event, restrictedEvents)).toThrow(/capability is unavailable/);
  });

  it("rejects malformed versions, identities, duplicate capabilities, and snapshots", () => {
    expect(() => assertAgentCommand({ ...command, contractVersion: 2 as never })).toThrow(/contract version/);
    expect(() => assertAgentCommand({ ...command, sessionId: "bad session" })).toThrow(/session id/);
    expect(() => assertAgentCapabilityContract({ ...capabilities, commands: ["prompt", "prompt"] })).toThrow(/duplicate/);
    expect(() => assertAgentSnapshot({ ...snapshot, activeCommandIds: ["same", "same"] })).toThrow(/duplicate/);
  });

  it("rejects invalid JSON and negotiated snapshot size drift", () => {
    expect(() => decodeAgentCommand("not-json", capabilities)).toThrow(/invalid JSON/);
    const constrained = { ...snapshot, capabilities: { ...capabilities, snapshots: { supported: true, maxBytes: 1024 } }, content: [{ ...event.content, content: [{ kind: "text" as const, text: "x".repeat(2048) }] }] };
    expect(() => encodeAgentSnapshot(constrained)).toThrow(/negotiated byte limit/);
  });
});
