import { spawn, type StdioOptions } from "node:child_process";
import { access, readFile, realpath } from "node:fs/promises";
import { connect } from "node:net";
import { isAbsolute, relative, resolve, sep } from "node:path";
import crossSpawn from "cross-spawn";
import { valid as validSemver } from "semver";
import { PRODUCT_IDENTITY, PRODUCT_TEXT } from "../../product-identity.js";
import {
  certifyMaterializedRelease,
  probeOwnership,
  readEndpointMetadata,
  removeEndpointArtifacts,
  startSupervisor,
  waitForProcessExit,
  waitForVerifiedEndpoint,
} from "./bootstrap.js";
import { resolveCohortEndpoint, resolveProductPaths, type CohortEndpointPaths, type ProductPaths } from "../lifecycle/index.js";
import { encodeFrame, LineFrameDecoder } from "../protocol/index.js";
import { CohortStateStore, type SupervisorEndpointMetadata } from "./cohort-state.js";
import { cleanupVerifiedOwner, processIsAlive } from "./process-cleanup.js";
import { materializeRelease, readMaterializedRelease } from "./release-store.js";
import { scheduleReleaseCleanup } from "./release-gc.js";
import { warmMaterializedRelease } from "./warmup.js";
import { UpdateTransactionStore, type UpdateTransaction, type UpdateTransactionPhase } from "./update-transaction.js";

export const PRODUCT_PACKAGE = PRODUCT_TEXT.packageName;
export type UpdateChannel = "stable" | "next";
const UPDATE_DIST_TAGS: Readonly<Record<UpdateChannel, "latest" | "next">> = { stable: "latest", next: "next" };
export interface ProcessRequest { captureStdout: boolean }
export interface ProcessResult { code: number | null; stdout: string }
export type UpdateProcessRunner = (command: string, arguments_: readonly string[], request: ProcessRequest) => Promise<ProcessResult>;
export interface UpdateFileSystem {
  readFile(path: string): Promise<string>;
  realpath(path: string): Promise<string>;
  access?(path: string): Promise<void>;
}
export interface UpdateOutput { stdout(message: string): void; stderr(message: string): void }
export type UpdateMeasuredPhase =
  | "package-version"
  | "target-resolution"
  | "global-root"
  | "ownership-release"
  | "npm-install"
  | "materialized"
  | "certified"
  | "active-reference-committed"
  | "warmup"
  | "supervisor-verified"
  | "transaction-complete";
export interface UpdatePhaseTimingEvent { readonly phase: UpdateMeasuredPhase; readonly durationMs: number }
export interface UpdatePerformanceEvidence {
  readonly fileCount: number;
  readonly sourceReads: number;
  readonly candidateWrites: number;
  readonly verificationReads: number;
  readonly layerWrites?: number;
  readonly layerReusedFiles?: number;
  readonly layerReusedBytes?: number;
  readonly payloadExcludedFiles?: number;
  readonly payloadExcludedBytes?: number;
  readonly warmupDurationMs?: number;
  readonly postNpmDurationMs: number;
}
export interface SelfUpdateOptions {
  packageRoot: string;
  channel?: UpdateChannel;
  /** A specific preview to install, named by its development number or full version. */
  target?: string;
  environment?: NodeJS.ProcessEnv;
  fileSystem?: UpdateFileSystem;
  output?: UpdateOutput;
  runner?: UpdateProcessRunner;
  lifecycle?: UpdateLifecycleCoordinator;
  transactionStore?: UpdateTransactionJournal;
  /** Test or embedding seam for post-activation release maintenance. */
  maintenance?: () => Promise<void>;
  progress?: boolean;
  onPhaseTiming?: (event: UpdatePhaseTimingEvent) => void;
  now?: () => number;
}
export type UpdateActivationPhase = Extract<UpdateTransactionPhase, "materialized" | "certified" | "active-reference-committed">;

/**
 * Copying the release is the longest step with nothing to say for itself, so it
 * reports the files it has written against the files it must write. A caller that
 * shows progress can then move with the work instead of guessing at it.
 */
export interface UpdateMaterializationProgress {
  readonly completed: number;
  readonly total: number;
}

