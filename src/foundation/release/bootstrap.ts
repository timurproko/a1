import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { connect } from "node:net";
import { platform } from "node:os";
import { resolve } from "node:path";
import { selectCohortLaunch, type OwnershipProbe } from "./cohort-selection.js";
import { CohortStateStore, type SupervisorEndpointMetadata } from "./cohort-state.js";
import { assertLaunchProfileId, resolveCohortEndpoint, resolveProductPaths, type LaunchProfileId } from "../lifecycle/index.js";
import { encodeFrame, LineFrameDecoder } from "../protocol/index.js";
import { cleanupProvenIdleOwner, processIsAlive } from "./process-cleanup.js";
import { sweepDeadEndpoints } from "./endpoints.js";
import { consumeMaterializationProof, materializeRelease, readCertifiedReleaseManifest, readMaterializedRelease, resolveReleaseEntryPoint, verifyMaterializedRelease, type MaterializedRelease, type VerifyMaterializedReleaseOptions } from "./release-store.js";
import { PRODUCT_IDENTITY, PRODUCT_TEXT } from "../../product-identity.js";

export interface BootstrapOptions {
  readonly packageRoot: string;
  readonly launchIntent?: { readonly kind: "interactive"; readonly profileId: LaunchProfileId };
  readonly environment?: NodeJS.ProcessEnv;
  readonly output?: Pick<NodeJS.WriteStream, "write">;
  /**
   * Whether a materialized release copy is fit to launch. The active release
   * is normally reused while its version matches the installation, but a copy
   * can be broken in ways a version cannot see — materialized from a tree a
   * blocked postinstall never finished repairing. The probe is injected from
   * the bin entry because deciding it requires inspecting dependency
   * resolution, which stays out of production code. Absent means every
   * release is fit.
   */
  readonly releaseIsLaunchable?: (releaseRoot: string) => boolean;
}

