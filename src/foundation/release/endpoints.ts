import { readdir, readFile, rm } from "node:fs/promises";
import { connect } from "node:net";
import { resolve } from "node:path";
import { PRODUCT_IDENTITY } from "../../product-identity.js";
import { encodeFrame, LineFrameDecoder } from "../protocol/index.js";
import type { OwnershipProbe } from "./cohort-selection.js";
import { supervisorProcessState, type ObserveSupervisorProcess } from "./supervisor-identity.js";
import { withEndpointLock } from "./endpoint-lock.js";
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
  // Compatibility: a cohort listener passes its scoped paths here; legacy discovery still
  // names the runtime directory's fixed metadata path, not that listener's own record.
  const legacyPath = resolve(paths.runtimeDir, PRODUCT_IDENTITY.endpoint.metadataFilename);
  const legacy = await readEndpointMetadata(legacyPath);
  if (legacy) {
    recorded.push({ metadata: legacy, paths: { endpoint: legacy.endpoint, endpointMetadataPath: legacyPath } });
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
    if (await supervisorProcessState(recorded.metadata) !== "gone") continue;
    if (await removeEndpointArtifacts(recorded.paths.endpointMetadataPath, recorded.paths.endpoint, recorded.metadata)) {
      swept.push(recorded.metadata.releaseId);
    }
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

export interface OwnershipProbeOptions {
  readonly observe?: ObserveSupervisorProcess;
  readonly attempts?: number;
  readonly timeoutMs?: number;
}

/** Reprobe transient failures; only native absence or a replaced generation establishes death. */
export async function probeOwnership(metadata: SupervisorEndpointMetadata, options: OwnershipProbeOptions = {}): Promise<OwnershipProbe> {
  const attempts = options.attempts ?? 3;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const identity = await requestIdentity(metadata.endpoint, options.timeoutMs ?? 500);
    if (identity) {
      return identity.supervisorId === metadata.supervisorId
        && identity.bootNonce === metadata.bootNonce
        && identity.pidStartIdentity === metadata.pidStartIdentity
        && identity.releaseId === metadata.releaseId
        ? "live-verified" : "identity-mismatch";
    }
    if (await supervisorProcessState(metadata, options.observe) === "gone") return "dead";
    if (attempt + 1 < attempts) await new Promise(resolvePromise => setTimeout(resolvePromise, 50));
  }
  return "unresponsive";
}

async function requestIdentity(endpoint: string, timeoutMs: number): Promise<{ supervisorId: string; bootNonce: string; pidStartIdentity: string; releaseId: string } | null> {
  return await new Promise(resolvePromise => {
    const socket = connect(endpoint);
    const decoder = new LineFrameDecoder();
    let settled = false;
    const finish = (value: { supervisorId: string; bootNonce: string; pidStartIdentity: string; releaseId: string } | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
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
    const timer = setTimeout(() => finish(null), timeoutMs);
  });
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === "string" && item.length > 0);
}

/** Retire only a still-dead exact publication. Socket removal belongs to the gated listener. */
export async function removeEndpointArtifacts(
  metadataPath: string,
  endpoint: string,
  expected: SupervisorEndpointMetadata,
): Promise<boolean> {
  return await withEndpointLock(metadataPath, async () => {
    const current = await readEndpointMetadata(metadataPath);
    if (!current || current.endpoint !== endpoint || JSON.stringify(current) !== JSON.stringify(expected)) return false;
    if (await supervisorProcessState(current) !== "gone" || await probeOwnership(current, { attempts: 1 }) !== "dead") return false;
    await rm(metadataPath, { force: true });
    return true;
  });
}
