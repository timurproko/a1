import type {
  AgentCapabilityContract,
  AgentRecoveryAuthority,
  ComposedTerminalCapabilityContract,
  ManagedAgentDescriptor,
  NativeHostCommand,
  StructuredAgentSnapshot,
  StructuredCapabilityContract,
  TerminalDimensions,
  TerminalSessionLaunch,
  TerminalTab,
  TerminalTopologyNode,
  TerminalTopologySnapshot,
  WorkspaceCommand,
  WorkspaceEvent,
  WorkspaceSnapshot,
} from "./model.js";
import { NATIVE_HOST_PROTOCOL_VERSION, WORKSPACE_CONTRACT_VERSION } from "./model.js";

const MAX_ID_LENGTH = 128;
const MAX_LABEL_LENGTH = 256;
const MAX_COLLECTION_LENGTH = 10_000;
const MAX_ENVIRONMENT_ENTRIES = 512;
const MAX_ARGUMENTS = 1_024;
const MAX_POSITION = Number.MAX_SAFE_INTEGER;
const MAX_LIMIT = 1_000_000_000;

export function assertManagedAgentDescriptor(agent: ManagedAgentDescriptor): void {
  assertId(agent.id, "agent id");
  assertText(agent.displayName, "agent display name", MAX_LABEL_LENGTH);
  assertId(agent.adapterId, "adapter id");
  assertIsoDate(agent.createdAt, "agent creation time");
  if (agent.recoveryReferenceId !== null) assertId(agent.recoveryReferenceId, "recovery reference id");
  assertAgentCapability(agent.capability);
  if (agent.runtime !== agent.capability.kind) throw new TypeError("agent runtime must match its capability kind");
}

export function assertAgentCapability(capability: AgentCapabilityContract): void {
  if (capability.kind === "structured") {
    assertStructuredCapability(capability);
    return;
  }
  assertComposedTerminalCapability(capability);
}

export function assertStructuredCapability(capability: StructuredCapabilityContract): void {
  if (capability.protocolVersion !== WORKSPACE_CONTRACT_VERSION) throw new TypeError("unsupported structured protocol version");
  assertId(capability.adapterId, "structured adapter id");
  assertUniqueText(capability.commands, "structured commands");
  assertUniqueText(capability.eventTypes, "structured event types");
  assertUniqueText(capability.attachmentTypes, "structured attachment types");
  if (capability.resume === "position" && capability.snapshots === "none") {
    throw new TypeError("position resume requires authoritative snapshots for gap recovery");
  }
  if (capability.resume === "snapshot" && capability.snapshots !== "authoritative") {
    throw new TypeError("snapshot resume requires authoritative snapshots");
  }
  for (const [name, value] of Object.entries(capability.flow)) assertBoundedPositiveInteger(value, `structured flow ${name}`);
}

export function assertComposedTerminalCapability(capability: ComposedTerminalCapabilityContract): void {
  if (capability.protocolVersion !== NATIVE_HOST_PROTOCOL_VERSION) throw new TypeError("unsupported native-host protocol version");
  assertId(capability.hostInstanceId, "native host instance id");
  assertRevision(capability.topologyRevision, "topology revision");
}

export function assertWorkspaceSnapshot(snapshot: WorkspaceSnapshot): void {
  if (snapshot.contractVersion !== WORKSPACE_CONTRACT_VERSION) throw new TypeError("unsupported workspace contract version");
  assertId(snapshot.workspaceId, "workspace id");
  assertRevision(snapshot.revision, "workspace revision");
  assertCollection(snapshot.agents, "workspace agents");
  const ids = new Set<string>();
  for (const agent of snapshot.agents) {
    assertManagedAgentDescriptor(agent);
    if (ids.has(agent.id)) throw new TypeError(`duplicate agent id: ${agent.id}`);
    ids.add(agent.id);
  }
  if (snapshot.selectedAgentId !== null && !ids.has(snapshot.selectedAgentId)) {
    throw new TypeError("selected agent must exist in the workspace snapshot");
  }
}

