import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { deliverExitNotice, restoreAfterOwnedExit } from "../terminal-cleanup/index.js";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { selectOrdinaryLaunchReleaseId } from "./ordinary-launch-selection.js";
import { acquireReleaseUse } from "./release-use.js";
import { ReleaseStateStore, type ReleaseState } from "./release-state.js";
import { assertLaunchProfileId, resolveProductPaths, sessionSelectionArguments, type SessionSelection, type LaunchProfileId } from "../lifecycle/index.js";
import { UpdateTransactionStore } from "./update-transaction.js";
import { selectUpdateLaunchRelease } from "./update-launch.js";
import { assertCertifiedFilesPresent, consumeMaterializationProof, materializeRelease, readCertifiedReleaseManifest, readMaterializedRelease, repairMaterializedRelease, resolveReleaseEntryPoint, verifyMaterializedRelease, type CertifiedReleaseRecord, type MaterializedRelease, type VerifyMaterializedReleaseOptions } from "./release-store.js";
import { scheduleReleaseCleanup } from "./release-gc.js";
import { createRestartSeal, readRestartCertifiedRelease, releaseCertificationDocument } from "./restart-certification.js";
import { PRODUCT_IDENTITY, PRODUCT_TEXT } from "../../product-identity.js";
import { markStartupPhase } from "../startup/index.js";
import { interactiveStartupArguments, type InteractiveStartupArguments, launchContractTarget, readLaunchContext, withLaunchContext } from "../launch-context/index.js";

export interface BootstrapOptions {
  readonly packageRoot: string;
  readonly launchIntent?: { readonly kind: "interactive"; readonly profileId: LaunchProfileId; readonly sessionSelection?: SessionSelection } & InteractiveStartupArguments;
  readonly environment?: NodeJS.ProcessEnv;
  readonly output?: Pick<NodeJS.WriteStream, "write">;
  /** Optional package-resolution probe that excludes a damaged retained release. */
  readonly releaseIsLaunchable?: (releaseRoot: string) => boolean;
  /** Test seam for bounded maintenance scheduled before the UI starts. */
  readonly scheduleMaintenance?: (dataDir: string, paths: ReturnType<typeof resolveProductPaths>) => Promise<void>;
}

const RELEASE_RESELECTION_MESSAGE = "a1-release-reselection";

export async function runBootstrap(options: BootstrapOptions): Promise<number> {
  return await runBootstrapAttempt(options, 1);
}