export interface UpdateLifecycleCoordinator {
  targetIsActive(targetVersion: string): Promise<boolean>;
  shutdownVerifiedOwners(targetVersion: string): Promise<{ priorActiveVersion: string | null }>;
  verifyPackageUnlocked(packageRoot: string): Promise<void>;
  activateInstalled(
    packageRoot: string,
    targetVersion: string,
    phase: (phase: UpdateActivationPhase) => Promise<void>,
    onMaterializing?: (progress: UpdateMaterializationProgress) => void,
    onWarmup?: (state: "started" | "completed") => void,
  ): Promise<void>;
}
export interface UpdateTransactionJournal {
  readonly path: string;
  read(): Promise<UpdateTransaction | null>;
  begin(input: { channel: UpdateChannel; targetVersion: string; packageRoot: string; priorActiveReleaseId: string | null }): Promise<UpdateTransaction>;
  advance(phase: UpdateTransactionPhase): Promise<UpdateTransaction>;
  finish(status: "completed" | "rolled-back" | "failed", error?: string | null): Promise<UpdateTransaction>;
  clearCompleted(): Promise<void>;
}

const defaultFileSystem: UpdateFileSystem = {
  async readFile(path) { return await readFile(path, "utf8"); },
  realpath,
  access,
};
const defaultOutput: UpdateOutput = {
  stdout(message) { process.stdout.write(message); },
  stderr(message) { process.stderr.write(message); },
};

export function createNpmProcessRunner(platform: NodeJS.Platform = process.platform): UpdateProcessRunner {
  return async (command, arguments_, request) => await new Promise((resolvePromise, rejectPromise) => {
    const stdio: StdioOptions = request.captureStdout ? ["ignore", "pipe", "inherit"] : ["inherit", "inherit", "inherit"];
    const child = platform === "win32" ? crossSpawn(command, [...arguments_], { stdio }) : spawn(command, [...arguments_], { stdio });
    const stdout: Buffer[] = [];
    child.stdout?.on("data", chunk => stdout.push(Buffer.from(chunk)));
    let settled = false;
    child.once("error", error => { if (!settled) { settled = true; rejectPromise(error); } });
    child.once("close", code => { if (!settled) { settled = true; resolvePromise({ code, stdout: Buffer.concat(stdout).toString("utf8") }); } });
  });
}

export type UpdateOwnershipAction = "clean-dead-record" | "leave-running" | "end-session";

/**
 * What an update does about the owner it found. A cohort running from retained immutable
 * content keeps its work: the installation replaces files it does not read, and it listens on
 * its own endpoint. A cohort running from the mutable installation is the one exception,
 * because that installation is exactly what is about to be replaced under it.
 */
export function planUpdateOwnership(
  ownership: "live-verified" | "dead",
  runsFromRetainedRelease: boolean,
): UpdateOwnershipAction {
  if (ownership === "dead") return "clean-dead-record";
  return runsFromRetainedRelease ? "leave-running" : "end-session";
}

/**
 * The endpoint of the active cohort, together with where it is recorded, so a caller that
 * finds it can also clean it up. A release that predates cohort-scoped endpoints published
 * one endpoint for the runtime directory, and that one is recognized too.
 */
async function readActiveEndpoint(
  paths: ProductPaths,
  activeReleaseId: string | null,
  environment: NodeJS.ProcessEnv,
): Promise<{ readonly metadata: SupervisorEndpointMetadata; readonly paths: CohortEndpointPaths } | null> {
  if (activeReleaseId !== null) {
    const cohort = resolveCohortEndpoint(paths, activeReleaseId, environment);
    const metadata = await readEndpointMetadata(cohort.endpointMetadataPath);
    if (metadata) return { metadata, paths: cohort };
  }
  const legacyPaths = { endpoint: paths.endpoint, endpointMetadataPath: paths.endpointMetadataPath };
  const legacy = await readEndpointMetadata(legacyPaths.endpointMetadataPath);
  return legacy ? { metadata: legacy, paths: legacyPaths } : null;
}

