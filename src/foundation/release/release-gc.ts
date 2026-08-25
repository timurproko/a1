import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { CohortStateStore } from "./cohort-state.js";
import { liveReleaseIds } from "./endpoints.js";
import type { ProductPaths } from "../lifecycle/index.js";
import { verifyMaterializedRelease } from "./release-store.js";

/** Remove only a release that has no active, pending, approval, rollback,
 * retention, process, agent, or migration reference. State is detached first;
 * a filesystem failure can leave a safe orphan but never a dangling selector. */
export async function collectRelease(
  store: CohortStateStore,
  dataDir: string,
  releaseId: string,
  externalReferences: readonly string[],
  /** Where endpoints are recorded, so a release a live cohort runs from is retained. */
  paths?: ProductPaths,
): Promise<void> {
  const state = await store.read();
  const release = state.releases[releaseId];
  if (!release) throw new Error(`unknown release ${releaseId}`);
  // A superseded cohort keeps working until its last session leaves, and it runs from this
  // content while it does. Collecting it would pull the release out from under live work.
  if (paths && (await liveReleaseIds(paths)).includes(releaseId)) {
    throw new Error(`release ${releaseId} is still running a live cohort`);
  }
  await verifyMaterializedRelease(release.releaseRoot, undefined, resolve(dataDir, "releases"));
  await store.removeUnreferencedRelease(releaseId, externalReferences);
  await rm(release.releaseRoot, { recursive: true, force: false });
}
