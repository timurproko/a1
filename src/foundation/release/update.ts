import { spawn, type StdioOptions } from "node:child_process";
import { access, lstat, readFile, realpath, rename } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import crossSpawn from "cross-spawn";
import { valid as validSemver } from "semver";
import { PRODUCT_IDENTITY, PRODUCT_TEXT } from "../../product-identity.js";
import type { UpdateChannel } from "./types.js";
import { earlyAccentPalette, earlyTerminalAppearance, earlyTerminalColorMode, resolveEarlyAccentColor } from "./early-accent.js";
import { SHARED_PROGRESS_ACCENT_ANSI } from "../../contracts/presentation/index.js";
import {
  createRegistryFetcher, invalidateReleaseCheckCache, isNewerRelease, queryPublishedVersions, releaseChannelOf,
  type PublishedVersion, type RegistryFetcher,
} from "./latest-release.js";
import { resolveProductPaths, type ProductPaths } from "../lifecycle/index.js";
import { ReleaseStateStore } from "./release-state.js";
import {
  UPDATE_ACTIVATION_CONTRACT,
  activateInstalledRelease,
  delegateActivation,
  readActivationContracts,
  type UpdateActivationCallbacks,
  type UpdateActivationPhase,
  type UpdateMaterializationProgress,
} from "./update-activation.js";
import { UpdateTransactionStore, type UpdateRecoveryState, type UpdateTransaction, type UpdateTransactionPhase } from "./update-transaction.js";
import { acquireUpdateExecutionLease, reclaimDeadLease, type UpdateExecutionOwner } from "./update-execution-lease.js";
import {
  npmPrefixForGlobalRoot,
  removeUpdateRecoveryCapsule,
  updateLauncherPaths,
} from "./update-recovery.js";
import { errorMessage, samePath } from "./managed-path.js";
import {
  createProtectedUpdateInstaller,
  type UpdateInstaller,
  type UpdatePriorReleaseProtection,
} from "./update-installer.js";

export type {
  UpdateInstaller,
  UpdatePackageReplacementInput,
  UpdatePriorRelease,
  UpdatePriorReleaseProtection,
} from "./update-installer.js";

export const PRODUCT_PACKAGE = PRODUCT_TEXT.packageName;
export type { UpdateChannel } from "./types.js";
const UPDATE_DIST_TAGS: Readonly<Record<UpdateChannel, "latest" | "next">> = { stable: "latest", next: "next" };
export interface ProcessRequest { captureStdout: boolean }
export interface ProcessResult { code: number | null; stdout: string; stderr?: string }
export type UpdateProcessRunner = (command: string, arguments_: readonly string[], request: ProcessRequest) => Promise<ProcessResult>;
export interface UpdateFileMetadata {
  readonly mode: number;
  isFile(): boolean;
  isSymbolicLink(): boolean;
}
export interface UpdateFileSystem {
  readFile(path: string): Promise<string>;
  realpath(path: string): Promise<string>;
  lstat?(path: string): Promise<UpdateFileMetadata>;
  access?(path: string): Promise<void>;
  rename?(from: string, to: string): Promise<void>;
}
/**
 * How long the update keeps checking that nothing holds the package tree, and the clock it
 * checks with. Tests inject a clock; the product waits in real time.
 */
export interface UpdateUnlockPatience {
  readonly windowMs?: number;
  readonly sleep?: (durationMs: number) => Promise<void>;
  readonly now?: () => number;
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
  /** Internal exact channel target selected by the automatic update probe. */
  resolvedTarget?: string;
  mode?: "manual" | "automatic";
  onLeaseAcquired?: (owner: UpdateExecutionOwner) => void;
  onLeaseBusy?: (owner: UpdateExecutionOwner) => void;
  environment?: NodeJS.ProcessEnv;
  fileSystem?: UpdateFileSystem;
  output?: UpdateOutput;
  runner?: UpdateProcessRunner;
  /** Reads the registry's package document when a preview is named; defaults to a bounded fetch. */
  fetcher?: RegistryFetcher;
  lifecycle?: UpdateLifecycleCoordinator;
  transactionStore?: UpdateTransactionJournal;
  /** The npm and release-storage steps; defaults to protected replacement of the managed package. */
  installer?: UpdateInstaller;
  progress?: boolean;
  onPhaseTiming?: (event: UpdatePhaseTimingEvent) => void;
  now?: () => number;
}
export type { UpdateActivationPhase, UpdateMaterializationProgress } from "./update-activation.js";

export interface UpdateLifecycleCoordinator {
  targetIsActive(targetVersion: string): Promise<boolean>;
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
  setRecovery?(recovery: UpdateRecoveryState): Promise<UpdateTransaction>;
  recordActiveError?(error: string): Promise<UpdateTransaction>;
  finish(status: "completed" | "rolled-back" | "failed", error?: string | null): Promise<UpdateTransaction>;
  clearCompleted(): Promise<void>;
}

