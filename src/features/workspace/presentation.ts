import { availableWorkspaceActions, type WorkspaceCapabilityActionType } from "./capabilities.js";
import type { WorkspaceAgentState, WorkspaceView } from "./reducer.js";

export interface WorkspacePresentationOptions {
  readonly maxRows?: number;
  readonly maxLabelWidth?: number;
}

export interface WorkspaceAgentPresentationRow {
  readonly role: "option";
  readonly agentId: string;
  readonly label: string;
  readonly selected: boolean;
  readonly lifecycle: WorkspaceAgentState["lifecycle"];
  readonly unreadActivity: number;
  readonly attention: boolean;
  readonly failure: string | null;
  readonly actions: readonly WorkspaceCapabilityActionType[];
  readonly text: string;
  readonly accessibleDescription: string;
}

export interface WorkspacePresentationModel {
  readonly role: "listbox";
  readonly label: "AddOne agents";
  readonly selectedAgentId: string | null;
  readonly rows: readonly WorkspaceAgentPresentationRow[];
  readonly overflowCount: number;
  readonly emptyMessage: string | null;
  readonly text: string;
}

export function presentWorkspace(view: WorkspaceView, options: WorkspacePresentationOptions = {}): WorkspacePresentationModel {
  const maxRows = boundedInteger(options.maxRows ?? 8, 1, 100, "maximum workspace rows");
  const maxLabelWidth = boundedInteger(options.maxLabelWidth ?? 32, 8, 64, "maximum workspace label width");
  const rows = view.agents.slice(0, maxRows).map(agent => presentAgent(agent, view.selectedAgentId === agent.id, maxLabelWidth));
  const overflowCount = Math.max(0, view.agents.length - rows.length);
  const text = rows.length === 0
    ? "AddOne agents\nNo managed agents."
    : ["AddOne agents", ...rows.map(row => row.text), ...(overflowCount > 0 ? [`… ${overflowCount} more`] : [])].join("\n");
  return Object.freeze({
    role: "listbox",
    label: "AddOne agents",
    selectedAgentId: view.selectedAgentId,
    rows: Object.freeze(rows),
    overflowCount,
    emptyMessage: rows.length === 0 ? "No managed agents." : null,
    text,
  });
}

export function workspaceSelectionForKey(view: WorkspaceView, key: "ArrowDown" | "ArrowUp" | "Home" | "End"): string | null {
  if (view.agents.length === 0) return null;
  const currentIndex = Math.max(0, view.agents.findIndex(agent => agent.id === view.selectedAgentId));
  switch (key) {
    case "ArrowDown":
      return view.agents[Math.min(view.agents.length - 1, currentIndex + 1)]?.id ?? null;
    case "ArrowUp":
      return view.agents[Math.max(0, currentIndex - 1)]?.id ?? null;
    case "Home":
      return view.agents[0]?.id ?? null;
    case "End":
      return view.agents[view.agents.length - 1]?.id ?? null;
  }
}

function presentAgent(agent: WorkspaceAgentState, selected: boolean, maxLabelWidth: number): WorkspaceAgentPresentationRow {
  const label = truncate(agent.displayName, maxLabelWidth);
  const badges = [
    agent.lifecycle,
    agent.unreadActivity > 0 ? `${agent.unreadActivity} unread` : null,
    agent.attention ? "attention" : null,
  ].filter((value): value is string => value !== null).join(", ");
  const failure = agent.failure ? `${agent.failure.code}: ${agent.failure.message}` : null;
  const actions = availableWorkspaceActions(agent);
  return Object.freeze({
    role: "option",
    agentId: agent.id,
    label,
    selected,
    lifecycle: agent.lifecycle,
    unreadActivity: agent.unreadActivity,
    attention: agent.attention,
    failure,
    actions,
    text: `${selected ? "›" : " "} ${label} — ${badges}`,
    accessibleDescription: [agent.lifecycle, agent.unreadActivity > 0 ? `${agent.unreadActivity} unread` : null, agent.attention ? "needs attention" : null, failure]
      .filter((value): value is string => value !== null)
      .join("; "),
  });
}

function truncate(value: string, width: number): string {
  return value.length <= width ? value : `${value.slice(0, width - 1)}…`;
}

function boundedInteger(value: number, minimum: number, maximum: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
  return value;
}
