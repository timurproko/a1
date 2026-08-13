import type { CohortState, SupervisorEndpointMetadata } from "./cohort-state.js";
import type { MaterializedRelease } from "./release-store.js";

export type OwnershipProbe = "live-verified" | "dead" | "unresponsive" | "identity-mismatch";

export type CohortLaunchDecision =
  | { readonly action: "launch-retained-ui"; readonly releaseId: string; readonly releaseRoot: string; readonly reason: string; readonly recordPending: boolean }
  | { readonly action: "activate-candidate"; readonly releaseId: string; readonly releaseRoot: string; readonly reason: string }
  | { readonly action: "replace-idle-cohort"; readonly releaseId: string; readonly releaseRoot: string; readonly reason: string; readonly pid: number }
  | { readonly action: "start-active"; readonly releaseId: string; readonly releaseRoot: string; readonly reason: string }
  | { readonly action: "clean-stale-owner"; readonly releaseId: string; readonly releaseRoot: string; readonly reason: string; readonly pid: number }
  | { readonly action: "blocked"; readonly releaseId: string; readonly releaseRoot: string; readonly reason: string; readonly pid: number | null };

export function selectCohortLaunch(
  candidate: MaterializedRelease,
  state: CohortState,
  endpoint: SupervisorEndpointMetadata | null,
  probe: OwnershipProbe,
): CohortLaunchDecision {
  if (endpoint && probe === "live-verified") {
    const retained = state.releases[endpoint.releaseId];
    if (!retained || retained.releaseRoot !== endpoint.releaseRoot || retained.contentDigest !== endpoint.contentDigest) {
      return {
        action: "blocked",
        releaseId: endpoint.releaseId,
        releaseRoot: endpoint.releaseRoot,
        reason: "live supervisor identity does not match a retained verified release record",
        pid: endpoint.pid,
      };
    }
    if (endpoint.releaseId !== candidate.releaseId && endpoint.ownership.liveGenerationIds.length === 0) {
      return {
        action: "replace-idle-cohort",
        releaseId: candidate.releaseId,
        releaseRoot: candidate.releaseRoot,
        reason: "older cohort is idle and can release ownership for verified candidate activation",
        pid: endpoint.pid,
      };
    }
    return {
      action: "launch-retained-ui",
      releaseId: endpoint.releaseId,
      releaseRoot: endpoint.releaseRoot,
      reason: endpoint.releaseId === candidate.releaseId
        ? "live supervisor already owns the installed release cohort"
        : "live supervisor owns a non-resumable generation; candidate remains pending",
      recordPending: endpoint.releaseId !== candidate.releaseId,
    };
  }

  if (endpoint && probe === "unresponsive") {
    if (endpoint.ownership.liveGenerationIds.length > 0 || endpoint.ownership.nonResumableGenerationIds.length > 0) {
      return {
        action: "blocked",
        releaseId: endpoint.releaseId,
        releaseRoot: endpoint.releaseRoot,
        reason: "ownership of live generations is uncertain; preserving the unresponsive supervisor",
        pid: endpoint.pid,
      };
    }
    return {
      action: "clean-stale-owner",
      releaseId: candidate.releaseId,
      releaseRoot: candidate.releaseRoot,
      reason: "unresponsive owner has no recorded live generation and is safe for bounded cleanup",
      pid: endpoint.pid,
    };
  }

  if (endpoint && probe === "identity-mismatch") {
    return {
      action: "blocked",
      releaseId: endpoint.releaseId,
      releaseRoot: endpoint.releaseRoot,
      reason: "endpoint handshake, boot nonce, or process start identity did not match durable ownership metadata",
      pid: endpoint.pid,
    };
  }

  const active = state.references.active ? state.releases[state.references.active] : undefined;
  const approvedCandidate = state.releases[candidate.releaseId]?.approval === "approved";
  if (approvedCandidate || !active) {
    return {
      action: "activate-candidate",
      releaseId: candidate.releaseId,
      releaseRoot: candidate.releaseRoot,
      reason: approvedCandidate ? "approved candidate can become the active cohort" : "initial verified release can be certified and activated",
    };
  }
  return {
    action: "start-active",
    releaseId: active.releaseId,
    releaseRoot: active.releaseRoot,
    reason: "candidate is not approved; retaining the active release",
  };
}