export async function runBootstrap(options: BootstrapOptions): Promise<number> {
  const environment = { ...(options.environment ?? process.env) };
  const launchProfileId = options.launchIntent?.profileId ?? "a1";
  assertLaunchProfileId(launchProfileId);
  environment[PRODUCT_IDENTITY.environment.launchProfile] = launchProfileId;
  const output = options.output ?? process.stderr;
  const paths = resolveProductPaths(environment);
  await mkdir(paths.runtimeDir, { recursive: true, mode: 0o700 });

  const stateStore = new CohortStateStore(paths.dataDir);
  let state = await stateStore.read();
  // Records left by cohorts whose processes are gone say nothing about ownership, and there
  // can now be several of them. Clearing them first keeps the decision below about what is
  // actually running.
  await sweepDeadEndpoints(paths).catch(() => []);
  // Each cohort keeps its own endpoint, so a launch looks for the endpoint of the release it
  // is about to run rather than for the one endpoint the runtime directory used to have.
  const activeReleaseId = state.references.active;
  let endpointPaths = activeReleaseId === null
    ? { endpoint: paths.endpoint, endpointMetadataPath: paths.endpointMetadataPath }
    : resolveCohortEndpoint(paths, activeReleaseId, environment);
  let endpoint = await readEndpointMetadata(endpointPaths.endpointMetadataPath);
  if (endpoint === null) {
    // A release that predates cohort-scoped endpoints published one endpoint for the whole
    // runtime directory. Recognizing it is what lets a session started by that release keep
    // working through the first launch that knows about cohorts.
    const legacy = await readEndpointMetadata(paths.endpointMetadataPath);
    if (legacy !== null) {
      endpoint = legacy;
      endpointPaths = { endpoint: paths.endpoint, endpointMetadataPath: paths.endpointMetadataPath };
    }
  }
  let probe = endpoint ? await probeOwnership(endpoint) : "dead";
  const installedVersion = await readInstalledVersion(options.packageRoot);
  const activeId = state.references.active;
  const active = activeId === null ? undefined : state.releases[activeId];
  const activeIsLaunchable = active === undefined || (options.releaseIsLaunchable?.(active.releaseRoot) ?? true);
  if (activeIsLaunchable && active?.approval === "approved" && active.packageVersion === installedVersion) {
    const endpointMatches = endpoint?.releaseId === active.releaseId
      && endpoint.releaseRoot === active.releaseRoot
      && endpoint.contentDigest === active.contentDigest;
    if (endpointMatches && probe === "live-verified") {
      const retained = await readCertifiedReleaseManifest(active, resolve(paths.dataDir, "releases"));
      return await launchUi(retained, environment);
    }
    if (endpoint === null || probe === "dead") {
      if (endpoint) await removeEndpointArtifacts(endpointPaths.endpointMetadataPath, endpointPaths.endpoint);
      const retained = await readMaterializedRelease(active.releaseRoot);
      const retainedPaths = resolveCohortEndpoint(paths, retained.releaseId, environment);
      await startSupervisor(retained, environment);
      await waitForVerifiedEndpoint(retainedPaths.endpointMetadataPath, retained, 8_000);
      return await launchUi(retained, environment);
    }
  }

  const candidate = await materializeRelease(options.packageRoot, paths.dataDir);
  await stateStore.recordCandidate(candidate);
  state = await stateStore.read();
  if (!state.references.active) {
    const diagnosticsPath = await certifyMaterializedRelease(candidate, paths.dataDir);
    await stateStore.approve(candidate.releaseId, diagnosticsPath);
    await stateStore.activate(candidate.releaseId);
    state = await stateStore.read();
  } else if (!activeIsLaunchable && candidate.releaseId !== activeId
    && state.releases[candidate.releaseId]?.approval !== "approved") {
    // The active reference points at a copy that cannot launch, so reusing it
    // is off the table — but an unapproved candidate would lose the selection
    // below to that same broken active (`start-active`). Approving the healed
    // candidate here lets ordinary cohort selection activate it, while a live
    // busy cohort still wins the endpoint checks and keeps its sessions.
    const diagnosticsPath = await certifyMaterializedRelease(candidate, paths.dataDir);
    await stateStore.approve(candidate.releaseId, diagnosticsPath);
    state = await stateStore.read();
  }

  // The candidate's own endpoint decides whether this launch attaches or starts a supervisor.
  // A cohort other than this one is not in the way: it listens somewhere else.
  endpointPaths = resolveCohortEndpoint(paths, candidate.releaseId, environment);
  endpoint = await readEndpointMetadata(endpointPaths.endpointMetadataPath);
  if (endpoint === null) {
    const legacy = await readEndpointMetadata(paths.endpointMetadataPath);
    if (legacy !== null) {
      endpoint = legacy;
      endpointPaths = { endpoint: paths.endpoint, endpointMetadataPath: paths.endpointMetadataPath };
    }
  }
  probe = endpoint ? await probeOwnership(endpoint) : "dead";
  let decision = selectCohortLaunch(candidate, state, endpoint, probe);

  if (decision.action === "blocked") {
    await stateStore.blockPending(decision.reason, endpoint?.ownership.liveInstanceIds ?? []);
    output.write(`${PRODUCT_TEXT.diagnostic(`startup is blocked to preserve uncertain live ownership: ${decision.reason}`)}\n`);
    return 1;
  }

  if (decision.action === "clean-stale-owner" && endpoint) {
    const diagnostics = await cleanupProvenIdleOwner(endpoint);
    await writeFile(resolve(paths.dataDir, `cleanup-${Date.now()}.json`), JSON.stringify(diagnostics, null, 2));
    if (!diagnostics.terminated) throw new Error(`could not safely clean stale ${PRODUCT_TEXT.displayName} supervisor ${endpoint.pid}`);
    await removeEndpointArtifacts(endpointPaths.endpointMetadataPath, endpointPaths.endpoint);
    decision = selectCohortLaunch(candidate, await stateStore.read(), null, "dead");
  } else if (endpoint && probe === "dead") {
    await removeEndpointArtifacts(endpointPaths.endpointMetadataPath, endpointPaths.endpoint);
  }

  if (decision.action === "launch-retained-ui") {
    const retained = await verifyMaterializedRelease(decision.releaseRoot, undefined, resolve(paths.dataDir, "releases"));
    if (decision.recordPending && endpoint) {
      await stateStore.blockPending("candidate activation deferred by live non-resumable instances", endpoint.ownership.nonResumableInstanceIds);
    }
    const code = await launchUi(retained, environment);
    if (decision.recordPending) await activatePendingAfterBlockerExit(candidate, stateStore, paths, environment);
    return code;
  }

  if (decision.action === "replace-idle-cohort" && endpoint) {
    const diagnosticsPath = await certifyMaterializedRelease(candidate, paths.dataDir);
    await stateStore.approve(candidate.releaseId, diagnosticsPath);
    const released = await requestIdleOwnershipRelease(endpoint, candidate.releaseId, 2_000);
    if (!released) {
      await stateStore.blockPending("idle supervisor did not verify ownership release", endpoint.ownership.liveInstanceIds);
      output.write(`${PRODUCT_TEXT.diagnostic("could not verify idle cohort ownership release; the retained release remains selected.")}\n`);
      return 1;
    }
    if (!await releaseVerifiedIdleOwner(endpoint, paths.dataDir)) {
      await stateStore.blockPending("idle supervisor acknowledged release but did not terminate", endpoint.ownership.liveInstanceIds);
      output.write(`${PRODUCT_TEXT.diagnostic("could not complete bounded idle cohort shutdown; the candidate remains pending.")}\n`);
      return 1;
    }
    await removeEndpointArtifacts(endpointPaths.endpointMetadataPath, endpointPaths.endpoint);
    await stateStore.activate(candidate.releaseId);
    decision = { action: "activate-candidate", releaseId: candidate.releaseId, releaseRoot: candidate.releaseRoot, reason: "idle cohort released ownership" };
  }

  let selected: MaterializedRelease;
  if (decision.action === "activate-candidate") {
    const current = await stateStore.read();
    if (current.releases[candidate.releaseId]?.approval !== "approved") {
      const diagnosticsPath = await certifyMaterializedRelease(candidate, paths.dataDir);
      await stateStore.approve(candidate.releaseId, diagnosticsPath);
    }
    if ((await stateStore.read()).references.active !== candidate.releaseId) await stateStore.activate(candidate.releaseId);
    selected = candidate;
  } else {
    selected = await readMaterializedRelease(decision.releaseRoot);
  }

  await startSupervisor(selected, environment);
  await waitForVerifiedEndpoint(resolveCohortEndpoint(paths, selected.releaseId, environment).endpointMetadataPath, selected, 8_000);
  return await launchUi(selected, environment);
}

