import type { ManagedAgentDescriptor } from "../../foundation/workspace-contracts/index.js";

export type WorkspaceCapabilityAction =
  | { readonly type: "structured-command"; readonly command: string }
  | { readonly type: "cancel-structured-command" }
  | { readonly type: "restore-structured-snapshot" }
  | { readonly type: "send-structured-attachment"; readonly attachmentType: string }
  | { readonly type: "create-terminal-pane" }
  | { readonly type: "apply-terminal-layout" }
  | { readonly type: "focus-terminal-pane" }
  | { readonly type: "close-terminal-pane" };

export type WorkspaceCapabilityActionType = WorkspaceCapabilityAction["type"];

export type WorkspaceActionGateResult =
  | { readonly kind: "allowed"; readonly action: WorkspaceCapabilityAction }
  | { readonly kind: "rejected"; readonly code: string; readonly diagnostic: string };

const STRUCTURED_ACTIONS = [
  "structured-command",
  "cancel-structured-command",
  "restore-structured-snapshot",
  "send-structured-attachment",
] as const;
const COMPOSED_ACTIONS = [
  "create-terminal-pane",
  "apply-terminal-layout",
  "focus-terminal-pane",
  "close-terminal-pane",
] as const;

export function gateWorkspaceAction(agent: ManagedAgentDescriptor, action: WorkspaceCapabilityAction): WorkspaceActionGateResult {
  const capability = agent.capability;
  if (capability.kind === "structured") {
    if (!isStructuredAction(action.type)) {
      return reject("capability-mismatch", `agent ${agent.id} is structured and cannot use composed pane action ${action.type}`);
    }
    switch (action.type) {
      case "structured-command":
        return capability.commands.includes(action.command)
          ? allow(action)
          : reject("unsupported-command", `structured agent ${agent.id} does not declare command ${action.command}`);
      case "cancel-structured-command":
        return capability.cancellation === "correlated"
          ? allow(action)
          : reject("unsupported-cancellation", `structured agent ${agent.id} did not negotiate correlated cancellation`);
      case "restore-structured-snapshot":
        return capability.snapshots === "authoritative"
          ? allow(action)
          : reject("unsupported-snapshot", `structured agent ${agent.id} does not provide authoritative snapshots`);
      case "send-structured-attachment":
        return capability.attachmentTypes.includes(action.attachmentType)
          ? allow(action)
          : reject("unsupported-attachment", `structured agent ${agent.id} does not declare attachment type ${action.attachmentType}`);
    }
  }

  if (isStructuredAction(action.type)) {
    return reject("capability-mismatch", `agent ${agent.id} is terminal-backed and cannot use structured action ${action.type}`);
  }
  if (!isComposedAction(action.type)) return reject("invalid-action", `workspace action is invalid: ${action.type}`);
  if (capability.proofStatus !== "accepted") {
    return reject("composed-unavailable", `composed pane action ${action.type} is unavailable until native-host proof is accepted (current: ${capability.proofStatus})`);
  }
  return allow(action);
}

export function availableWorkspaceActions(agent: ManagedAgentDescriptor): readonly WorkspaceCapabilityActionType[] {
  const capability = agent.capability;
  if (capability.kind === "structured") {
    const actions: WorkspaceCapabilityActionType[] = [];
    if (capability.commands.length > 0) actions.push("structured-command");
    if (capability.cancellation === "correlated") actions.push("cancel-structured-command");
    if (capability.snapshots === "authoritative") actions.push("restore-structured-snapshot");
    if (capability.attachmentTypes.length > 0) actions.push("send-structured-attachment");
    return Object.freeze(actions);
  }
  return capability.proofStatus === "accepted" ? Object.freeze([...COMPOSED_ACTIONS]) : Object.freeze([]);
}

function isStructuredAction(type: WorkspaceCapabilityActionType): type is typeof STRUCTURED_ACTIONS[number] {
  return (STRUCTURED_ACTIONS as readonly string[]).includes(type);
}

function isComposedAction(type: WorkspaceCapabilityActionType): type is typeof COMPOSED_ACTIONS[number] {
  return (COMPOSED_ACTIONS as readonly string[]).includes(type);
}

function allow(action: WorkspaceCapabilityAction): Extract<WorkspaceActionGateResult, { kind: "allowed" }> {
  return { kind: "allowed", action };
}

function reject(code: string, diagnostic: string): Extract<WorkspaceActionGateResult, { kind: "rejected" }> {
  return { kind: "rejected", code, diagnostic };
}
