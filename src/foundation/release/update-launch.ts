import type { CohortState, ReleaseRecord } from "./cohort-state.js";
import type { UpdateTransaction } from "./update-transaction.js";

/** Keep interactive launches on the last successful release until the update commits success. */
export function selectUpdateLaunchRelease(state: CohortState, transaction: UpdateTransaction | null): ReleaseRecord | null {
  if (transaction === null || transaction.status === "completed") return null;
  const prior = transaction.priorActiveReleaseId === null ? undefined : state.releases[transaction.priorActiveReleaseId];
  if (!prior || prior.approval !== "approved") {
    throw new Error("unfinished update has no verified previous release available for launch; resume the update");
  }
  return prior;
}

/** Pause cohort retirement during preparation; afterward only the successful launch release admits new sessions. */
export function selectSupervisorLaunchReleaseId(state: CohortState, transaction: UpdateTransaction | null): string | null {
  // Concurrency: both the previous cohort and the warming candidate must remain available until cutover.
  if (transaction?.status === "active") return null;
  return selectUpdateLaunchRelease(state, transaction)?.releaseId ?? state.references.active;
}
