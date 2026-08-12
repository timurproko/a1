import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { connect } from "node:net";
import { platform } from "node:os";
import { resolve } from "node:path";
import { selectCohortLaunch, type OwnershipProbe } from "./cohort-selection.js";
import { CohortStateStore, type SupervisorEndpointMetadata } from "./cohort-state.js";
import { resolveAddOnePaths } from "./paths.js";
import { cleanupProvenIdleOwner, processIsAlive } from "./process-cleanup.js";
import { encodeFrame, LineFrameDecoder } from "./protocol/messages.js";
import { materializeRelease, readMaterializedRelease, resolveReleaseEntryPoint, verifyMaterializedRelease, type MaterializedRelease } from "./release-store.js";

export interface BootstrapOptions {
  readonly packageRoot: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly output?: Pick<NodeJS.WriteStream, "write">;
}

export async function runBootstrap(options: BootstrapOptions): Promise<number> {
  const environment = { ...(options.environment ?? process.env) };
  const output = options.output ?? process.stderr;
  const paths = resolveAddOnePaths(environment);
  await mkdir(paths.runtimeDir, { recursive: true, mode: 0o700 });

  const candidate = await materializeRelease(options.packageRoot, paths.dataDir);
  const stateStore = new CohortStateStore(paths.dataDir);
  await stateStore.recordCandidate(candidate);
  let state = await stateStore.read();
  if (!state.references.active) {
    const diagnosticsPath = await certifyMaterializedRelease(candidate, paths.dataDir);
    await stateStore.approve(candidate.releaseId, diagnosticsPath);
    await stateStore.activate(candidate.releaseId);
    state = await stateStore.read();
  }

  const endpoint = await readEndpointMetadata(paths.endpointMetadataPath);
  const probe = endpoint ? await probeOwnership(endpoint) : "dead";
  let decision = selectCohortLaunch(candidate, state, endpoint, probe);

  if (decision.action === "blocked") {
    await stateStore.blockPending(decision.reason, endpoint?.ownership.liveGenerationIds ?? []);
    output.write(`AddOne startup is blocked to preserve uncertain live ownership: ${decision.reason}\n`);
    return 1;
  }

  if (decision.action === "clean-stale-owner" && endpoint) {
    const diagnostics = await cleanupProvenIdleOwner(endpoint);
    await writeFile(resolve(paths.dataDir, `cleanup-${Date.now()}.json`), JSON.stringify(diagnostics, null, 2));
    if (!diagnostics.terminated) throw new Error(`could not safely clean stale AddOne supervisor ${endpoint.pid}`);
    await removeEndpointArtifacts(paths.endpointMetadataPath, paths.endpoint);
    decision = selectCohortLaunch(candidate, await stateStore.read(), null, "dead");
  } else if (endpoint && probe === "dead") {
    await removeEndpointArtifacts(paths.endpointMetadataPath, paths.endpoint);
  }

  if (decision.action === "launch-retained-ui") {
    const retained = await verifyMaterializedRelease(decision.releaseRoot, undefined, resolve(paths.dataDir, "releases"));
    if (decision.recordPending && endpoint) {
      await stateStore.blockPending("candidate activation deferred by live non-resumable generations", endpoint.ownership.nonResumableGenerationIds);
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
      await stateStore.blockPending("idle supervisor did not verify ownership release", endpoint.ownership.liveGenerationIds);
      output.write("AddOne could not verify idle cohort ownership release; the retained release remains selected.\n");
      return 1;
    }
    if (!await releaseVerifiedIdleOwner(endpoint, paths.dataDir)) {
      await stateStore.blockPending("idle supervisor acknowledged release but did not terminate", endpoint.ownership.liveGenerationIds);
      output.write("AddOne could not complete bounded idle cohort shutdown; the candidate remains pending.\n");
      return 1;
    }
    await removeEndpointArtifacts(paths.endpointMetadataPath, paths.endpoint);
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
  await waitForVerifiedEndpoint(paths.endpointMetadataPath, selected, 8_000);
  return await launchUi(selected, environment);
}

export async function certifyMaterializedRelease(release: MaterializedRelease, dataDir: string): Promise<string> {
  await verifyMaterializedRelease(release.releaseRoot, release, resolve(dataDir, "releases"));
  const path = resolve(dataDir, `certification-${release.releaseId}.json`);
  await writeFile(path, JSON.stringify({
    releaseId: release.releaseId,
    contentDigest: release.contentDigest,
    verifiedAt: new Date().toISOString(),
    checks: [{ id: "immutable-content", passed: true }],
  }, null, 2), { mode: 0o600 });
  return path;
}

export async function startSupervisor(release: MaterializedRelease, environment: NodeJS.ProcessEnv): Promise<void> {
  const entry = await resolveReleaseEntryPoint(release, "bin/addone-supervisor.js");
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
  const entry = await resolveReleaseEntryPoint(release, "bin/addone-ui.js");
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
    ADDONE_RELEASE_ID: release.releaseId,
    ADDONE_RELEASE_ROOT: release.releaseRoot,
    ADDONE_RELEASE_DIGEST: release.contentDigest,
  };
}

