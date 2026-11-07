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