const defaultFileSystem: UpdateFileSystem = {
  async readFile(path) { return await readFile(path, "utf8"); },
  realpath,
  lstat,
  access,
  rename,
};
/**
 * The package tree is checked for holders by renaming it and renaming it back, because on
 * Windows that is the one operation that fails while any file under it is open. A holder is
 * usually brief: a scanner, an indexer, a file browser, or a session still shutting down.
 * The update therefore keeps checking for this long before it calls the package locked.
 */
export const PACKAGE_UNLOCK_PATIENCE_MS = 15_000;
export const UPDATE_ALREADY_RUNNING_EXIT_CODE = 75;
/** A named preview reads the registry's whole package document, which is larger than a dist-tag lookup. */
const PREVIEW_LOOKUP_TIMEOUT_MS = 30_000;
const PACKAGE_UNLOCK_INITIAL_DELAY_MS = 100;
const PACKAGE_UNLOCK_MAX_DELAY_MS = 1_000;
// Platform: Windows reports a held directory as EPERM or EBUSY; EACCES and ENOTEMPTY are the other
// spellings a rename gives to a tree something is using. Anything else is not a lock.
const PACKAGE_LOCK_CODES: ReadonlySet<string> = new Set(["EPERM", "EACCES", "EBUSY", "ENOTEMPTY"]);
const defaultSleep = async (durationMs: number): Promise<void> => await new Promise(resolvePromise => setTimeout(resolvePromise, durationMs));

/** Whether a rename failure means something holds the tree, as opposed to the tree being wrong. */
export function isPackageLockError(error: unknown): boolean {
  return error instanceof Error && "code" in error && typeof error.code === "string" && PACKAGE_LOCK_CODES.has(error.code);
}

/** What the user reads when the package stayed held for the whole patience window. */
export function lockedPackageDiagnostic(packageRoot: string, waitedMs: number, attempts: number, error: unknown): string {
  const seconds = Math.max(1, Math.round(waitedMs / 1_000));
  return PRODUCT_TEXT.diagnostic(
    `package remained locked for ${seconds}s (${attempts} checks): ${errorMessage(error)}. `
    + `Another program is holding a file under ${packageRoot}: an antivirus scan, a file browser or terminal open inside it, `
    + `or a session still shutting down. Close it and run the update again; nothing was changed.`,
  );
}
const defaultOutput: UpdateOutput = {
  stdout(message) { process.stdout.write(message); },
  stderr(message) { process.stderr.write(message); },
};

/** Bound on the child diagnostics an update keeps: enough for npm's failure reason, never a log. */
const CHILD_DIAGNOSTIC_LIMIT = 8_000;

export function createNpmProcessRunner(platform: NodeJS.Platform = process.platform): UpdateProcessRunner {
  return async (command, arguments_, request) => await new Promise((resolvePromise, rejectPromise) => {
    // Invariant: no child of the updater shares the terminal. The progress bar is the only
    // live output; a child's own text is kept, bounded, and shown with a failure or not at all.
    const stdio: StdioOptions = ["ignore", request.captureStdout ? "pipe" : "ignore", "pipe"];
    const child = platform === "win32"
      ? crossSpawn(command, [...arguments_], { stdio, windowsHide: true })
      : spawn(command, [...arguments_], { stdio });
    const stdout: Buffer[] = [];
    let stderr = "";
    child.stdout?.on("data", chunk => stdout.push(Buffer.from(chunk)));
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", chunk => { stderr = `${stderr}${chunk}`.slice(-CHILD_DIAGNOSTIC_LIMIT); });
    let settled = false;
    child.once("error", error => { if (!settled) { settled = true; rejectPromise(error); } });
    child.once("close", code => { if (!settled) { settled = true; resolvePromise({ code, stdout: Buffer.concat(stdout).toString("utf8"), stderr }); } });
  });
}