export function createUpdateLifecycleCoordinator(
  environment: NodeJS.ProcessEnv = process.env,
  fileSystem: UpdateFileSystem = defaultFileSystem,
  output: UpdateOutput = defaultOutput,
): UpdateLifecycleCoordinator {
  const paths = resolveProductPaths(environment);
  const stateStore = new CohortStateStore(paths.dataDir);
  return {
    async targetIsActive(targetVersion) {
      const state = await stateStore.read();
      const activeId = state.references.active;
      if (!activeId || state.releases[activeId]?.packageVersion !== targetVersion) return false;
      const endpoint = await readActiveEndpoint(paths, activeId, environment);
      return endpoint?.metadata.releaseId === activeId && await probeOwnership(endpoint.metadata) === "live-verified";
    },
    async shutdownVerifiedOwners(targetVersion) {
      const state = await stateStore.read();
      const activeId = state.references.active;
      const priorActiveVersion = activeId ? state.releases[activeId]?.packageVersion ?? null : null;
      const owner = await readActiveEndpoint(paths, activeId, environment);
      if (!owner) return { priorActiveVersion };
      const endpoint = owner.metadata;
      const ownership = await probeOwnership(endpoint);
      if (ownership !== "live-verified" && ownership !== "dead") {
        throw new Error(PRODUCT_TEXT.diagnostic(`refused update shutdown because supervisor ownership is ${ownership}`));
      }
      const plan = planUpdateOwnership(ownership, await canonicalImmutableRoot(paths.dataDir, endpoint.releaseRoot));
      if (plan === "clean-dead-record") {
        await removeEndpointArtifacts(owner.paths.endpointMetadataPath, owner.paths.endpoint);
        return { priorActiveVersion };
      }
      // Rationale: leaving sessions alone is the expected outcome, and saying so mid-update tears
      // the progress bar; only ending a session (below) is worth interrupting it for.
      if (plan === "leave-running") return { priorActiveVersion };

      // Rationale: say whose work is ending before it ends.
      const live = endpoint.ownership.liveInstanceIds.length;
      if (live > 0) {
        output.stderr(`${PRODUCT_TEXT.diagnostic(`ending ${live === 1 ? "one session" : `${live} sessions`} that run from the installation being replaced; a session started by an installed release would have been left alone.`)}\n`);
      }
      const identity = await requestUpdateShutdown(endpoint, targetVersion, 2_000);
      if (!identity.accepted && processIsAlive(endpoint.pid)) {
        // Security: explicit update consent permits bounded cleanup of an authenticated
        // older owner that predates the update-shutdown message.
        const cleanup = await cleanupVerifiedOwner(endpoint, { allowLiveInstances: true, reason: "legacy-mutable-install" });
        if (!cleanup.terminated) throw new Error(`verified ${PRODUCT_TEXT.displayName} owner ${endpoint.pid} rejected shutdown and could not be terminated: ${identity.reason}`);
      } else if (identity.accepted) {
        await waitForProcessExit(endpoint.pid, 3_000).catch(async () => {
          const cleanup = await cleanupVerifiedOwner(endpoint, { allowLiveInstances: true, reason: "legacy-mutable-install" });
          if (!cleanup.terminated) throw new Error(`verified ${PRODUCT_TEXT.displayName} owner ${endpoint.pid} did not terminate`);
        });
      }
      await removeEndpointArtifacts(owner.paths.endpointMetadataPath, owner.paths.endpoint);
      return { priorActiveVersion };
    },
    async verifyPackageUnlocked(packageRoot) {
      if (fileSystem.access) await fileSystem.access(packageRoot);
      const probe = `${packageRoot}.${PRODUCT_IDENTITY.filesystem.slug}-unlock-probe`;
      const { rename } = await import("node:fs/promises");
      try {
        await rename(packageRoot, probe);
        await rename(probe, packageRoot);
      } catch (error) {
        // Invariant: best-effort rollback runs if the first rename succeeded and the second did not.
        await rename(probe, packageRoot).catch(() => {});
        throw new Error(PRODUCT_TEXT.diagnostic(`package remains locked after verified shutdown: ${errorMessage(error)}`));
      }
    },
    async activateInstalled(packageRoot, targetVersion, phase, onMaterializing, onWarmup) {
      let total = 0;
      let completed = 0;
      const candidate = await materializeRelease(packageRoot, paths.dataDir, {
        onProgress: event => {
          total = event.fileCount;
          onMaterializing?.({ completed, total });
        },
        onOperation: event => {
          if (event.operation !== "candidate-write" && event.operation !== "layer-write") return;
          completed += 1;
          onMaterializing?.({ completed, total });
        },
      });
      if (candidate.packageVersion !== targetVersion) throw new Error(`installed ${PRODUCT_TEXT.displayName} version ${candidate.packageVersion} does not match target ${targetVersion}`);
      await stateStore.recordCandidate(candidate);
      await phase("materialized");
      const diagnostics = await certifyMaterializedRelease(candidate, paths.dataDir);
      await stateStore.approve(candidate.releaseId, diagnostics);
      await phase("certified");
      await stateStore.activate(candidate.releaseId);
      await phase("active-reference-committed");
      onWarmup?.("started");
      await warmMaterializedRelease(candidate, environment);
      onWarmup?.("completed");
      const startup = await startSupervisor(candidate, environment);
      await waitForVerifiedEndpoint(resolveCohortEndpoint(paths, candidate.releaseId, environment).endpointMetadataPath, candidate, 8_000, startup);
    },
  };
}