export function assertWorkspaceCommand(command: WorkspaceCommand): void {
  assertId(command.correlationId, "command correlation id");
  switch (command.type) {
    case "create-agent":
      assertManagedAgentDescriptor(command.agent);
      return;
    case "select-agent":
    case "stop-agent":
    case "restart-agent":
    case "remove-agent":
      assertId(command.agentId, "command agent id");
      return;
    case "rename-agent":
      assertId(command.agentId, "command agent id");
      assertText(command.displayName, "agent display name", MAX_LABEL_LENGTH);
      return;
    case "structured-command":
      assertId(command.agentId, "command agent id");
      assertId(command.command, "structured command name");
      assertJsonValue(command.payload, "structured command payload");
      return;
    case "cancel-structured-command":
      assertId(command.agentId, "command agent id");
      assertId(command.targetCorrelationId, "target command correlation id");
  }
}

export function assertWorkspaceEvent(event: WorkspaceEvent): void {
  assertId(event.agentId, "event agent id");
  switch (event.type) {
    case "agent-lifecycle":
      assertPosition(event.position, "lifecycle event position");
      return;
    case "structured-event":
      assertPosition(event.position, "structured event position");
      assertId(event.eventType, "structured event type");
      assertJsonValue(event.payload, "structured event payload");
      return;
    case "command-outcome":
      assertId(event.correlationId, "command correlation id");
      return;
    case "terminal-topology":
      assertTerminalTopologySnapshot(event.topology);
      return;
    case "recovery-discontinuity":
      assertText(event.reason, "recovery discontinuity reason", 4_096);
  }
}

export function assertStructuredAgentSnapshot(snapshot: StructuredAgentSnapshot): void {
  if (snapshot.contractVersion !== WORKSPACE_CONTRACT_VERSION) throw new TypeError("unsupported structured snapshot contract version");
  assertId(snapshot.agentId, "structured snapshot agent id");
  assertId(snapshot.snapshotId, "structured snapshot id");
  assertPosition(snapshot.position, "structured snapshot position");
  if (snapshot.authoritative !== true) throw new TypeError("structured snapshot must be authoritative");
  assertJsonValue(snapshot.payload, "structured snapshot payload");
}

export function assertTerminalTopologySnapshot(topology: TerminalTopologySnapshot): void {
  assertId(topology.hostInstanceId, "native host instance id");
  assertRevision(topology.revision, "topology revision");
  assertCollection(topology.windows, "terminal windows");
  assertCollection(topology.sessions, "terminal sessions");

  const sessionIds = new Set<string>();
  for (const session of topology.sessions) {
    assertTerminalSessionLaunch(session);
    if (sessionIds.has(session.id)) throw new TypeError(`duplicate terminal session id: ${session.id}`);
    sessionIds.add(session.id);
  }

  const windowIds = new Set<string>();
  const paneIds = new Set<string>();
  for (const window of topology.windows) {
    assertId(window.id, "terminal window id");
    if (windowIds.has(window.id)) throw new TypeError(`duplicate terminal window id: ${window.id}`);
    windowIds.add(window.id);
    assertCollection(window.tabs, "terminal tabs");
    if (!window.tabs.some(tab => tab.id === window.activeTabId)) throw new TypeError("active tab must exist in its window");
    const tabIds = new Set<string>();
    for (const tab of window.tabs) {
      if (tabIds.has(tab.id)) throw new TypeError(`duplicate terminal tab id in window: ${tab.id}`);
      tabIds.add(tab.id);
      assertTerminalTab(tab, sessionIds, paneIds);
    }
  }
}