export function createUpdateLifecycleCoordinator(
  environment: NodeJS.ProcessEnv = process.env,
  fileSystem: UpdateFileSystem = defaultFileSystem,
  _output: UpdateOutput = defaultOutput,
  patience: UpdateUnlockPatience = {},
): UpdateLifecycleCoordinator {
  const paths = resolveProductPaths(environment);
  const stateStore = new ReleaseStateStore(paths.dataDir);
  return {
    async targetIsActive(targetVersion) {
      const state = await stateStore.read(), activeId = state.references.active;
      const active = activeId === null ? undefined : state.releases[activeId];
      return active?.approval === "approved" && active.packageVersion === targetVersion;
    },
    async verifyPackageUnlocked(packageRoot) {
      if (fileSystem.access) await fileSystem.access(packageRoot);
      const probe = `${packageRoot}.${PRODUCT_IDENTITY.filesystem.slug}-unlock-probe`;
      const renameTree = fileSystem.rename ?? rename;
      const windowMs = patience.windowMs ?? PACKAGE_UNLOCK_PATIENCE_MS;
      const now = patience.now ?? Date.now;
      const sleep = patience.sleep ?? defaultSleep;
      const startedAt = now();
      let delay = PACKAGE_UNLOCK_INITIAL_DELAY_MS;
      let attempts = 0;
      // Rationale: a holder found before the replacement is almost always transient,
      // so one failed rename is a reason to look again, not to abandon an update that has not
      // yet changed anything. The wait is bounded so a genuine lock still fails clearly.
      const withPatience = async (from: string, to: string, describeFailure: (error: unknown) => Error): Promise<void> => {
        while (true) {
          attempts += 1;
          try {
            await renameTree(from, to);
            return;
          } catch (error) {
            const elapsed = now() - startedAt;
            if (!isPackageLockError(error) || elapsed >= windowMs) throw describeFailure(error);
            // Rationale: the last pause is cut to the window's edge so the wait ends when promised.
            await sleep(Math.min(delay, windowMs - elapsed));
            delay = Math.min(PACKAGE_UNLOCK_MAX_DELAY_MS, delay * 2);
          }
        }
      };
      await withPatience(packageRoot, probe, error => isPackageLockError(error)
        ? new Error(lockedPackageDiagnostic(packageRoot, now() - startedAt, attempts, error))
        : new Error(PRODUCT_TEXT.diagnostic(`could not verify that the package is unlocked: ${errorMessage(error)}`)));
      // Invariant: the package tree is put back under its own name before this returns; a holder
      // that appears while it wears the probe name is waited out the same way, and if it never
      // lets go the diagnostic names where the tree is so the user can restore it.
      await withPatience(probe, packageRoot, error => new Error(PRODUCT_TEXT.diagnostic(
        `could not restore the package after checking it was unlocked: ${errorMessage(error)}. The package is at ${probe}; rename it back to ${packageRoot} before running the update again.`,
      )));
    },
    async activateInstalled(packageRoot, targetVersion, phase, onMaterializing, onWarmup) {
      const request = { packageRoot, dataDir: paths.dataDir, targetVersion, environment };
      const callbacks: UpdateActivationCallbacks = { phase, ...(onMaterializing ? { onMaterializing } : {}), ...(onWarmup ? { onWarmup } : {}) };
      // Compatibility: the tree npm just installed is newer than this updater, so its layout is
      // its own to know. A tree that serves the contract activates itself with its own code;
      // a tree from before the contract is activated here, with the layout it had then.
      const contracts = await readActivationContracts(packageRoot, fileSystem.readFile);
      if (contracts.includes(UPDATE_ACTIVATION_CONTRACT)) await delegateActivation(request, callbacks);
      else await activateInstalledRelease(request, callbacks);
    },
  };
}

const PROGRESS_BAR_WIDTH = 38;
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

/** Renders the terminal-only update meter; the visual preview shares this exact frame. */
export function renderUpdateProgressBar(percent: number, accent = SHARED_PROGRESS_ACCENT_ANSI): string {
  const bounded = Math.min(100, Math.max(0, Math.round(percent)));
  const filled = Math.round((bounded / 100) * PROGRESS_BAR_WIDTH);
  // Rationale: the completed run follows the A1 profile accent; the track and
  // percentage retain the update meter's neutral treatment.
  const gray = "\u001b[38;2;128;128;128m";
  const track = "\u001b[38;2;102;102;102m";
  return `${accent}${"━".repeat(filled)}${track}${"─".repeat(PROGRESS_BAR_WIDTH - filled)}${gray} ${bounded}%\u001b[39m`;
}

function updateProgressAccent(environment: NodeJS.ProcessEnv): string {
  return earlyAccentPalette(resolveEarlyAccentColor(environment), earlyTerminalAppearance(environment), earlyTerminalColorMode(environment)).accent;
}