async function readInstalledVersion(packageRoot: string): Promise<string> {
  const manifest = JSON.parse(await readFile(resolve(packageRoot, "package.json"), "utf8")) as { version?: unknown };
  if (typeof manifest.version !== "string" || manifest.version.length === 0) {
    throw new Error(PRODUCT_TEXT.diagnostic("package metadata has no version"));
  }
  return manifest.version;
}

export async function certifyMaterializedRelease(
  release: MaterializedRelease,
  dataDir: string,
  verification: VerifyMaterializedReleaseOptions = {},
): Promise<string> {
  if (!consumeMaterializationProof(release)) {
    await verifyMaterializedRelease(release.releaseRoot, release, resolve(dataDir, "releases"), verification);
  }
  const path = resolve(dataDir, `certification-${release.releaseId}.json`);
  await writeFile(path, JSON.stringify({
    schema: PRODUCT_IDENTITY.evidence.releaseCertificationSchema,
    releaseId: release.releaseId,
    contentDigest: release.contentDigest,
    verifiedAt: new Date().toISOString(),
    checks: [{ id: "immutable-content", passed: true }],
  }, null, 2), { mode: 0o600 });
  return path;
}

export async function startSupervisor(release: MaterializedRelease, environment: NodeJS.ProcessEnv): Promise<void> {
  const entry = await resolveReleaseEntryPoint(release, "bin/supervisor.js");
  const child = spawn(process.execPath, [entry], {
    detached: true,
    env: releaseEnvironment(environment, release),
    stdio: "ignore",
    windowsHide: true,
  });
  await new Promise<void>((resolvePromise, rejectPromise) => {
    child.once("spawn", resolvePromise);
    child.once("error", rejectPromise);
  });
  child.unref();
}

async function launchUi(release: MaterializedRelease, environment: NodeJS.ProcessEnv): Promise<number> {
  const entry = await resolveReleaseEntryPoint(release, "bin/guardian.js");
  return await new Promise<number>((resolvePromise, rejectPromise) => {
    const child = spawn(process.execPath, [entry], {
      env: releaseEnvironment(environment, release),
      stdio: "inherit",
      windowsHide: false,
    });
    child.once("error", rejectPromise);
    child.once("close", (code, signal) => resolvePromise(code ?? (signal ? 1 : 0)));
  });
}

export function releaseEnvironment(environment: NodeJS.ProcessEnv, release: MaterializedRelease): NodeJS.ProcessEnv {
  return {
    ...environment,
    [PRODUCT_IDENTITY.environment.releaseId]: release.releaseId,
    [PRODUCT_IDENTITY.environment.releaseRoot]: release.releaseRoot,
    [PRODUCT_IDENTITY.environment.releaseDigest]: release.contentDigest,
  };
}