export function assertNativeHostCommand(command: NativeHostCommand): void {
  assertId(command.correlationId, "native-host correlation id");
  if (command.type === "apply-topology") {
    assertRevision(command.expectedRevision, "expected topology revision");
    assertTerminalTopologySnapshot(command.topology);
    if (command.topology.revision !== command.expectedRevision) {
      throw new TypeError("applied topology snapshot revision must equal the expected revision");
    }
    return;
  }
  if (command.type === "focus-pane" || command.type === "close-pane") {
    assertRevision(command.expectedRevision, "expected topology revision");
    assertId(command.paneId, "terminal pane id");
  }
}

export function assertRecoveryAuthority(authority: AgentRecoveryAuthority): void {
  assertId(authority.referenceId, "recovery reference id");
  assertId(authority.agentId, "recovery agent id");
  assertText(authority.processIdentity, "recovery process identity", 1_024);
  if (authority.kind === "structured") {
    assertId(authority.adapterId, "recovery adapter id");
    assertText(authority.ownershipProof, "recovery ownership proof", 4_096);
    if (authority.boundary.kind === "position") {
      assertPosition(authority.boundary.position, "resume position");
      assertText(authority.boundary.resumeToken, "resume token", 4_096);
    } else {
      assertId(authority.boundary.snapshotId, "recovery snapshot id");
    }
    return;
  }
  assertId(authority.hostInstanceId, "recovery host instance id");
  assertText(authority.hostBuildId, "recovery host build id", 1_024);
  assertText(authority.pseudoterminalIdentity, "recovery pseudoterminal identity", 1_024);
  assertText(authority.retainedStateIdentity, "recovery retained-state identity", 1_024);
  assertRevision(authority.topologyRevision, "recovery topology revision");
  assertPosition(authority.streamPosition, "recovery stream position");
}

function assertTerminalSessionLaunch(session: TerminalSessionLaunch): void {
  assertId(session.id, "terminal session id");
  assertText(session.executable, "terminal executable", 32_768);
  assertText(session.cwd, "terminal working directory", 32_768);
  if (session.executable.includes("\0") || session.cwd.includes("\0")) throw new TypeError("terminal launch paths contain a null byte");
  assertCollection(session.arguments, "terminal arguments", MAX_ARGUMENTS);
  if (session.arguments.some(argument => typeof argument !== "string" || argument.includes("\0"))) {
    throw new TypeError("terminal arguments contain an invalid value");
  }
  const entries = Object.entries(session.environment);
  assertCollection(entries, "terminal environment", MAX_ENVIRONMENT_ENTRIES);
  if (entries.some(([name, value]) => !name || name.includes("=") || name.includes("\0") || typeof value !== "string" || value.includes("\0"))) {
    throw new TypeError("terminal environment contains an invalid name or value");
  }
  assertTerminalDimensions(session.dimensions);
}

function assertTerminalDimensions(dimensions: TerminalDimensions): void {
  assertIntegerInRange(dimensions.columns, 2, 500, "terminal columns");
  assertIntegerInRange(dimensions.rows, 1, 300, "terminal rows");
  assertIntegerInRange(dimensions.widthPixels, 1, 100_000, "terminal pixel width");
  assertIntegerInRange(dimensions.heightPixels, 1, 100_000, "terminal pixel height");
}