function createUpdateProgress(output: UpdateOutput, enabled: boolean, accent = SHARED_PROGRESS_ACCENT_ANSI): UpdateProgress {
  let visible = false;
  let current = 0;
  let shown = -1;
  let timer: ReturnType<typeof setInterval> | null = null;
  const draw = () => {
    const rounded = Math.round(current);
    if (rounded === shown) return;
    shown = rounded;
    visible = true;
    output.stdout(`\r${renderUpdateProgressBar(rounded, accent)}`);
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
 * A decimal names the pull request a published preview records in its manifest, or the trailing
 * number of a preview published as `<version>-dev.<pull-request>` before pull requests were
 * recorded; a full version is accepted too. The registry's published manifests remain
 * authoritative: nothing is constructed from the installed package's base version.
 */
async function resolveRequestedPreview(
  fetcher: RegistryFetcher,
  registry: string | undefined,
  requested: string,
  output: UpdateOutput,
): Promise<ResolvedTarget> {
  const published = await queryPublishedVersions(fetcher, registry);
  if (published.error !== null) {
    output.stderr(`${PRODUCT_TEXT.diagnostic(`could not list the published versions: ${published.error}.`)}\n`);
    return { version: null, exitCode: 1 };
  }
  const exact = published.versions.find(entry => entry.version === requested);
  if (exact !== undefined) {
    // Rationale: naming a release here would install it through the preview path, which is a
    // different command with a different meaning.
    if (!exact.version.includes("-dev.")) {
      output.stderr(`${PRODUCT_TEXT.diagnostic(`${exact.version} is a release, not a preview; run ${PRODUCT_TEXT.commandName} update to move to the current release.`)}\n`);
      return { version: null, exitCode: 1 };
    }
    return { version: exact.version, exitCode: 0 };
  }

  const matches = previewsNumbered(published.versions, requested);
  if (matches.length === 1) return { version: matches[0]!, exitCode: 0 };
  if (matches.length > 1) {
    output.stderr(`${PRODUCT_TEXT.diagnostic(`found more than one preview for ${requested}: ${matches.join(", ")}. Name the version instead.`)}\n`);
    return { version: null, exitCode: 1 };
  }
  output.stderr(`${PRODUCT_TEXT.diagnostic(`published no preview for ${requested}.`)}\n`);
  return { version: null, exitCode: 1 };
}

/** The published versions a preview number names: by recorded pull request, or by trailing identifier. */
function previewsNumbered(versions: readonly PublishedVersion[], requested: string): string[] {
  const number = Number(requested);
  return versions
    .filter(entry => entry.pullRequest === number || entry.version.endsWith(`-dev.${requested}`))
    .map(entry => entry.version);
}

interface ManagedNpmInstallation {
  readonly packageRoot: string;
  readonly globalRoot: string;
  readonly npmCliRoot: string;
}

interface ManagedNpmResolution {
  readonly installation: ManagedNpmInstallation | null;
  readonly exitCode: number;
}

async function resolveManagedNpmInstallation(
  requestedPackageRoot: string,
  fileSystem: UpdateFileSystem,
  runner: UpdateProcessRunner,
  output: UpdateOutput,
): Promise<ManagedNpmResolution> {
  const rootLookup = await runNpm(runner, ["root", "--global"], true, output, "resolve npm's global package root");
  if (rootLookup.result === null) return { installation: null, exitCode: rootLookup.exitCode };
  const activeRootText = rootLookup.result.stdout.trim();
  if (activeRootText.length === 0) {
    output.stderr(`${PRODUCT_TEXT.diagnostic("could not verify its installation because npm returned an empty global package root.")}\n`);
    return { installation: null, exitCode: 1 };
  }

  let packageRoot: string;
  let activeGlobalRoot: string;
  try {
    [packageRoot, activeGlobalRoot] = await Promise.all([fileSystem.realpath(requestedPackageRoot), fileSystem.realpath(activeRootText)]);
  } catch (error) {
    output.stderr(`${PRODUCT_TEXT.diagnostic(`could not canonicalize the running and global npm paths: ${errorMessage(error)}`)}\n`);
    return { installation: null, exitCode: 1 };
  }

  const expectedActivePackage = resolve(activeGlobalRoot, ...PRODUCT_PACKAGE.split("/"));
  if (samePath(packageRoot, expectedActivePackage)) {
    try {
      npmPrefixForGlobalRoot(activeGlobalRoot);
      return {
        installation: {
          packageRoot,
          globalRoot: activeGlobalRoot,
          npmCliRoot: activeGlobalRoot,
        },
        exitCode: 0,
      };
    } catch (error) {
      output.stderr(`${PRODUCT_TEXT.diagnostic(`could not verify npm's active global package layout: ${errorMessage(error)}`)}\n`);
      return { installation: null, exitCode: 1 };
    }
  }

  let candidateGlobalRoot = packageRoot;
  for (const _segment of PRODUCT_PACKAGE.split("/")) candidateGlobalRoot = dirname(candidateGlobalRoot);
  let candidatePrefix: string;
  try {
    candidatePrefix = npmPrefixForGlobalRoot(candidateGlobalRoot);
  } catch {
    reportUnmanagedInstallation(output, packageRoot, activeGlobalRoot);
    return { installation: null, exitCode: 1 };
  }
  if (!samePath(packageRoot, resolve(candidateGlobalRoot, ...PRODUCT_PACKAGE.split("/")))) {
    reportUnmanagedInstallation(output, packageRoot, activeGlobalRoot);
    return { installation: null, exitCode: 1 };
  }

  const confirmation = await runNpm(
    runner,
    ["root", "--global", "--prefix", candidatePrefix],
    true,
    output,
    "confirm npm ownership of the running installation",
  );
  if (confirmation.result === null) return { installation: null, exitCode: confirmation.exitCode };
  const confirmedRootText = confirmation.result.stdout.trim();
  if (confirmedRootText.length === 0) {
    output.stderr(`${PRODUCT_TEXT.diagnostic("could not verify its installation because npm returned an empty global package root for the inferred prefix.")}\n`);
    return { installation: null, exitCode: 1 };
  }

  let confirmedRoot: string;
  try {
    confirmedRoot = await fileSystem.realpath(confirmedRootText);
  } catch (error) {
    output.stderr(`${PRODUCT_TEXT.diagnostic(`could not canonicalize npm's confirmed global package root: ${errorMessage(error)}`)}\n`);
    return { installation: null, exitCode: 1 };
  }
  if (!samePath(confirmedRoot, candidateGlobalRoot)
    || !await launchersOwnPackage(candidateGlobalRoot, fileSystem)) {
    reportUnmanagedInstallation(output, packageRoot, activeGlobalRoot);
    return { installation: null, exitCode: 1 };
  }

  return {
    installation: {
      packageRoot,
      globalRoot: candidateGlobalRoot,
      npmCliRoot: activeGlobalRoot,
    },
    exitCode: 0,
  };
}

async function launchersOwnPackage(globalRoot: string, fileSystem: UpdateFileSystem): Promise<boolean> {
  const token = `node_modules/${PRODUCT_PACKAGE}/bin/cli.js`;
  try {
    for (const launcher of updateLauncherPaths(globalRoot)) {
      const metadata = await (fileSystem.lstat ?? lstat)(launcher);
      // Platform: npm links Unix launchers; one owns the package only when it resolves to the exact entry.
      if (metadata.isSymbolicLink() && process.platform !== "win32") {
        const entry = resolve(globalRoot, ...PRODUCT_PACKAGE.split("/"), "bin", "cli.js");
        if (!samePath(await fileSystem.realpath(launcher), await fileSystem.realpath(entry))) return false;
        continue;
      }
      if (!metadata.isFile() || metadata.isSymbolicLink() || (process.platform !== "win32" && (metadata.mode & 0o111) === 0)) return false;
      if (!(await fileSystem.readFile(launcher)).replaceAll("\\", "/").includes(token)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function resolveSelfUpdateTarget(input: {
  readonly runner: UpdateProcessRunner;
  /** Reads the registry's package document for a named preview; a bounded fetch when omitted. */
  readonly fetcher: RegistryFetcher | undefined;
  /** The `npm_config_registry` value, when the user configured one. */
  readonly registry: string | undefined;
  readonly output: UpdateOutput;
  readonly channel: UpdateChannel;
  readonly distTag: string;
  readonly requested: string | undefined;
  readonly exactTarget: string | undefined;
}): Promise<ResolvedTarget> {
  if (input.exactTarget !== undefined && input.exactTarget.length > 0) {
    return resolveExactAutomaticTarget(input.exactTarget, input.channel, input.output);
  }
  return input.requested === undefined || input.requested.length === 0
    ? await resolveChannelHead(input.runner, input.distTag, input.output)
    : await resolveRequestedPreview(
      input.fetcher ?? createRegistryFetcher(PREVIEW_LOOKUP_TIMEOUT_MS),
      input.registry?.trim() || undefined,
      input.requested,
      input.output,
    );
}

function resolveExactAutomaticTarget(target: string, channel: UpdateChannel, output: UpdateOutput): ResolvedTarget {
  const version = validSemver(target);
  const expected = channel === "stable" ? "stable" : "development";
  if (version === null || releaseChannelOf(version) !== expected) {
    output.stderr(`${PRODUCT_TEXT.diagnostic(`refused invalid automatic ${expected} update target ${JSON.stringify(target)}`)}\n`);
    return { version: null, exitCode: 1 };
  }
  return { version, exitCode: 0 };
}

function reportUnmanagedInstallation(output: UpdateOutput, packageRoot: string, activeGlobalRoot: string): void {
  output.stderr(`${PRODUCT_TEXT.diagnostic(`refused to update automatically because ${packageRoot} could not be verified as an npm-managed ${PRODUCT_PACKAGE} installation; npm's active global package root is ${activeGlobalRoot}. Run npm install --global ${PRODUCT_PACKAGE} to install it manually.`)}\n`);
}

async function withUpdateExecutionLease(
  input: Parameters<typeof acquireUpdateExecutionLease>[0],
  options: SelfUpdateOptions,
  output: UpdateOutput,
  installer: UpdateInstaller,
  operation: () => Promise<number>,
): Promise<number> {
  let lease = await acquireUpdateExecutionLease(input);
  if (lease.status === "interrupted") {
    // Rationale: the owner that targeted another version is gone. Its durable transaction is rolled
    // back to the release that ran before it, so this request proceeds as an ordinary update of its
    // own target instead of reporting a dead attempt as in progress.
    const interrupted = lease.owner.targetVersion;
    const rollback = await installer.rollback(lease.transaction.priorActiveReleaseId)
      .catch(error => `rollback failed: ${errorMessage(error)}`);
    const store = new UpdateTransactionStore(input.dataDir);
    await store.finish("rolled-back", `interrupted ${interrupted} update settled by ${input.targetVersion}; ${rollback}`);
    await store.clearCompleted().catch(() => undefined);
    await reclaimDeadLease(input.dataDir, lease.owner);
    output.stdout(`${PRODUCT_TEXT.commandName} rolled back the interrupted ${interrupted} update: ${rollback}\n`);
    lease = await acquireUpdateExecutionLease(input);
  }
  if (lease.status !== "acquired") {
    options.onLeaseBusy?.(lease.owner);
    if ((options.mode ?? "manual") === "manual") {
      output.stderr(`${PRODUCT_TEXT.diagnostic(`update already in progress for ${lease.owner.targetVersion}`)}\n`);
    }
    return UPDATE_ALREADY_RUNNING_EXIT_CODE;
  }
  try {
    options.onLeaseAcquired?.(lease.owner);
    return await operation();
  } finally {
    await lease.release();
  }
}

async function readRunningPackageVersion(
  packageRoot: string,
  fileSystem: UpdateFileSystem,
  output: UpdateOutput,
): Promise<string | null> {
  try {
    const packageJson = JSON.parse(await fileSystem.readFile(resolve(packageRoot, "package.json"))) as { name?: unknown; version?: unknown };
    const version = typeof packageJson.version === "string" ? validSemver(packageJson.version) : null;
    if (packageJson.name !== PRODUCT_PACKAGE) throw new Error(`package.json does not identify ${PRODUCT_PACKAGE}`);
    if (version === null) throw new Error("package.json does not contain a valid semantic version");
    return version;
  } catch (error) {
    output.stderr(`${PRODUCT_TEXT.diagnostic(`could not read its running package version: ${errorMessage(error)}`)}\n`);
    return null;
  }
}

export async function runSelfUpdate(options: SelfUpdateOptions): Promise<number> {
  const plan = await planSelfUpdate(options);
  if (typeof plan === "number") return plan;
  return await withUpdateExecutionLease({
    dataDir: plan.paths.dataDir,
    packageRoot: plan.installation.packageRoot,
    channel: plan.channel,
    targetVersion: plan.targetVersion,
    mode: plan.mode,
  }, options, plan.output, plan.installer, async () => await runUpdateTransaction(plan));
}

type MeasurePhase = <Value>(phase: UpdateMeasuredPhase, operation: () => Promise<Value>) => Promise<Value>;

/** Everything an update decided before taking the execution lease. */
interface UpdatePlan {
  readonly output: UpdateOutput;
  readonly channel: UpdateChannel;
  readonly targetVersion: string;
  readonly progress: UpdateProgress;
  readonly installation: ManagedNpmInstallation;
  readonly paths: ProductPaths;
  readonly lifecycle: UpdateLifecycleCoordinator;
  readonly transactionStore: UpdateTransactionJournal;
  readonly installer: UpdateInstaller;
  readonly mode: "manual" | "automatic";
  readonly measure: MeasurePhase;
  readonly now: () => number;
  readonly onPhaseTiming: ((event: UpdatePhaseTimingEvent) => void) | undefined;
}

/** The transaction the update is advancing; protected replacement and activation move it on. */
interface UpdateRun {
  transaction: UpdateTransaction | null;
}

/** Resolve the running version, the target and the managed installation, or the exit code that ends the update. */
async function planSelfUpdate(options: SelfUpdateOptions): Promise<UpdatePlan | number> {
  const fileSystem = options.fileSystem ?? defaultFileSystem;
  const output = options.output ?? defaultOutput;
  const runner = options.runner ?? createNpmProcessRunner();
  const channel = options.channel ?? "stable";
  const distTag = UPDATE_DIST_TAGS[channel];
  const now = options.now ?? (() => performance.now());
  const measure: MeasurePhase = async (phase, operation) => {
    const startedAt = now();
    try { return await operation(); }
    finally { options.onPhaseTiming?.({ phase, durationMs: Math.max(0, now() - startedAt) }); }
  };

  const runningVersion = await measure("package-version", async () => await readRunningPackageVersion(options.packageRoot, fileSystem, output));
  if (runningVersion === null) return 1;

  const requested = options.target?.trim();
  const exactTarget = options.resolvedTarget?.trim();
  const environment = options.environment ?? process.env;
  const resolved = await measure("target-resolution", async () => await resolveSelfUpdateTarget({
    runner, output, channel, distTag, requested, exactTarget, fetcher: options.fetcher, registry: environment.npm_config_registry,
  }));
  if (resolved.version === null) return resolved.exitCode;
  const targetVersion = resolved.version;
  // Invariant: a channel head below the running release on the same channel is never installed, so a
  // lagging or rolled-back dist-tag cannot downgrade. Switching channels and named previews stay deliberate.
  const sameChannel = releaseChannelOf(runningVersion) === (channel === "stable" ? "stable" : "development");
  if ((requested === undefined || requested.length === 0) && sameChannel
    && targetVersion !== runningVersion && !isNewerRelease(targetVersion, runningVersion)) {
    output.stdout(`${PRODUCT_TEXT.commandName} is up to date — no update needed.\n`);
    return 0;
  }
  // Rationale: no full stop after a version: it already ends in a dot-separated identifier,
  // and a trailing one reads as part of the version rather than as punctuation.
  output.stdout(`${PRODUCT_TEXT.commandName} update: ${runningVersion} → ${targetVersion}\n`);
  const progress = createUpdateProgress(output, options.progress ?? (options.output === undefined && process.stdout.isTTY === true), updateProgressAccent(environment));

  const managed = await measure("global-root", async () => await resolveManagedNpmInstallation(options.packageRoot, fileSystem, runner, output));
  if (managed.installation === null) return managed.exitCode;

  const paths = resolveProductPaths(environment);
  return {
    output,
    channel,
    targetVersion,
    progress,
    installation: managed.installation,
    paths,
    lifecycle: options.lifecycle ?? createUpdateLifecycleCoordinator(environment, fileSystem, output),
    transactionStore: options.transactionStore ?? new UpdateTransactionStore(paths.dataDir),
    installer: options.installer ?? createProtectedUpdateInstaller(paths, environment),
    mode: options.mode ?? "manual",
    measure,
    now,
    onPhaseTiming: options.onPhaseTiming,
  };
}

async function runUpdateTransaction(plan: UpdatePlan): Promise<number> {
  const { output, progress, installer, lifecycle, transactionStore, targetVersion } = plan;
  const { packageRoot, npmCliRoot } = plan.installation;
  const run: UpdateRun = { transaction: await transactionStore.read() };
  try {
    if ((!run.transaction || run.transaction.status === "completed") && await lifecycle.targetIsActive(targetVersion)) {
      await installer.maintenance();
      await transactionStore.clearCompleted();
      output.stdout(`${PRODUCT_TEXT.commandName} is up to date — no update needed.\n`);
      return 0;
    }
    let npmCli: string | undefined;
    try {
      npmCli = await installer.preflight(npmCliRoot);
    } catch (error) {
      throw new UpdatePreflightFailure(errorMessage(error));
    }
    // Rationale: the bar first appears only after every non-mutating replacement prerequisite passes.
    progress.set(3, 15);
    const protection = await installer.protectPriorRelease(packageRoot);
    run.transaction = await transactionStore.begin({
      channel: plan.channel,
      targetVersion,
      packageRoot,
      priorActiveReleaseId: protection.priorActiveReleaseId,
    });
    if (phaseBefore(run.transaction.phase, "ownership-released")) {
      await plan.measure("ownership-release", async () => { await lifecycle.verifyPackageUnlocked(packageRoot); });
      run.transaction = await transactionStore.advance("ownership-released");
    }
    progress.set(15, 70);
    if (phaseBefore(run.transaction.phase, "package-installed")) {
      const cancelled = await replaceUpdatePackage(plan, run, protection, npmCli);
      if (cancelled !== null) return cancelled;
    }
    return await activateUpdate(plan, run);
  } catch (error) {
    return await settleUpdateFailure(plan, run.transaction, error);
  }
}

/** Replace the package under protection; returns an exit code when the user cancelled, null once installed. */
async function replaceUpdatePackage(
  plan: UpdatePlan,
  run: UpdateRun,
  protection: UpdatePriorReleaseProtection,
  npmCli: string | undefined,
): Promise<number | null> {
  const { output, progress, transactionStore } = plan;
  const transaction = run.transaction!;
  const priorRelease = protection.approvedRelease(transaction.priorActiveReleaseId ?? protection.priorActiveReleaseId);
  if (priorRelease === undefined) {
    throw new Error(PRODUCT_TEXT.diagnostic("cannot protect package replacement because no approved prior release is available"));
  }
  const replacement = await plan.measure("npm-install", async () => await plan.installer.replacePackage({
    globalRoot: plan.installation.globalRoot,
    npmCliRoot: plan.installation.npmCliRoot,
    ...(npmCli === undefined ? {} : { npmCli }),
    packageRoot: plan.installation.packageRoot,
    transaction,
    priorRelease,
    output,
    onRecoveryState: async recovery => {
      if (transactionStore.setRecovery) run.transaction = await transactionStore.setRecovery(recovery) ?? run.transaction;
    },
  }));
  // Rationale: npm's own text explains a failed replacement and says nothing about a
  // successful one, so it reaches the terminal only when the installation did not happen.
  if (replacement.outcome !== "installed") reportChildDiagnostics(output, replacement);
  if (replacement.outcome === "installed") run.transaction = await transactionStore.advance("package-installed");
  if (replacement.cancelled) {
    progress.clear();
    output.stderr(`${PRODUCT_TEXT.diagnostic("update cancelled safely; the launcher is available and the transaction can be resumed.")}\n`);
    return 130;
  }
  if (replacement.outcome !== "installed") {
    throw new UpdateFailure(unsuccessfulCode(replacement.npmExitCode), `npm exited with status ${formatExitCode(replacement.npmExitCode)}`);
  }
  return null;
}

/** Activate the installed package, commit maintenance, and only then report success. */
async function activateUpdate(plan: UpdatePlan, run: UpdateRun): Promise<number> {
  const { output, progress, transactionStore, now, onPhaseTiming, paths } = plan;
  progress.set(70, MATERIALIZE_PROGRESS.from);
  let activationPhaseStartedAt = now();
  const recordActivationPhase = async (phase: UpdateActivationPhase) => {
    onPhaseTiming?.({ phase, durationMs: Math.max(0, now() - activationPhaseStartedAt) });
    run.transaction = await transactionStore.advance(phase);
    progress.set(ACTIVATION_PROGRESS[phase].at, ACTIVATION_PROGRESS[phase].creepTo);
    activationPhaseStartedAt = now();
  };
  await plan.lifecycle.activateInstalled(plan.installation.packageRoot, plan.targetVersion, recordActivationPhase,
    ({ completed, total }) => progress.set(MATERIALIZE_PROGRESS.from
      + (MATERIALIZE_PROGRESS.to - MATERIALIZE_PROGRESS.from) * (total > 0 ? Math.min(1, completed / total) : 0)),
    state => {
      if (state === "started") { activationPhaseStartedAt = now(); progress.set(98, 99); }
      else {
        onPhaseTiming?.({ phase: "warmup", durationMs: Math.max(0, now() - activationPhaseStartedAt) });
        activationPhaseStartedAt = now(); progress.set(99);
      }
    });
  const transactionStartedAt = now();
  const transaction = run.transaction;
  if (transaction?.recovery?.capsulePath) await removeUpdateRecoveryCapsule(paths.dataDir, transaction.transactionId);
  // Invariant: successful output follows the durable cleanup disposition. Slow recursive
  // removal belongs to the detached worker started by this maintenance coordinator.
  await plan.installer.maintenance();
  // Concurrency: this is the launch cutover. No failure-prone update work follows success.
  await transactionStore.finish("completed");
  await Promise.all([transactionStore.clearCompleted(), invalidateReleaseCheckCache(paths.configDir)]).catch(() => undefined);
  onPhaseTiming?.({ phase: "transaction-complete", durationMs: Math.max(0, now() - transactionStartedAt) });
  progress.finish();
  output.stdout(`${PRODUCT_TEXT.commandName} updated successfully to ${plan.targetVersion}\n`);
  return 0;
}

async function settleUpdateFailure(plan: UpdatePlan, transaction: UpdateTransaction | null, error: unknown): Promise<number> {
  const { output, transactionStore } = plan;
  plan.progress.clear();
  const message = errorMessage(error);
  if (error instanceof UpdatePreflightFailure) {
    output.stderr(`${PRODUCT_TEXT.diagnostic(`update could not start safely: ${message}. Nothing was changed. Retry with npm x -y -- ${PRODUCT_PACKAGE}-install`)}\n`);
    return 1;
  }
  const rollback = await plan.installer.rollback(transaction?.priorActiveReleaseId ?? null)
    .catch(rollbackError => `rollback failed: ${errorMessage(rollbackError)}`);
  if (transaction) await transactionStore.finish(rollback === "rolled back" ? "rolled-back" : "failed", `${message}; ${rollback}`);
  output.stderr(updateFailureLine(message, rollback, transactionStore.path));
  return error instanceof UpdateFailure ? error.exitCode : 1;
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

async function runNpm(runner: UpdateProcessRunner, arguments_: readonly string[], captureStdout: boolean, output: UpdateOutput, action: string, reportNonzero = true): Promise<{ result: ProcessResult | null; exitCode: number }> {
  let result: ProcessResult;
  try { result = await runner("npm", arguments_, { captureStdout }); }
  catch (error) { output.stderr(`${PRODUCT_TEXT.diagnostic(`could not execute npm to ${action}: ${errorMessage(error)}`)}\n`); return { result: null, exitCode: 1 }; }
  if (result.code !== 0 && reportNonzero) {
    const explained = reportChildDiagnostics(output, result);
    output.stderr(`${PRODUCT_TEXT.diagnostic(`could not ${action}; npm exited with status ${formatExitCode(result.code)}.${explained ? " Review npm's diagnostics above." : ""}`)}\n`);
    return { result: null, exitCode: unsuccessfulCode(result.code) };
  }
  return { result, exitCode: 0 };
}
/** Prints what a failed child said, bounded, and reports whether there was anything to print. */
function reportChildDiagnostics(output: UpdateOutput, result: { readonly stdout: string; readonly stderr?: string }): boolean {
  const text = [result.stdout, result.stderr ?? ""].map(part => part.trim()).filter(part => part.length > 0).join("\n").slice(-CHILD_DIAGNOSTIC_LIMIT);
  if (text.length === 0) return false;
  output.stderr(`${text}\n`);
  return true;
}
/** One reason and one next step; routine rollback detail stays in the journal. */
function updateFailureLine(message: string, rollback: string, journalPath: string): string {
  const note = rollback.startsWith("rollback failed") ? ` (${rollback})` : "";
  return `${PRODUCT_TEXT.diagnostic(`update failed: ${message}${note}. Run ${PRODUCT_TEXT.commandName} update to retry. Details: ${journalPath}`)}\n`;
}

function phaseBefore(current: UpdateTransactionPhase, target: UpdateTransactionPhase): boolean {
  const phases = ["shutdown-intent", "ownership-released", "package-installed", "materialized", "certified", "active-reference-committed"] as const;
  return phases.indexOf(current) < phases.indexOf(target);
}

class UpdateFailure extends Error {
  readonly exitCode: number;
  constructor(exitCode: number, message: string) { super(message); this.exitCode = exitCode; }
}

class UpdatePreflightFailure extends Error {}

function unsuccessfulCode(code: number | null): number { return code === null || code === 0 ? 1 : code; }
function formatExitCode(code: number | null): string { return code === null ? "unknown" : String(code); }