export async function waitForVerifiedEndpoint(path: string, release: MaterializedRelease, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const metadata = await readEndpointMetadata(path);
    if (metadata && metadata.releaseId === release.releaseId && await probeOwnership(metadata) === "live-verified") return;
    await new Promise(resolvePromise => setTimeout(resolvePromise, 40));
  }
  throw new Error(PRODUCT_TEXT.diagnostic(`supervisor did not publish verified endpoint metadata within ${timeoutMs}ms`));
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

async function activatePendingAfterBlockerExit(
  candidate: MaterializedRelease,
  stateStore: CohortStateStore,
  paths: ReturnType<typeof resolveProductPaths>,
  environment: NodeJS.ProcessEnv,
): Promise<void> {
  const deadline = Date.now() + 2_000;
  let endpoint: SupervisorEndpointMetadata | null = null;
  while (Date.now() < deadline) {
    endpoint = await readEndpointMetadata(paths.endpointMetadataPath);
    if (!endpoint || endpoint.ownership.liveInstanceIds.length === 0) break;
    await new Promise(resolvePromise => setTimeout(resolvePromise, 40));
  }
  if (!endpoint || endpoint.ownership.liveInstanceIds.length > 0 || await probeOwnership(endpoint) !== "live-verified") return;
  const diagnosticsPath = await certifyMaterializedRelease(candidate, paths.dataDir);
  await stateStore.approve(candidate.releaseId, diagnosticsPath);
  if (!await requestIdleOwnershipRelease(endpoint, candidate.releaseId, 2_000)) return;
  if (!await releaseVerifiedIdleOwner(endpoint, paths.dataDir)) return;
  await removeEndpointArtifacts(paths.endpointMetadataPath, paths.endpoint);
  await stateStore.activate(candidate.releaseId);
  await startSupervisor(candidate, environment);
  await waitForVerifiedEndpoint(resolveCohortEndpoint(paths, candidate.releaseId, environment).endpointMetadataPath, candidate, 8_000);
}

export async function releaseVerifiedIdleOwner(
  metadata: SupervisorEndpointMetadata,
  dataDir: string,
  operations: {
    readonly waitForExit?: typeof waitForProcessExit;
    readonly cleanup?: typeof cleanupProvenIdleOwner;
  } = {},
): Promise<boolean> {
  try {
    await (operations.waitForExit ?? waitForProcessExit)(metadata.pid, 3_000);
    return true;
  } catch {
    // The authenticated idle-release handshake authorizes bounded cleanup of
    // this exact boot when a native handle outlives graceful shutdown.
    const diagnostics = await (operations.cleanup ?? cleanupProvenIdleOwner)(metadata);
    await writeFile(resolve(dataDir, `cleanup-${Date.now()}.json`), JSON.stringify(diagnostics, null, 2));
    return diagnostics.terminated;
  }
}

async function requestIdleOwnershipRelease(metadata: SupervisorEndpointMetadata, candidateReleaseId: string, timeoutMs: number): Promise<boolean> {
  return await new Promise(resolvePromise => {
    const socket = connect(metadata.endpoint);
    const decoder = new LineFrameDecoder();
    let settled = false;
    const finish = (released: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolvePromise(released);
    };
    socket.once("error", () => finish(false));
    socket.once("connect", () => socket.write(encodeFrame({ type: "release-idle-ownership", bootNonce: metadata.bootNonce, candidateReleaseId })));
    socket.on("data", chunk => {
      try {
        const message = decoder.push(chunk)[0] as Record<string, unknown> | undefined;
        if (message?.type === "release-ownership-result") finish(message.released === true);
      } catch { finish(false); }
    });
    setTimeout(() => finish(false), timeoutMs).unref();
  });
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === "string" && item.length > 0);
}

export async function waitForProcessExit(pid: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!processIsAlive(pid)) return;
    await new Promise(resolvePromise => setTimeout(resolvePromise, 25));
  }
  throw new Error(PRODUCT_TEXT.diagnostic(`supervisor ${pid} did not release process ownership within ${timeoutMs}ms`));
}

export async function removeEndpointArtifacts(metadataPath: string, endpoint: string): Promise<void> {
  await rm(metadataPath, { force: true });
  if (platform() !== "win32") await rm(endpoint, { force: true });
}