function assertTerminalTab(tab: TerminalTab, sessionIds: ReadonlySet<string>, globalPaneIds: Set<string>): void {
  assertId(tab.id, "terminal tab id");
  assertCollection(tab.nodes, "terminal topology nodes");
  assertCollection(tab.panes, "terminal panes");
  const paneIds = new Set<string>();
  for (const pane of tab.panes) {
    assertId(pane.id, "terminal pane id");
    assertId(pane.sessionId, "terminal pane session id");
    if (paneIds.has(pane.id) || globalPaneIds.has(pane.id)) throw new TypeError(`duplicate terminal pane id: ${pane.id}`);
    if (!sessionIds.has(pane.sessionId)) throw new TypeError(`terminal pane references missing session: ${pane.sessionId}`);
    paneIds.add(pane.id);
    globalPaneIds.add(pane.id);
  }
  if (!paneIds.has(tab.focusedPaneId)) throw new TypeError("focused pane must exist in its tab");

  const nodes = new Map<string, TerminalTopologyNode>();
  for (const node of tab.nodes) {
    assertId(node.id, "terminal topology node id");
    if (nodes.has(node.id)) throw new TypeError(`duplicate terminal topology node id: ${node.id}`);
    if (node.kind === "leaf") {
      if (!paneIds.has(node.paneId)) throw new TypeError(`terminal leaf references missing pane: ${node.paneId}`);
    } else {
      if (!(node.ratio > 0 && node.ratio < 1 && Number.isFinite(node.ratio))) throw new RangeError("terminal split ratio must be between zero and one");
      if (node.first === node.second || node.id === node.first || node.id === node.second) throw new TypeError("terminal split cannot reference itself or duplicate a child");
    }
    nodes.set(node.id, node);
  }
  if (!nodes.has(tab.rootNodeId)) throw new TypeError("terminal tab root node is missing");
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const reachedPanes = new Set<string>();
  visitNode(tab.rootNodeId, nodes, visited, visiting, reachedPanes);
  if (visited.size !== nodes.size) throw new TypeError("terminal tab contains unreachable topology nodes");
  if (reachedPanes.size !== paneIds.size || [...paneIds].some(paneId => !reachedPanes.has(paneId))) {
    throw new TypeError("each terminal pane must appear exactly once in the split tree");
  }
}

function visitNode(
  id: string,
  nodes: ReadonlyMap<string, TerminalTopologyNode>,
  visited: Set<string>,
  visiting: Set<string>,
  reachedPanes: Set<string>,
): void {
  const node = nodes.get(id);
  if (!node) throw new TypeError(`terminal split references missing node: ${id}`);
  if (visiting.has(id)) throw new TypeError("terminal topology contains a cycle");
  if (visited.has(id)) throw new TypeError("terminal topology node has multiple parents");
  visiting.add(id);
  if (node.kind === "leaf") {
    if (reachedPanes.has(node.paneId)) throw new TypeError("terminal pane appears more than once in the split tree");
    reachedPanes.add(node.paneId);
  } else {
    visitNode(node.first, nodes, visited, visiting, reachedPanes);
    visitNode(node.second, nodes, visited, visiting, reachedPanes);
  }
  visiting.delete(id);
  visited.add(id);
}

function assertUniqueText(values: readonly string[], name: string): void {
  assertCollection(values, name);
  const seen = new Set<string>();
  for (const value of values) {
    assertId(value, name);
    if (seen.has(value)) throw new TypeError(`${name} contains a duplicate: ${value}`);
    seen.add(value);
  }
}

function assertJsonValue(value: unknown, name: string): void {
  try {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) throw new TypeError();
  } catch {
    throw new TypeError(`${name} must be JSON serializable`);
  }
}

function assertCollection(value: readonly unknown[], name: string, maximum = MAX_COLLECTION_LENGTH): void {
  if (!Array.isArray(value) || value.length > maximum) throw new RangeError(`${name} exceeds its maximum length`);
}

function assertId(value: string, name: string): void {
  assertText(value, name, MAX_ID_LENGTH);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)) throw new TypeError(`${name} contains unsupported characters`);
}

function assertText(value: string, name: string, maximum: number): void {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum || value.includes("\0")) {
    throw new TypeError(`${name} is invalid`);
  }
}

function assertIsoDate(value: string, name: string): void {
  assertText(value, name, 64);
  if (!Number.isFinite(Date.parse(value))) throw new TypeError(`${name} is not an ISO timestamp`);
}

function assertRevision(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${name} must be a non-negative safe integer`);
}

function assertPosition(value: number, name: string): void {
  assertIntegerInRange(value, 0, MAX_POSITION, name);
}

function assertBoundedPositiveInteger(value: number, name: string): void {
  assertIntegerInRange(value, 1, MAX_LIMIT, name);
}

function assertIntegerInRange(value: number, minimum: number, maximum: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
}
