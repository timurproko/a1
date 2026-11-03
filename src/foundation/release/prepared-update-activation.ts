import { resolve } from "node:path";
import { PRODUCT_IDENTITY } from "../../product-identity.js";
import { assertContinuityOrBlock, type UpdateActivationCallbacks, type UpdateActivationRequest } from "./update-activation.js";
import { ensureSupervisor } from "./bootstrap.js";
import { CohortStateStore } from "./cohort-state.js";
import { resolveProductPaths } from "../lifecycle/index.js";
import { readCertifiedReleaseManifest } from "./release-store.js";

/** Retry only the selection boundary for an exact candidate already materialized and certified. */
export async function activatePreparedRelease(
  request: Omit<UpdateActivationRequest, "packageRoot">,
  callbacks: UpdateActivationCallbacks,
): Promise<void> {
  const stateStore = new CohortStateStore(request.dataDir);
  const state = await stateStore.read();
  const releaseId = state.references.pending;
  const record = releaseId === null ? undefined : state.releases[releaseId];
  if (record === undefined || record.approval !== "approved" || record.packageVersion !== request.targetVersion
    || state.references.approved !== releaseId) {
    throw new Error(`no certified prepared release matches target ${request.targetVersion}`);
  }
  const candidate = await readCertifiedReleaseManifest(record, resolve(request.dataDir, "releases"));
  const paths = resolveProductPaths(request.environment);
  const continuity = { releaseRoot: candidate.releaseRoot, dataDir: request.dataDir, environment: request.environment,
    profileRoot: request.environment[PRODUCT_IDENTITY.environment.profileHome] ?? paths.configDir, runtimeDir: paths.runtimeDir };
  await assertContinuityOrBlock(continuity);
  await ensureSupervisor(candidate, request.environment);
  await assertContinuityOrBlock(continuity);
  await stateStore.activate(candidate.releaseId);
  await callbacks.phase("active-reference-committed");
}
