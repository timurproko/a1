import { describe, expect, it } from "vitest";
import {
  NATIVE_HOST_PROTOCOL_VERSION,
  WORKSPACE_CONTRACT_VERSION,
  assertManagedAgentDescriptor,
  assertNativeHostCommand,
  assertRecoveryAuthority,
  assertStructuredAgentSnapshot,
  assertStructuredCapability,
  assertTerminalTopologySnapshot,
  assertWorkspaceCommand,
  assertWorkspaceEvent,
  assertWorkspaceSnapshot,
  type ManagedAgentDescriptor,
  type StructuredCapabilityContract,
  type TerminalPane,
  type TerminalSessionLaunch,
  type TerminalTopologyNode,
  type TerminalTopologySnapshot,
} from "../../../src/foundation/workspace-contracts/index.js";

const structuredCapability: StructuredCapabilityContract = {
  kind: "structured",
  protocolVersion: WORKSPACE_CONTRACT_VERSION,
  adapterId: "adapter.synthetic",
  commands: ["prompt", "cancel"],
  eventTypes: ["message", "tool-call"],
  snapshots: "authoritative",
  resume: "position",
  cancellation: "correlated",
  attachmentTypes: ["text"],
  flow: {
    maxEventBytes: 64_000,
    maxSnapshotBytes: 1_000_000,
    maxAttachmentBytes: 2_000_000,
    maxQueuedEvents: 256,
    maxConcurrentCommands: 4,
    maxReconnectEvents: 1_024,
  },
};

const structuredAgent: ManagedAgentDescriptor = {
  id: "agent-1",
  displayName: "Research",
  adapterId: "adapter.synthetic",
  runtime: "structured",
  lifecycle: "ready",
  capability: structuredCapability,
  createdAt: "2026-08-13T00:00:00.000Z",
  recoveryReferenceId: "recovery-1",
};