const PROGRESS_BAR_WIDTH = 39;
const PROGRESS_TICK_MS = 200;
/**
 * Copying the release owns 78–92 and is reported file by file, so the bar crosses
 * that span with the work rather than parking at its start. What follows is short,
 * which is why the remaining milestones sit close together.
 */
const MATERIALIZE_PROGRESS = Object.freeze({ from: 78, to: 92 });
const ACTIVATION_PROGRESS: Readonly<Record<UpdateActivationPhase, { at: number; creepTo: number }>> = {
  materialized: { at: 92, creepTo: 94 },
  certified: { at: 94, creepTo: 96 },
  "active-reference-committed": { at: 96, creepTo: 99 },
};

interface UpdateProgress { set(percent: number, creepTo?: number): void; finish(): void; clear(): void }

function renderProgressBar(percent: number): string {
  const bounded = Math.min(100, Math.max(0, Math.round(percent)));
  const filled = Math.round((bounded / 100) * PROGRESS_BAR_WIDTH);
  return `${"█".repeat(filled)}${"░".repeat(PROGRESS_BAR_WIDTH - filled)} ${bounded}%`;
}

function createUpdateProgress(output: UpdateOutput, enabled: boolean): UpdateProgress {
  let visible = false;
  let current = 0;
  let shown = -1;
  let timer: ReturnType<typeof setInterval> | null = null;
  const draw = () => {
    const rounded = Math.round(current);
    if (rounded === shown) return;
    shown = rounded;
    visible = true;
    output.stdout(`\r${renderProgressBar(rounded)}`);
  };
  const stopCreep = () => {
    if (timer !== null) { clearInterval(timer); timer = null; }
  };
  return {
    set(percent, creepTo = percent) {
      if (!enabled) return;
      stopCreep();
      current = Math.max(current, percent);
      shown = -1;
      draw();
      if (creepTo <= current) return;
      // Rationale: creep asymptotically toward (but never reach) the next milestone so
      // long opaque phases such as npm install still show visible motion. The
      // ceiling stays a whole point below the milestone: settling on `creepTo`
      // itself would render as that milestone and make arriving at it invisible,
      // which is what a stalled bar looks like.
      timer = setInterval(() => {
        current = Math.min(creepTo - 1, current + (creepTo - current) * 0.04);
        draw();
      }, PROGRESS_TICK_MS);
      timer.unref?.();
    },
    // Rationale: the bar exists to say the update is still moving. Once it has finished
    // there is a better line to occupy that row — the one naming what is now
    // installed — so the bar gives the row back rather than leaving a full
    // meter above a message that already implies it.
    finish() {
      stopCreep();
      if (!visible) return;
      output.stdout(`\r${" ".repeat(PROGRESS_BAR_WIDTH + 6)}\r`);
      visible = false;
      shown = -1;
    },
    clear() {
      stopCreep();
      if (!visible) return;
      output.stdout(`\r${" ".repeat(PROGRESS_BAR_WIDTH + 6)}\r`);
      visible = false;
      shown = -1;
    },
  };
}

interface ResolvedTarget { readonly version: string | null; readonly exitCode: number }

/** The newest version the channel points at, which is what an unqualified update takes. */
async function resolveChannelHead(runner: UpdateProcessRunner, distTag: string, output: UpdateOutput): Promise<ResolvedTarget> {
  const publicChannel = distTag === "next" ? "development" : "release";
  const lookup = await runNpm(runner, ["view", `${PRODUCT_PACKAGE}@${distTag}`, "version"], true, output, `query the npm ${publicChannel} channel`);
  if (lookup.result === null) return { version: null, exitCode: lookup.exitCode };
  const version = validSemver(lookup.result.stdout.trim());
  if (version === null) {
    output.stderr(`${PRODUCT_TEXT.diagnostic(`received a malformed ${publicChannel} channel version from npm: ${JSON.stringify(lookup.result.stdout.trim())}.`)}\n`);
    return { version: null, exitCode: 1 };
  }
  return { version, exitCode: 0 };
}

