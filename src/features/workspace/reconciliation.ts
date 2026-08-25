import {
  StructuredReconnectionManager,
  type StructuredResumeProof,
} from "../../foundation/structured-agent-runtime/index.js";
import type { AgentRecoveryAuthority } from "../../contracts/workspace/index.js";
import { WorkspaceReducer } from "./reducer.js";
import { WorkspaceStore } from "./store.js";

export interface WorkspaceReconciliationEntry {
  readonly agentId: string;
  readonly outcome: "unchanged" | "ready" | "ended" | "discontinuous";
  readonly code: string | null;
  readonly diagnostic: string;
}

export interface WorkspaceReconciliationReport {
  readonly reconciledAt: string;
  readonly revision: number;
  readonly entries: readonly WorkspaceReconciliationEntry[];
}

export function reconcileWorkspaceRestart(
  reducer: WorkspaceReducer,
  store: WorkspaceStore,
  proofs: ReadonlyMap<string, StructuredResumeProof>,
  reconciledAt = new Date().toISOString(),
): WorkspaceReconciliationReport {
  const entries: WorkspaceReconciliationEntry[] = [];
  for (const agent of reducer.view().agents) {
    if (agent.lifecycle === "stopped" || agent.lifecycle === "failed" || agent.lifecycle === "discontinuous") {
      entries.push(entry(agent.id, "unchanged", null, "agent is already terminal or discontinuous"));
      continue;
    }
    if (!agent.recoveryReferenceId) {
      reducer.markDiscontinuous(agent.id, "missing-recovery-authority", "agent has no durable recovery authority");
      entries.push(entry(agent.id, "discontinuous", "missing-recovery-authority", "agent has no durable recovery authority"));
      continue;
    }
    const reference = store.loadRecoveryReference(agent.recoveryReferenceId);
    if (!reference) {
      reducer.markDiscontinuous(agent.id, "missing-recovery-reference", "recovery reference is absent from the control store");
      entries.push(entry(agent.id, "discontinuous", "missing-recovery-reference", "recovery reference is absent from the control store"));
      continue;
    }
    const authority = reference.authority as AgentRecoveryAuthority;
    if (authority.agentId !== agent.id || authority.kind !== agent.capability.kind) {
      reducer.markDiscontinuous(agent.id, "authority-mismatch", "recovery authority does not match the durable agent identity or runtime");
      persistRecoveryOutcome(store, authority, reference.status, "rejected", reconciledAt, "authority mismatch during workspace restart");
      entries.push(entry(agent.id, "discontinuous", "authority-mismatch", "recovery authority does not match the durable agent identity or runtime"));
      continue;
    }
    if (authority.kind === "composed-terminal") {
      reducer.markDiscontinuous(agent.id, "native-host-unavailable", "native-host recovery is unavailable until its accepted proof capability is enabled");
      persistRecoveryOutcome(store, authority, reference.status, "discontinuous", reconciledAt, "native-host recovery unavailable");
      entries.push(entry(agent.id, "discontinuous", "native-host-unavailable", "native-host recovery is unavailable until its accepted proof capability is enabled"));
      continue;
    }

    const proof = proofs.get(agent.id);
    if (!proof) {
      reducer.markDiscontinuous(agent.id, "missing-resume-proof", "adapter did not provide a resume proof during reconciliation");
      persistRecoveryOutcome(store, authority, reference.status, "discontinuous", reconciledAt, "missing resume proof");
      entries.push(entry(agent.id, "discontinuous", "missing-resume-proof", "adapter did not provide a resume proof during reconciliation"));
      continue;
    }
    if (agent.capability.kind !== "structured") {
      reducer.markDiscontinuous(agent.id, "capability-mismatch", "structured proof cannot recover a non-structured agent");
      persistRecoveryOutcome(store, authority, reference.status, "rejected", reconciledAt, "structured proof capability mismatch");
      entries.push(entry(agent.id, "discontinuous", "capability-mismatch", "structured proof cannot recover a non-structured agent"));
      continue;
    }

    const result = new StructuredReconnectionManager(agent.capability).resume(authority, proof, null);
    if (result.kind === "accepted") {
      reducer.markRecovered(agent.id);
      persistRecoveryOutcome(store, authority, reference.status, "accepted", reconciledAt, "verified ownership and resume boundary");
      entries.push(entry(agent.id, "ready", null, result.diagnostic));
    } else if (result.kind === "terminated") {
      reducer.stopAgent(agent.id);
      persistRecoveryOutcome(store, authority, reference.status, "discontinuous", reconciledAt, result.diagnostic);
      entries.push(entry(agent.id, "ended", "non-reconnectable", result.diagnostic));
    } else {
      reducer.markDiscontinuous(agent.id, result.code, result.diagnostic);
      persistRecoveryOutcome(store, authority, reference.status, "rejected", reconciledAt, result.diagnostic);
      entries.push(entry(agent.id, "discontinuous", result.code, result.diagnostic));
    }
  }
  store.save(reducer);
  return Object.freeze({
    reconciledAt,
    revision: reducer.view().revision,
    entries: Object.freeze(entries),
  });
}

function persistRecoveryOutcome(
  store: WorkspaceStore,
  authority: AgentRecoveryAuthority,
  previousStatus: string,
  status: "pending" | "accepted" | "rejected" | "discontinuous",
  reconciledAt: string,
  reason: string,
): void {
  store.persistRecoveryReference(authority, status, {
    previousStatus,
    reason,
    reconciledAt,
    rollbackToStatus: previousStatus,
  }, reconciledAt);
}

function entry(agentId: string, outcome: WorkspaceReconciliationEntry["outcome"], code: string | null, diagnostic: string): WorkspaceReconciliationEntry {
  return Object.freeze({ agentId, outcome, code, diagnostic });
}