async function runBootstrapAttempt(options: BootstrapOptions, retriesRemaining: number): Promise<number> {
  const launchProfileId = options.launchIntent?.profileId ?? "a1";
  const environment = withLaunchContext(options.environment ?? process.env, { launchProfile: launchProfileId });
  await markStartupPhase(environment, "bootstrap-start");
  assertLaunchProfileId(launchProfileId);
  const sessionArgs = bootstrapArguments(options.launchIntent, launchProfileId);
  const output = options.output ?? process.stderr;
  const paths = resolveProductPaths(environment);
  await mkdir(paths.runtimeDir, { recursive: true, mode: 0o700 });

  const launchSelected = async (release: MaterializedRelease): Promise<number> => {
    await assertStartupPayloadSupport(release, resolve(paths.dataDir, "releases"), options.launchIntent);
    const result = await launchUi(release, environment, sessionArgs, paths.runtimeDir, paths.dataDir);
    if (!result.releaseSuperseded) return result.code;
    if (retriesRemaining > 0) return await runBootstrapAttempt(options, retriesRemaining - 1);
    output.write(`${PRODUCT_TEXT.diagnostic("active release changed repeatedly during startup; launch could not converge")}\n`);
    return 1;
  };
  const stateStore = new ReleaseStateStore(paths.dataDir);
  let state = await stateStore.read();
  const launchDuringUpdate = async (): Promise<number | null> => {
    // Concurrency: read the journal before touching npm's mutable tree, including package.json.
    const transaction = await new UpdateTransactionStore(paths.dataDir).read();
    if (!transaction || transaction.status === "completed") return null;
    const prior = selectUpdateLaunchRelease(await stateStore.read(), transaction);
    if (!prior) return null;
    const retained = await readCertifiedReleaseManifest(prior, resolve(paths.dataDir, "releases"));
    return await launchSelected(retained);
  };
  const duringUpdate = await launchDuringUpdate();
  if (duringUpdate !== null) return duringUpdate;
  // Performance: reconciliation is serialized by the release state lock, but launch never awaits a physical
  // backlog. The scheduler commits a plan and starts a detached bounded worker.
  const scheduleMaintenance = options.scheduleMaintenance ?? scheduleReleaseCleanup;
  void scheduleMaintenance(paths.dataDir, paths).catch(() => {});
  const installedVersion = await readInstalledVersion(options.packageRoot);
  const activeId = state.references.active;
  const active = activeId === null ? undefined : state.releases[activeId];
  let activeIsLaunchable = active === undefined || (options.releaseIsLaunchable?.(active.releaseRoot) ?? true);
  let excludedRetainedReleaseId: string | undefined;
  if (activeIsLaunchable && active?.approval === "approved" && active.packageVersion === installedVersion) {
    try {
      await assertCertifiedFilesPresent(active.releaseRoot);
    } catch {
      try {
        await repairApprovedRelease(options.packageRoot, active, paths.dataDir);
      } catch {
        // Security: a damaged certified release is no longer a fallback when package bytes cannot restore it.
        activeIsLaunchable = false;
        excludedRetainedReleaseId = active.releaseId;
      }
    }
  }
  if (activeIsLaunchable && active?.approval === "approved" && active.packageVersion === installedVersion) {
    {
      await markStartupPhase(environment, "durable-validation-start");
      const retained = await readRestartCertifiedRelease(active, paths.dataDir).catch(async () => {
        let verified: MaterializedRelease;
        try {
          verified = await readMaterializedRelease(active.releaseRoot, resolve(paths.dataDir, "releases"));
        } catch {
          verified = await repairApprovedRelease(options.packageRoot, active, paths.dataDir);
          return verified;
        }
        assertApprovedReleaseMatches(verified, active);
        await certifyMaterializedRelease(verified, paths.dataDir);
        return verified;
      }).catch(() => null);
      if (retained !== null) {
        await markStartupPhase(environment, "durable-validation-complete");
        return await launchSelected(retained);
      }
      activeIsLaunchable = false;
      excludedRetainedReleaseId = active.releaseId;
    }
  }

  // Concurrency: an installation being replaced is not a reason to refuse a launch. While
  // npm is rewriting the package tree the candidate cannot be read consistently, so a
  // launch that cannot take the installed payload starts the retained active release
  // instead and leaves activation to the launch that follows the replacement.
  let candidate: MaterializedRelease;
  try {
    candidate = await materializeRelease(options.packageRoot, paths.dataDir);
  } catch (error) {
    const fallback = await launchRetainedActive(state, paths, launchSelected, excludedRetainedReleaseId);
    if (fallback === null) throw error;
    return fallback;
  }
  // Concurrency: an update may have begun while this launch was reading the installed payload.
  const afterMaterialization = await launchDuringUpdate();
  if (afterMaterialization !== null) return afterMaterialization;
  state = await stateStore.read();
  const ordinarySelection = !activeIsLaunchable
    ? candidate.releaseId
    : selectOrdinaryLaunchReleaseId(candidate, state.references.active === null ? undefined : state.releases[state.references.active]);
  if (ordinarySelection !== candidate.releaseId) {
    const retainedRecord = state.releases[ordinarySelection];
    if (!retainedRecord || retainedRecord.approval !== "approved") throw new Error("selected active release is not approved");
    const retained = await readCertifiedReleaseManifest(retainedRecord, resolve(paths.dataDir, "releases"));
    return await launchSelected(retained);
  }

  await stateStore.recordCandidate(candidate);
  state = await stateStore.read();
  if (state.releases[candidate.releaseId]?.approval !== "approved") {
    const diagnosticsPath = await certifyMaterializedRelease(candidate, paths.dataDir);
    await stateStore.approve(candidate.releaseId, diagnosticsPath);
  }
  state = await stateStore.activateForLaunch(candidate.releaseId, !activeIsLaunchable ? activeId ?? undefined : undefined);
  if (state.references.active !== candidate.releaseId) {
    const retainedRecord = state.references.active === null ? undefined : state.releases[state.references.active];
    if (!retainedRecord || retainedRecord.approval !== "approved") throw new Error("ordinary launch has no approved active release");
    const retained = await readCertifiedReleaseManifest(retainedRecord, resolve(paths.dataDir, "releases"));
    return await launchSelected(retained);
  }

  return await launchSelected(candidate);
}

