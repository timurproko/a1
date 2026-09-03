import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { probeOwnership, readEndpointMetadata, removeEndpointArtifacts } from "./bootstrap.js";
import { processIsAlive } from "./process-cleanup.js";
import type { SupervisorEndpointMetadata } from "./cohort-state.js";
import type { CohortEndpointPaths, ProductPaths } from "../lifecycle/index.js";

export interface RecordedEndpoint {
  readonly metadata: SupervisorEndpointMetadata;
  readonly paths: CohortEndpointPaths;
}

/**
 * Every endpoint recorded under this runtime directory: one per cohort, plus the single
 * endpoint published by releases that predate cohort-scoped identity. More than one can be
 * live at a time, and each is validated on its own identity rather than by being the only one.
 */
export async function listRecordedEndpoints(paths: ProductPaths): Promise<readonly RecordedEndpoint[]> {
  const recorded: RecordedEndpoint[] = [];
  const legacy = await readEndpointMetadata(paths.endpointMetadataPath);
  if (legacy) {
    recorded.push({ metadata: legacy, paths: { endpoint: paths.endpoint, endpointMetadataPath: paths.endpointMetadataPath } });
  }
  const names = await readdir(paths.endpointsDir).catch(() => [] as string[]);
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const endpointMetadataPath = resolve(paths.endpointsDir, name);
    const metadata = await readEndpointMetadata(endpointMetadataPath);
    if (metadata) recorded.push({ metadata, paths: { endpoint: metadata.endpoint, endpointMetadataPath } });
  }
  return recorded;
}

/**
 * Removes the records of cohorts whose processes are gone. A record left by a cohort that
 * exited without cleaning up is not evidence of ownership, and a later launch should not have
 * to reason about it. Returns the release ids whose records were removed.
 */
export async function sweepDeadEndpoints(paths: ProductPaths): Promise<readonly string[]> {
  const swept: string[] = [];
  for (const recorded of await listRecordedEndpoints(paths)) {
    if (processIsAlive(recorded.metadata.pid)) continue;
    await removeEndpointArtifacts(recorded.paths.endpointMetadataPath, recorded.paths.endpoint);
    swept.push(recorded.metadata.releaseId);
  }
  return swept;
}

/** The releases that an identity-verified live cohort runs from and that must be retained. */
export async function liveReleaseIds(paths: ProductPaths): Promise<readonly string[]> {
  const recorded = await listRecordedEndpoints(paths);
  const ownership = await Promise.all(recorded.map(async endpoint => ({
    releaseId: endpoint.metadata.releaseId,
    probe: await probeOwnership(endpoint.metadata),
  })));
  return [...new Set(ownership.filter(item => item.probe === "live-verified").map(item => item.releaseId))].sort();
}