function fourPaneTopology(): TerminalTopologySnapshot {
  const pane = (id: string, sessionId: string) => ({ id, sessionId });
  const leaf = (id: string, paneId: string) => ({ id, kind: "leaf" as const, paneId });
  const session = (id: string) => ({
    id,
    executable: "C:\\Windows\\System32\\cmd.exe",
    arguments: ["/d", "/q"],
    cwd: "C:\\work",
    environment: { ADDONE_PANE: id },
    dimensions: { columns: 80, rows: 24, widthPixels: 640, heightPixels: 480 },
    inactivity: "live-unpainted" as const,
  });
  return {
    hostInstanceId: "host-1",
    revision: 7,
    windows: [{
      id: "window-1",
      activeTabId: "tab-1",
      tabs: [{
        id: "tab-1",
        rootNodeId: "root",
        focusedPaneId: "pane-1",
        panes: [pane("pane-1", "session-1"), pane("pane-2", "session-2"), pane("pane-3", "session-3"), pane("pane-4", "session-4")],
        nodes: [
          { id: "root", kind: "split", axis: "horizontal", ratio: 0.5, first: "left", second: "right" },
          { id: "left", kind: "split", axis: "vertical", ratio: 0.5, first: "leaf-1", second: "leaf-2" },
          { id: "right", kind: "split", axis: "vertical", ratio: 0.5, first: "leaf-3", second: "leaf-4" },
          leaf("leaf-1", "pane-1"),
          leaf("leaf-2", "pane-2"),
          leaf("leaf-3", "pane-3"),
          leaf("leaf-4", "pane-4"),
        ],
      }],
    }],
    sessions: [session("session-1"), session("session-2"), session("session-3"), session("session-4")],
  };
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

describe("workspace identity and capability contracts", () => {
  it("accepts a coherent structured agent and workspace snapshot", () => {
    expect(() => assertManagedAgentDescriptor(structuredAgent)).not.toThrow();
    expect(() => assertWorkspaceSnapshot({
      contractVersion: WORKSPACE_CONTRACT_VERSION,
      workspaceId: "workspace-1",
      revision: 4,
      selectedAgentId: structuredAgent.id,
      agents: [structuredAgent],
    })).not.toThrow();
  });

  it("rejects runtime/capability mismatches, invalid versions, duplicate features, and contradictory resume semantics", () => {
    expect(() => assertManagedAgentDescriptor({ ...structuredAgent, runtime: "composed-terminal" })).toThrow(/runtime must match/);
    expect(() => assertStructuredCapability({ ...structuredCapability, protocolVersion: 2 as 1 })).toThrow(/unsupported structured protocol/);
    expect(() => assertStructuredCapability({ ...structuredCapability, commands: ["prompt", "prompt"] })).toThrow(/duplicate/);
    expect(() => assertStructuredCapability({ ...structuredCapability, snapshots: "none", resume: "position" })).toThrow(/requires authoritative snapshots/);
  });

  it("rejects duplicate or missing selected agent identities", () => {
    expect(() => assertWorkspaceSnapshot({
      contractVersion: WORKSPACE_CONTRACT_VERSION,
      workspaceId: "workspace-1",
      revision: 1,
      selectedAgentId: "agent-missing",
      agents: [structuredAgent],
    })).toThrow(/selected agent/);
    expect(() => assertWorkspaceSnapshot({
      contractVersion: WORKSPACE_CONTRACT_VERSION,
      workspaceId: "workspace-1",
      revision: 1,
      selectedAgentId: structuredAgent.id,
      agents: [structuredAgent, structuredAgent],
    })).toThrow(/duplicate agent/);
  });
});

describe("command, event, and snapshot contracts", () => {
  it("accepts bounded commands, typed events, and authoritative terminal topology", () => {
    const topology = fourPaneTopology();
    expect(() => assertWorkspaceCommand({
      type: "structured-command",
      correlationId: "command-1",
      agentId: "agent-1",
      command: "prompt",
      payload: { text: "hello" },
    })).not.toThrow();
    expect(() => assertWorkspaceEvent({ type: "structured-event", agentId: "agent-1", position: 5, eventType: "message", payload: { text: "answer" } })).not.toThrow();
    expect(() => assertWorkspaceCommand({ type: "cancel-structured-command", correlationId: "cancel-1", agentId: "agent-1", targetCorrelationId: "command-1" })).not.toThrow();
    expect(() => assertStructuredAgentSnapshot({
      contractVersion: WORKSPACE_CONTRACT_VERSION,
      agentId: "agent-1",
      snapshotId: "snapshot-1",
      position: 5,
      authoritative: true,
      payload: { messages: [] },
    })).not.toThrow();
    expect(() => assertWorkspaceEvent({ type: "terminal-topology", agentId: "terminal-agent-1", topology })).not.toThrow();
    expect(() => assertTerminalTopologySnapshot(topology)).not.toThrow();
  });

  it("rejects non-serializable payloads and invalid ordering positions", () => {
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    expect(() => assertWorkspaceCommand({ type: "structured-command", correlationId: "command-1", agentId: "agent-1", command: "prompt", payload: cycle })).toThrow(/JSON serializable/);
    expect(() => assertWorkspaceEvent({ type: "structured-event", agentId: "agent-1", position: -1, eventType: "message", payload: null })).toThrow(/position/);
    expect(() => assertStructuredAgentSnapshot({
      contractVersion: WORKSPACE_CONTRACT_VERSION,
      agentId: "agent-1",
      snapshotId: "snapshot-1",
      position: 0,
      authoritative: true,
      payload: cycle,
    })).toThrow(/JSON serializable/);
  });
});

describe("terminal tab, pane, session, and topology contracts", () => {
  it("accepts a revisioned 2x2 tree with four independent terminal sessions", () => {
    const topology = fourPaneTopology();
    expect(() => assertTerminalTopologySnapshot(topology)).not.toThrow();
    expect(topology.windows[0]?.tabs[0]?.panes).toHaveLength(4);
    expect(new Set(topology.sessions.map(session => session.id))).toHaveLength(4);
  });

  it("rejects missing sessions, cycles, unreachable nodes, duplicate panes, and invalid dimensions", () => {
    const missingSession = fourPaneTopology();
    (missingSession.sessions as TerminalSessionLaunch[]).pop();
    expect(() => assertTerminalTopologySnapshot(missingSession)).toThrow(/missing session/);

    const cycle = fourPaneTopology();
    const left = cycle.windows[0]?.tabs[0]?.nodes.find(node => node.id === "left");
    if (left?.kind !== "split") throw new Error("fixture mismatch");
    (left as { first: string }).first = "root";
    expect(() => assertTerminalTopologySnapshot(cycle)).toThrow(/cycle|multiple parents/);

    const unreachable = fourPaneTopology();
    (unreachable.windows[0]?.tabs[0]?.nodes as TerminalTopologyNode[])
      .push({ id: "orphan", kind: "leaf", paneId: "pane-1" });
    expect(() => assertTerminalTopologySnapshot(unreachable)).toThrow(/unreachable|more than once/);

    const duplicatePane = fourPaneTopology();
    (duplicatePane.windows[0]?.tabs[0]?.panes as TerminalPane[])
      .push({ id: "pane-1", sessionId: "session-2" });
    expect(() => assertTerminalTopologySnapshot(duplicatePane)).toThrow(/duplicate terminal pane/);

    const invalidDimensions = fourPaneTopology();
    const firstSession = invalidDimensions.sessions[0];
    if (!firstSession) throw new Error("fixture mismatch");
    (firstSession.dimensions as { columns: number }).columns = 1;
    expect(() => assertTerminalTopologySnapshot(invalidDimensions)).toThrow(/terminal columns/);
  });

  it("rejects stale or internally inconsistent native-host topology mutations", () => {
    const topology = fourPaneTopology();
    expect(() => assertNativeHostCommand({
      type: "apply-topology",
      correlationId: "mutation-1",
      expectedRevision: topology.revision,
      topology,
    })).not.toThrow();
    expect(() => assertNativeHostCommand({
      type: "apply-topology",
      correlationId: "mutation-1",
      expectedRevision: topology.revision - 1,
      topology,
    })).toThrow(/must equal the expected revision/);
    expect(() => assertNativeHostCommand({ type: "focus-pane", correlationId: "focus-1", expectedRevision: -1, paneId: "pane-1" })).toThrow(/revision/);
  });
});

describe("recovery authority contracts", () => {
  it("accepts structured and composed authority only when required identities are present", () => {
    expect(() => assertRecoveryAuthority({
      kind: "structured",
      referenceId: "recovery-1",
      agentId: "agent-1",
      adapterId: "adapter.synthetic",
      processIdentity: "pid:100:start:1",
      ownershipProof: "proof-1",
      boundary: { kind: "position", position: 8, resumeToken: "resume-8" },
    })).not.toThrow();
    expect(() => assertRecoveryAuthority({
      kind: "composed-terminal",
      referenceId: "recovery-2",
      agentId: "agent-terminal-1",
      hostInstanceId: "host-1",
      hostBuildId: "build-1",
      processIdentity: "pid:200:start:2",
      pseudoterminalIdentity: "conpty-1",
      retainedStateIdentity: "surface-state-1",
      topologyRevision: 7,
      streamPosition: 1_024,
    })).not.toThrow();
  });

  it("rejects incomplete ownership and continuity evidence", () => {
    expect(() => assertRecoveryAuthority({
      kind: "structured",
      referenceId: "recovery-1",
      agentId: "agent-1",
      adapterId: "adapter.synthetic",
      processIdentity: "pid:100:start:1",
      ownershipProof: "",
      boundary: { kind: "position", position: 8, resumeToken: "resume-8" },
    })).toThrow(/ownership proof/);
    expect(() => assertRecoveryAuthority({
      kind: "composed-terminal",
      referenceId: "recovery-2",
      agentId: "agent-terminal-1",
      hostInstanceId: "host-1",
      hostBuildId: "build-1",
      processIdentity: "pid:200:start:2",
      pseudoterminalIdentity: "conpty-1",
      retainedStateIdentity: "",
      topologyRevision: 7,
      streamPosition: 1_024,
    })).toThrow(/retained-state identity/);
  });

  it("keeps contract versions explicit", () => {
    expect(WORKSPACE_CONTRACT_VERSION).toBe(1);
    expect(NATIVE_HOST_PROTOCOL_VERSION).toBe(1);
    expect(clone(structuredAgent)).toEqual(structuredAgent);
  });
});