function bootstrapArguments(intent: BootstrapOptions["launchIntent"], profile: LaunchProfileId): string[] {
  const arguments_ = [...sessionSelectionArguments(intent?.sessionSelection), ...interactiveStartupArguments(intent ?? {})];
  if (arguments_.length > 0 && profile !== "a1") throw new Error("startup arguments require the A1 profile");
  return arguments_;
}

async function assertStartupPayloadSupport(
  release: MaterializedRelease, selectedStoreRoot: string, startup?: InteractiveStartupArguments,
): Promise<void> {
  if (startup?.sessionColor === undefined && startup?.promptArguments === undefined) return;
  const startupEntry = "dist/features/launch/interactive-arguments.js";
  if (release.files.some(file => file.path === startupEntry)) return;
  // Security: selection has established authority for this exact identity. Compact restart
  // evidence carries only executable entries, so absence requires its authenticated full inventory.
  const manifest = await readCertifiedReleaseManifest(release, selectedStoreRoot);
  if (!manifest.files.some(file => file.path === startupEntry)) {
    throw new Error("Selected retained UI does not support invocation color/literal prompts; launch without the override or update A1.");
  }
}

/**
 * Start the retained active release when the installed payload cannot be taken. The
 * release already carries certified evidence, so this reuses it rather than
 * certifying anything new, and reports no selection when there is nothing safe
 * to fall back to.
 */
async function launchRetainedActive(
  state: ReleaseState,
  paths: ReturnType<typeof resolveProductPaths>,
  launch: (release: MaterializedRelease) => Promise<number>,
  excludedReleaseId?: string,
): Promise<number | null> {
  const activeId = state.references.active;
  const active = activeId === null ? undefined : state.releases[activeId];
  if (!active || active.approval !== "approved" || active.releaseId === excludedReleaseId) return null;
  try {
    const retained = await readCertifiedReleaseManifest(active, resolve(paths.dataDir, "releases"));
    return await launch(retained);
  } catch {
    return null;
  }
}

async function repairApprovedRelease(
  packageRoot: string,
  active: CertifiedReleaseRecord,
  dataDir: string,
): Promise<MaterializedRelease> {
  const repaired = await repairMaterializedRelease(packageRoot, active.releaseRoot);
  assertApprovedReleaseMatches(repaired, active);
  await recordParentCertifiedRelease(repaired, dataDir);
  return repaired;
}

function assertApprovedReleaseMatches(release: MaterializedRelease, active: CertifiedReleaseRecord): void {
  if (release.releaseId !== active.releaseId || release.contentDigest !== active.contentDigest
    || (active.packageVersion !== undefined && release.packageVersion !== active.packageVersion)) {
    throw new Error("completely verified release differs from the approved active record");
  }
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
  return await recordParentCertifiedRelease(release, dataDir);
}