/**
 * Resolve a preview the caller named.
 *
 * A preview is published as `<version>-dev.<pull-request-number>`, so its decimal
 * development number is enough to identify it. A full version is accepted too.
 * The published list remains authoritative: nothing is constructed from the
 * installed package's base version.
 */
async function resolveRequestedPreview(runner: UpdateProcessRunner, requested: string, output: UpdateOutput): Promise<ResolvedTarget> {
  const lookup = await runNpm(runner, ["view", PRODUCT_PACKAGE, "versions", "--json"], true, output, "list the published versions");
  if (lookup.result === null) return { version: null, exitCode: lookup.exitCode };
  let published: unknown;
  try {
    published = JSON.parse(lookup.result.stdout.trim() || "[]");
  } catch {
    output.stderr(`${PRODUCT_TEXT.diagnostic(`received a malformed version list from npm: ${JSON.stringify(lookup.result.stdout.trim())}.`)}\n`);
    return { version: null, exitCode: 1 };
  }
  const versions = (Array.isArray(published) ? published : [published]).filter((value): value is string => typeof value === "string");

  const exact = versions.find(version => version === requested);
  if (exact !== undefined) {
    // Rationale: naming a release here would install it through the preview path, which is a
    // different command with a different meaning.
    if (!exact.includes("-dev.")) {
      output.stderr(`${PRODUCT_TEXT.diagnostic(`${exact} is a release, not a preview; run ${PRODUCT_TEXT.commandName} update to move to the current release.`)}\n`);
      return { version: null, exitCode: 1 };
    }
    return { version: exact, exitCode: 0 };
  }

  const matches = versions.filter(version => version.endsWith(`-dev.${requested}`));
  if (matches.length === 1) return { version: matches[0]!, exitCode: 0 };
  if (matches.length > 1) {
    output.stderr(`${PRODUCT_TEXT.diagnostic(`found more than one preview for ${requested}: ${matches.join(", ")}. Name the version instead.`)}\n`);
    return { version: null, exitCode: 1 };
  }
  output.stderr(`${PRODUCT_TEXT.diagnostic(`published no preview for ${requested}.`)}\n`);
  return { version: null, exitCode: 1 };
}