export async function waitForVerifiedEndpoint(path: string, release: MaterializedRelease, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const metadata = await readEndpointMetadata(path);
    if (metadata && metadata.releaseId === release.releaseId && await probeOwnership(metadata) === "live-verified") return;
    await new Promise(resolvePromise => setTimeout(resolvePromise, 40));
  }
  throw new Error(`AddOne supervisor did not publish verified endpoint metadata within ${timeoutMs}ms`);
}

export async function readEndpointMetadata(path: string): Promise<SupervisorEndpointMetadata | null> {
  try {
    const value = JSON.parse(await readFile(path, "utf8")) as SupervisorEndpointMetadata;
    if (!value || typeof value.supervisorId !== "string" || typeof value.endpoint !== "string" || !Number.isSafeInteger(value.pid)
      || typeof value.pidStartIdentity !== "string" || typeof value.bootNonce !== "string" || typeof value.releaseId !== "string"
      || typeof value.releaseRoot !== "string" || typeof value.contentDigest !== "string" || !value.ownership
      || !Array.isArray(value.ownership.liveGenerationIds) || !Array.isArray(value.ownership.nonResumableGenerationIds)) {
      return null;
    }
    return value;
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
  paths: ReturnType<typeof resolveAddOnePaths>,
  environment: NodeJS.ProcessEnv,
): Promise<void> {
  const deadline = Date.now() + 2_000;
  let endpoint: SupervisorEndpointMetadata | null = null;
  while (Date.now() < deadline) {
    endpoint = await readEndpointMetadata(paths.endpointMetadataPath);
    if (!endpoint || endpoint.ownership.liveGenerationIds.length === 0) break;
    await new Promise(resolvePromise => setTimeout(resolvePromise, 40));
  }
  if (!endpoint || endpoint.ownership.liveGenerationIds.length > 0 || await probeOwnership(endpoint) !== "live-verified") return;
  const diagnosticsPath = await certifyMaterializedRelease(candidate, paths.dataDir);
  await stateStore.approve(candidate.releaseId, diagnosticsPath);
  if (!await requestIdleOwnershipRelease(endpoint, candidate.releaseId, 2_000)) return;
  if (!await releaseVerifiedIdleOwner(endpoint, paths.dataDir)) return;
  await removeEndpointArtifacts(paths.endpointMetadataPath, paths.endpoint);
  await stateStore.activate(candidate.releaseId);
  await startSupervisor(candidate, environment);
  await waitForVerifiedEndpoint(paths.endpointMetadataPath, candidate, 8_000);
}

async function releaseVerifiedIdleOwner(metadata: SupervisorEndpointMetadata, dataDir: string): Promise<boolean> {
  try {
    await waitForProcessExit(metadata.pid, 3_000);
    return true;
  } catch {
    // The release handshake authenticated this exact boot and confirmed it had
    // no live handles. If a native/platform handle keeps the dedicated process
    // alive, finish the already-authorized idle cleanup through the same bounded
    // ownership-safe path used for an unresponsive stale owner.
    const diagnostics = await cleanupProvenIdleOwner(metadata);
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

export async function waitForProcessExit(pid: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!processIsAlive(pid)) return;
    await new Promise(resolvePromise => setTimeout(resolvePromise, 25));
  }
  throw new Error(`AddOne supervisor ${pid} did not release process ownership within ${timeoutMs}ms`);
}

export async function removeEndpointArtifacts(metadataPath: string, endpoint: string): Promise<void> {
  await rm(metadataPath, { force: true });
  if (platform() !== "win32") await rm(endpoint, { force: true });
}
