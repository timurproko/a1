import { readdir, readFile, rm } from "node:fs/promises";
import { connect } from "node:net";
import { platform } from "node:os";
import { resolve } from "node:path";
import { PRODUCT_IDENTITY } from "../../product-identity.js";
import { encodeFrame, LineFrameDecoder } from "../protocol/index.js";
import type { OwnershipProbe } from "./cohort-selection.js";
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

export async function readEndpointMetadata(path: string): Promise<SupervisorEndpointMetadata | null> {
  try {
    const value = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
    const ownership = value.ownership as Record<string, unknown> | undefined;
    const liveInstanceIds = Array.isArray(ownership?.liveInstanceIds)
      ? ownership.liveInstanceIds
      : Array.isArray(ownership?.liveGenerationIds) ? ownership.liveGenerationIds : null;
    const nonResumableInstanceIds = Array.isArray(ownership?.nonResumableInstanceIds)
      ? ownership.nonResumableInstanceIds
      : Array.isArray(ownership?.nonResumableGenerationIds) ? ownership.nonResumableGenerationIds : null;
    const uncertainInstanceIds = Array.isArray(ownership?.uncertainInstanceIds) ? ownership.uncertainInstanceIds : [];
    if (!value || value.schema !== PRODUCT_IDENTITY.protocol.supervisorSchema || typeof value.supervisorId !== "string" || typeof value.endpoint !== "string" || !Number.isSafeInteger(value.pid)
      || typeof value.pidStartIdentity !== "string" || typeof value.bootNonce !== "string" || typeof value.releaseId !== "string"
      || typeof value.releaseRoot !== "string" || typeof value.contentDigest !== "string" || !ownership
      || !isStringArray(liveInstanceIds) || !isStringArray(nonResumableInstanceIds) || !isStringArray(uncertainInstanceIds)) {
      return null;
    }
    return {
      ...value,
      ownership: {
        ...ownership,
        liveInstanceIds,
        nonResumableInstanceIds,
        uncertainInstanceIds,
      },
    } as unknown as SupervisorEndpointMetadata;
  } catch {
    return null;
  }
}

export async function probeOwnership(metadata: SupervisorEndpointMetadata): Promise<OwnershipProbe> {
  if (!processIsAlive(metadata.pid)) return "dead";
  const identity = await requestIdentity(metadata.endpoint, 500);
  if (!identity) return "unresponsive";
  return identity.supervisorId === metadata.supervisorId
    && identity.bootNonce === metadata.bootNonce
    && identity.pidStartIdentity === metadata.pidStartIdentity
    && identity.releaseId === metadata.releaseId
    ? "live-verified"
    : "identity-mismatch";
}

async function requestIdentity(endpoint: string, timeoutMs: number): Promise<{ supervisorId: string; bootNonce: string; pidStartIdentity: string; releaseId: string } | null> {
  return await new Promise(resolvePromise => {
    const socket = connect(endpoint);
    const decoder = new LineFrameDecoder();
    let settled = false;
    const finish = (value: { supervisorId: string; bootNonce: string; pidStartIdentity: string; releaseId: string } | null) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolvePromise(value);
    };
    socket.once("error", () => finish(null));
    socket.once("connect", () => socket.write(encodeFrame({ type: "identity-probe" })));
    socket.on("data", chunk => {
      try {
        const message = decoder.push(chunk)[0] as Record<string, unknown> | undefined;
        if (message?.type === "identity" && typeof message.supervisorId === "string" && typeof message.bootNonce === "string"
          && typeof message.pidStartIdentity === "string" && typeof message.releaseId === "string") {
          finish({ supervisorId: message.supervisorId, bootNonce: message.bootNonce, pidStartIdentity: message.pidStartIdentity, releaseId: message.releaseId });
        }
      } catch { finish(null); }
    });
    setTimeout(() => finish(null), timeoutMs).unref();
  });
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === "string" && item.length > 0);
}

export async function removeEndpointArtifacts(metadataPath: string, endpoint: string): Promise<void> {
  await rm(metadataPath, { force: true });
  if (platform() !== "win32") await rm(endpoint, { force: true });
}