export async function runSelfUpdate(options: SelfUpdateOptions): Promise<number> {
  const fileSystem = options.fileSystem ?? defaultFileSystem;
  const output = options.output ?? defaultOutput;
  const runner = options.runner ?? createNpmProcessRunner();
  const channel = options.channel ?? "stable";
  const distTag = UPDATE_DIST_TAGS[channel];
  const now = options.now ?? (() => performance.now());
  const measure = async <Value>(phase: UpdateMeasuredPhase, operation: () => Promise<Value>): Promise<Value> => {
    const startedAt = now();
    try { return await operation(); }
    finally { options.onPhaseTiming?.({ phase, durationMs: Math.max(0, now() - startedAt) }); }
  };

  let runningVersion: string;
  try {
    const packageJson = JSON.parse(await measure("package-version", async () => await fileSystem.readFile(resolve(options.packageRoot, "package.json")))) as { version?: unknown };
    const parsedVersion = typeof packageJson.version === "string" ? validSemver(packageJson.version) : null;
    if (parsedVersion === null) throw new Error("package.json does not contain a valid semantic version");
    runningVersion = parsedVersion;
  } catch (error) {
    output.stderr(`${PRODUCT_TEXT.diagnostic(`could not read its running package version: ${errorMessage(error)}`)}\n`);
    return 1;
  }

  const requested = options.target?.trim();
  const resolved = await measure("target-resolution", async () => requested === undefined || requested.length === 0
    ? await resolveChannelHead(runner, distTag, output)
    : await resolveRequestedPreview(runner, requested, output));
  if (resolved.version === null) return resolved.exitCode;
  const targetVersion = resolved.version;
  // Rationale: no full stop after a version: it already ends in a dot-separated identifier,
  // and a trailing one reads as part of the version rather than as punctuation.
  output.stdout(`${PRODUCT_TEXT.commandName} update: ${runningVersion} → ${targetVersion}\n`);
  const progress = createUpdateProgress(output, options.progress ?? (options.output === undefined && process.stdout.isTTY === true));

  const rootLookup = await measure("global-root", async () => await runNpm(runner, ["root", "--global"], true, output, "resolve npm's global package root"));
  if (rootLookup.result === null) return rootLookup.exitCode;
  if (rootLookup.result.stdout.trim().length === 0) {
    output.stderr(`${PRODUCT_TEXT.diagnostic("could not verify its installation because npm returned an empty global package root.")}\n`);
    return 1;
  }
  let packageRoot: string;
  let globalRoot: string;
  try {
    [packageRoot, globalRoot] = await Promise.all([fileSystem.realpath(options.packageRoot), fileSystem.realpath(rootLookup.result.stdout.trim())]);
  } catch (error) {
    output.stderr(`${PRODUCT_TEXT.diagnostic(`could not canonicalize the running and global npm paths: ${errorMessage(error)}`)}\n`);
    return 1;
  }
  if (!isContainedBy(globalRoot, packageRoot)) {
    output.stderr(`${PRODUCT_TEXT.diagnostic(`refused to update automatically because ${packageRoot} is not managed beneath npm's global package root ${globalRoot}.`)}\n`);
    return 1;
  }

  const environment = options.environment ?? process.env;
  const paths = resolveProductPaths(environment);
  const lifecycle = options.lifecycle ?? createUpdateLifecycleCoordinator(environment, fileSystem, output);
  const transactionStore = options.transactionStore ?? new UpdateTransactionStore(paths.dataDir);
  const maintenance = options.maintenance ?? (options.lifecycle
    ? async () => {}
    : async () => await scheduleReleaseCleanup(paths.dataDir, paths));
  let transaction = await transactionStore.read();
  try {
    if (await lifecycle.targetIsActive(targetVersion)) {
      if (transaction?.status === "active") {
        await transactionStore.advance("supervisor-verified");
        await transactionStore.finish("completed");
      }
      await maintenance();
      await transactionStore.clearCompleted();
      output.stdout(`${PRODUCT_TEXT.commandName} is up to date — no update needed.\n`);
      return 0;
    }
    // Rationale: the bar first appears here so a no-change run never flashes it.
    progress.set(3, 15);
    const cohortState = await new CohortStateStore(paths.dataDir).read();
    transaction = await transactionStore.begin({
      channel,
      targetVersion,
      packageRoot,
      priorActiveReleaseId: cohortState.references.active,
    });
    if (phaseBefore(transaction.phase, "ownership-released")) {
      await measure("ownership-release", async () => {
        await lifecycle.shutdownVerifiedOwners(targetVersion);
        await lifecycle.verifyPackageUnlocked(packageRoot);
      });
      transaction = await transactionStore.advance("ownership-released");
    }
    progress.set(15, 70);

    if (phaseBefore(transaction.phase, "package-installed")) {
      const installation = await measure("npm-install", async () => await runNpm(
        runner,
        ["install", "--global", "--loglevel=error", "--no-fund", "--no-audit", `${PRODUCT_PACKAGE}@${targetVersion}`],
        true,
        output,
        "start the global npm installation",
        false,
      ));
      if (installation.result === null) throw new UpdateFailure(installation.exitCode, "npm process failed");
      if (installation.result.code !== 0) {
        if (installation.result.stdout.trim().length > 0) output.stderr(`${installation.result.stdout.trimEnd()}\n`);
        throw new UpdateFailure(unsuccessfulCode(installation.result.code), `npm exited with status ${formatExitCode(installation.result.code)}`);
      }
      transaction = await transactionStore.advance("package-installed");
    }

    // Compatibility: npm 12 blocks install scripts unless allowScripts covers the package, so
    // the postinstall that points the #pi-tui proxy at the tree npm just built
    // may never have run. Run the shipped script directly: the proxy must be
    // correct before the release store copies this tree. A failure is reported
    // and left to the launch-time self-heal rather than failing the update.
    try {
      const proxySync = await runner(process.execPath, [resolve(packageRoot, "bin", "sync-pi-tui-proxy.js")], { captureStdout: true });
      if (proxySync.code !== 0) output.stderr(`${PRODUCT_TEXT.diagnostic(`could not point the #pi-tui proxy at the installed tree (exited ${formatExitCode(proxySync.code)}).`)}\n`);
    } catch (error) {
      output.stderr(`${PRODUCT_TEXT.diagnostic(`could not point the #pi-tui proxy at the installed tree: ${errorMessage(error)}`)}\n`);
    }
    progress.set(70, 75);

    // Concurrency: ownership can be reacquired after an interrupted installation (for
    // example, if bare A1 is launched before the update is resumed). Recheck
    // immediately before activation so recovery cannot start a second cohort.
    await measure("ownership-release", async () => { await lifecycle.shutdownVerifiedOwners(targetVersion); });
    progress.set(75, MATERIALIZE_PROGRESS.from);
    let activationPhaseStartedAt = now();
    await lifecycle.activateInstalled(packageRoot, targetVersion, async phase => {
      options.onPhaseTiming?.({ phase, durationMs: Math.max(0, now() - activationPhaseStartedAt) });
      transaction = await transactionStore.advance(phase);
      progress.set(ACTIVATION_PROGRESS[phase].at, ACTIVATION_PROGRESS[phase].creepTo);
      activationPhaseStartedAt = now();
    }, ({ completed, total }) => {
      const span = MATERIALIZE_PROGRESS.to - MATERIALIZE_PROGRESS.from;
      const done = total > 0 ? Math.min(1, completed / total) : 0;
      progress.set(MATERIALIZE_PROGRESS.from + span * done);
    }, state => {
      if (state === "started") {
        activationPhaseStartedAt = now();
        progress.set(98, 99);
      } else {
        options.onPhaseTiming?.({ phase: "warmup", durationMs: Math.max(0, now() - activationPhaseStartedAt) });
        activationPhaseStartedAt = now();
        progress.set(99);
      }
    });
    options.onPhaseTiming?.({ phase: "supervisor-verified", durationMs: Math.max(0, now() - activationPhaseStartedAt) });
    const transactionStartedAt = now();
    await transactionStore.advance("supervisor-verified");
    await transactionStore.finish("completed");
    // Invariant: successful output follows the durable cleanup disposition. Slow recursive
    // removal belongs to the detached worker started by this maintenance coordinator.
    await maintenance();
    await transactionStore.clearCompleted();
    options.onPhaseTiming?.({ phase: "transaction-complete", durationMs: Math.max(0, now() - transactionStartedAt) });
    progress.finish();
    output.stdout(`${PRODUCT_TEXT.commandName} updated successfully: ${targetVersion}\n`);
    return 0;
  } catch (error) {
    progress.clear();
    const message = errorMessage(error);
    const rollback = options.lifecycle
      ? "previous test lifecycle retained"
      : await rollbackPriorCohort(paths.dataDir, environment, transaction?.priorActiveReleaseId ?? null).catch(rollbackError => `rollback failed: ${errorMessage(rollbackError)}`);
    if (transaction) await transactionStore.finish(rollback === "rolled back" ? "rolled-back" : "failed", `${message}; ${rollback}`);
    output.stderr(`${PRODUCT_TEXT.diagnostic(`update failed: ${message}. ${rollback}. Diagnostics: ${transactionStore.path}`)}\n`);
    return error instanceof UpdateFailure ? error.exitCode : 1;
  }
}

export function assertUpdatePerformanceBudget(
  evidence: UpdatePerformanceEvidence,
  maximumPostNpmDurationMs = 30_000,
): void {
  const failures: string[] = [];
  if (evidence.fileCount < 1) failures.push("fixture contains no payload files");
  if (evidence.sourceReads !== evidence.fileCount) failures.push(`source payload read count is ${evidence.sourceReads} for ${evidence.fileCount} files`);
  const totalWrites = evidence.candidateWrites + (evidence.layerWrites ?? 0);
  if (totalWrites !== evidence.fileCount) failures.push(`runtime payload write count is ${totalWrites} for ${evidence.fileCount} files`);
  if (evidence.verificationReads > 0) failures.push(`fresh certification reread ${evidence.verificationReads} candidate files`);
  if (evidence.postNpmDurationMs > maximumPostNpmDurationMs) failures.push(`post-npm activation took ${Math.round(evidence.postNpmDurationMs)}ms; budget is ${maximumPostNpmDurationMs}ms`);
  if (failures.length > 0) throw new Error(`update performance budget failed: ${failures.join("; ")}`);
}

async function requestUpdateShutdown(metadata: SupervisorEndpointMetadata, targetVersion: string, timeoutMs: number): Promise<{ accepted: boolean; reason: string }> {
  if (!processIsAlive(metadata.pid)) return { accepted: false, reason: "recorded owner is dead" };
  return await new Promise(resolvePromise => {
    const socket = connect(metadata.endpoint);
    const decoder = new LineFrameDecoder();
    let settled = false;
    const finish = (value: { accepted: boolean; reason: string }) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolvePromise(value);
    };
    socket.once("error", () => finish({ accepted: false, reason: "verified endpoint did not respond" }));
    socket.once("connect", () => socket.write(encodeFrame({ type: "release-update-ownership", bootNonce: metadata.bootNonce, targetVersion })));
    socket.on("data", chunk => {
      try {
        const message = decoder.push(chunk)[0] as Record<string, unknown> | undefined;
        if (message?.type === "release-update-result") finish({ accepted: message.accepted === true, reason: String(message.reason ?? "shutdown rejected") });
      } catch { finish({ accepted: false, reason: "invalid shutdown response" }); }
    });
    setTimeout(() => finish({ accepted: false, reason: "verified endpoint shutdown timed out" }), timeoutMs).unref();
  });
}

async function runNpm(runner: UpdateProcessRunner, arguments_: readonly string[], captureStdout: boolean, output: UpdateOutput, action: string, reportNonzero = true): Promise<{ result: ProcessResult | null; exitCode: number }> {
  let result: ProcessResult;
  try { result = await runner("npm", arguments_, { captureStdout }); }
  catch (error) { output.stderr(`${PRODUCT_TEXT.diagnostic(`could not execute npm to ${action}: ${errorMessage(error)}`)}\n`); return { result: null, exitCode: 1 }; }
  if (result.code !== 0 && reportNonzero) {
    output.stderr(`${PRODUCT_TEXT.diagnostic(`could not ${action}; npm exited with status ${formatExitCode(result.code)}. Review npm's diagnostics above.`)}\n`);
    return { result: null, exitCode: unsuccessfulCode(result.code) };
  }
  return { result, exitCode: 0 };
}
async function rollbackPriorCohort(dataDir: string, environment: NodeJS.ProcessEnv, priorReleaseId: string | null): Promise<string> {
  if (!priorReleaseId) return "no prior cohort was available for rollback";
  const stateStore = new CohortStateStore(dataDir);
  const state = await stateStore.read();
  const prior = state.releases[priorReleaseId];
  if (!prior || prior.approval !== "approved") return "prior cohort is not a verified rollback candidate";
  if (state.references.active !== priorReleaseId) {
    if (state.references.rollback === priorReleaseId) await stateStore.rollback(true);
    else throw new Error(`prior release ${priorReleaseId} is not the recorded rollback cohort`);
  }
  const release = await readMaterializedRelease(prior.releaseRoot);
  const paths = resolveProductPaths(environment);
  // Invariant: rollback re-points the active reference and starts the prior cohort on its own endpoint;
  // a cohort that survived the update keeps serving the work it already had.
  const startup = await startSupervisor(release, environment);
  await waitForVerifiedEndpoint(resolveCohortEndpoint(paths, release.releaseId, environment).endpointMetadataPath, release, 8_000, startup);
  return "rolled back";
}

function phaseBefore(current: UpdateTransactionPhase, target: UpdateTransactionPhase): boolean {
  const phases = ["shutdown-intent", "ownership-released", "package-installed", "materialized", "certified", "active-reference-committed", "supervisor-verified"] as const;
  return phases.indexOf(current) < phases.indexOf(target);
}

class UpdateFailure extends Error {
  constructor(readonly exitCode: number, message: string) { super(message); }
}

async function canonicalImmutableRoot(dataDir: string, releaseRoot: string): Promise<boolean> {
  try {
    const [store, selected] = await Promise.all([realpath(resolve(dataDir, "releases")), realpath(releaseRoot)]);
    const fromStore = relative(store, selected);
    return fromStore.length > 0 && fromStore !== ".." && !fromStore.startsWith(`..${sep}`) && !isAbsolute(fromStore);
  } catch {
    return false;
  }
}

function isContainedBy(parent: string, child: string): boolean {
  const pathFromParent = relative(parent, child);
  return pathFromParent.length > 0 && pathFromParent !== ".." && !pathFromParent.startsWith(`..${sep}`) && !isAbsolute(pathFromParent);
}
function unsuccessfulCode(code: number | null): number { return code === null || code === 0 ? 1 : code; }
function formatExitCode(code: number | null): string { return code === null ? "unknown" : String(code); }
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