/** Persist current-format evidence after an authenticated parent has certified the exact release. */
export async function recordParentCertifiedRelease(release: MaterializedRelease, dataDir: string): Promise<string> {
  const path = resolve(dataDir, `certification-${release.releaseId}.json`);
  const restartSeal = await createRestartSeal(release, dataDir);
  await chmod(path, 0o600).catch(() => {});
  await writeFile(path, JSON.stringify(releaseCertificationDocument(release, restartSeal), null, 2), { mode: 0o600 });
  await chmod(path, 0o400);
  return path;
}

/**
 * Run the selected release's UI as the one attached child. The launcher still owns the terminal,
 * so when the child ends uncleanly it restores the terminal and prints any notice the UI left armed.
 */
async function launchUi(
  release: MaterializedRelease,
  environment: NodeJS.ProcessEnv,
  sessionArgs: readonly string[],
  runtimeDir: string,
  dataDir: string,
): Promise<{ readonly code: number; readonly releaseSuperseded: boolean }> {
  const use = await acquireReleaseUse(dataDir, release.releaseId);
  try { return await launchClaimedUi(release, environment, sessionArgs, runtimeDir, use); }
  finally { await use.release().catch(() => undefined); }
}

async function launchClaimedUi(
  release: MaterializedRelease, environment: NodeJS.ProcessEnv, sessionArgs: readonly string[], runtimeDir: string,
  use: Awaited<ReturnType<typeof acquireReleaseUse>>,
): Promise<{ readonly code: number; readonly releaseSuperseded: boolean }> {
  await markStartupPhase(environment, "bootstrap-selected");
  const entry = await resolveReleaseEntryPoint(release, "bin/ui.js");
  const ownsTerminal = readLaunchContext(environment).launchProfile === "a1";
  const noticeDirectory = resolve(runtimeDir, "exit-notices");
  const noticePath = resolve(noticeDirectory, `${randomUUID()}.notice`);
  if (ownsTerminal) await mkdir(noticeDirectory, { recursive: true, mode: 0o700 });
  const launchEnvironment = releaseEnvironment(environment, release, readLaunchContext(environment, "profile").launchProfile);
  if (ownsTerminal) launchEnvironment[PRODUCT_IDENTITY.environment.exitNoticePath] = noticePath;
  return await new Promise((resolvePromise, rejectPromise) => {
    let releaseSuperseded = false;
    const child = spawn(process.execPath, [entry, ...sessionArgs], {
      env: launchEnvironment,
      stdio: ["inherit", "inherit", "inherit", "ipc"],
      windowsHide: false,
    });
    let handoff = Promise.resolve();
    child.once("spawn", () => {
      // Security: failure keeps the durable launching reservation rather than guessing the child dead.
      handoff = use.started(child.pid!).catch(() => undefined);
    });
    child.on("message", message => {
      if (message && typeof message === "object" && "type" in message && message.type === RELEASE_RESELECTION_MESSAGE) {
        releaseSuperseded = true;
      }
    });
    child.once("error", rejectPromise);
    child.once("close", async (code, signal) => {
      await handoff;
      const outcome = releaseSuperseded ? code ?? 1 : restoreAfterOwnedExit(ownsTerminal, code, signal);
      // Invariant: the UI removes its notice on a clean exit; one still armed means the UI died.
      if (ownsTerminal) deliverExitNotice(noticePath, message => process.stderr.write(message));
      resolvePromise({ code: outcome, releaseSuperseded });
    });
  });
}

/**
 * Hand a release the key set its own build reads. A retained pre-cutover release is
 * still startable this way, which is what lets a launch fall back to the previous
 * version instead of failing while an installation is being replaced.
 */
export function releaseEnvironment(environment: NodeJS.ProcessEnv, release: MaterializedRelease, profile?: LaunchProfileId): NodeJS.ProcessEnv {
  return withLaunchContext(environment, {
    releaseId: release.releaseId,
    releaseLayers: (release.dependencyLayers ?? []).map(layer => layer.layerId).join(","),
    releaseRoot: release.releaseRoot,
    releaseDigest: release.contentDigest,
    ...(profile === undefined ? {} : { launchProfile: profile }),
  }, process.platform, launchContractTarget(release));
}
