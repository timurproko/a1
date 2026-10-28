import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { valid as validSemver } from "semver";
import { readLaunchContext } from "../launch-context/index.js";
import { resolveProductPaths } from "../lifecycle/index.js";
import { CohortStateStore, type CohortState } from "./cohort-state.js";
import { processIsAlive } from "./process-cleanup.js";
import { isNewerRelease, releaseChannelOf, type AvailableRelease, type ReleaseChannel } from "./latest-release.js";
import { readCertifiedReleaseManifest, resolveReleaseEntryPoint } from "./release-store.js";
import { acquireUpdateExecutionLease, readUpdateExecutionOwner } from "./update-execution-lease.js";
import { UpdateTransactionStore } from "./update-transaction.js";
import { runSelfUpdate, UPDATE_ALREADY_RUNNING_EXIT_CODE, type UpdateOutput } from "./update.js";

export const AUTOMATIC_UPDATE_STATE_SCHEMA = 1;
export const AUTOMATIC_UPDATE_RETRY_MS = 24 * 60 * 60_000;
const AUTOMATIC_UPDATE_STATE_FILENAME = "automatic-update.json";
const MAX_STATE_BYTES = 16_384;
const OBSERVER_POLL_MS = 250;
const WORKER_START_GRACE_MS = 5_000;

export interface AutomaticUpdateState {
  readonly schema: typeof AUTOMATIC_UPDATE_STATE_SCHEMA;
  readonly channel: ReleaseChannel;
  readonly targetVersion: string;
  readonly status: "running" | "installed" | "failed";
  readonly attemptedAt: number;
  readonly updatedAt: number;
  readonly installedVersion: string | null;
  readonly failure: string | null;
}

export class AutomaticUpdateStateStore {
  readonly path: string;
  constructor(dataDir: string) { this.path = resolve(dataDir, AUTOMATIC_UPDATE_STATE_FILENAME); }

  async read(): Promise<AutomaticUpdateState | null> {
    let source: string;
    try { source = await readFile(this.path, "utf8"); }
    catch (error) {
      if (hasCode(error, "ENOENT")) return null;
      throw error;
    }
    if (Buffer.byteLength(source, "utf8") > MAX_STATE_BYTES) throw new Error("automatic update state is oversized");
    const value = JSON.parse(source) as AutomaticUpdateState;
    validateState(value);
    return value;
  }

  async write(value: AutomaticUpdateState): Promise<void> {
    validateState(value);
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    const temporary = `${this.path}.${process.pid}.${randomUUID()}.tmp`;
    const file = await open(temporary, "wx", 0o600);
    try {
      await file.writeFile(`${JSON.stringify(value)}\n`);
      await file.sync();
    } finally {
      await file.close();
    }
    try { await rename(temporary, this.path); }
    catch (error) { await rm(temporary, { force: true }); throw error; }
  }
}

export interface AutomaticUpdateRequestOptions {
  readonly release: AvailableRelease;
  readonly runningVersion: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly signal?: AbortSignal;
  readonly now?: () => number;
  readonly spawnWorker?: (entry: string, arguments_: readonly string[], environment: NodeJS.ProcessEnv) => Promise<void>;
  readonly sleep?: (durationMs: number) => Promise<void>;
  /** Focused-test seams; production resolves both from the certified launch cohort. */
  readonly worker?: { readonly entry: string; readonly packageRoot: string };
  readonly activeVersion?: () => Promise<string | null>;
}

/** Start or observe one silent update and resolve with the active newer version once restart is useful. */
export async function requestAutomaticUpdate(options: AutomaticUpdateRequestOptions): Promise<string | null> {
  if (options.signal?.aborted) return null;
  const environment = options.environment ?? process.env;
  const paths = resolveProductPaths(environment);
  const now = options.now ?? Date.now;
  const store = new AutomaticUpdateStateStore(paths.dataDir);
  let existing: AutomaticUpdateState | null;
  try { existing = await store.read(); }
  catch { return null; }

  const readActiveVersion = options.activeVersion ?? (async () => await activeNewerVersion(paths.dataDir, options.runningVersion, options.release));
  const active = await readActiveVersion();
  if (active !== null) return active;
  let owner: Awaited<ReturnType<typeof readUpdateExecutionOwner>>;
  try { owner = await readUpdateExecutionOwner(paths.dataDir); }
  catch { return null; }
  let transaction: Awaited<ReturnType<UpdateTransactionStore["read"]>>;
  try { transaction = await new UpdateTransactionStore(paths.dataDir).read(); }
  catch { return null; }
  // Invariant: recovery of a foreign in-progress transaction belongs to its own owner.
  if (transaction?.status === "active" && (transaction.targetVersion !== options.release.version
    || transaction.channel !== (options.release.channel === "stable" ? "stable" : "next"))) return null;
  if (existing?.status === "running" && now() - existing.updatedAt >= WORKER_START_GRACE_MS
    && (owner === null || !processIsAlive(owner.pid))) {
    // Invariant: a coordinator record is not ownership. Settle only when no transaction
    // remains to recover; never overwrite or roll back a foreign in-progress target.
    if (transaction === null) {
      existing = { ...existing, status: "failed", updatedAt: now(), failure: "worker-exited" };
      await store.write(existing).catch(() => undefined);
    }
  }
  if (existing?.status === "failed" && existing.channel === options.release.channel && now() - existing.attemptedAt >= 0
    && now() - existing.attemptedAt < AUTOMATIC_UPDATE_RETRY_MS
    && !isNewerRelease(options.release.version, existing.targetVersion)) return null;

  let worker = options.worker;
  if (worker === undefined) {
    const launch = readLaunchContext(environment, "release");
    const cohort = await new CohortStateStore(paths.dataDir).read();
    const record = launch.releaseId === undefined ? undefined : cohort.releases[launch.releaseId];
    if (!record || record.approval !== "approved" || record.releaseRoot !== launch.releaseRoot
      || record.contentDigest !== launch.releaseDigest) return null;
    const selected = await readCertifiedReleaseManifest(record, resolve(paths.dataDir, "releases"));
    worker = {
      entry: await resolveReleaseEntryPoint(selected, "bin/automatic-update.js"),
      packageRoot: selected.packageRoot,
    };
  }
  const arguments_ = [
    "--package-root", worker.packageRoot,
    "--channel", options.release.channel,
    "--target-version", options.release.version,
    "--data-dir", paths.dataDir,
  ];
  if (owner === null || !processIsAlive(owner.pid)) {
    try { await (options.spawnWorker ?? spawnAutomaticUpdateWorker)(worker.entry, arguments_, environment); }
    catch {
      // Invariant: no worker began this attempt. Do not invent a successful install or an owner.
      await store.write(state({ packageRoot: worker.packageRoot, channel: options.release.channel,
        targetVersion: options.release.version, dataDir: paths.dataDir }, "failed", now(), null, "worker-start-failed")).catch(() => undefined);
      return null;
    }
  }

  const startedAt = now();
  const sleep = options.sleep ?? (async durationMs => await new Promise<void>(resolvePromise => {
    const timer = setTimeout(resolvePromise, durationMs);
    timer.unref?.();
  }));
  while (!options.signal?.aborted) {
    const installed = await readActiveVersion();
    if (installed !== null) return installed;
    const state = await store.read().catch(() => null);
    if (state?.targetVersion === options.release.version && state.status === "failed" && state.attemptedAt >= startedAt) return null;
    const owner = await readUpdateExecutionOwner(paths.dataDir).catch(() => null);
    if ((owner === null || !processIsAlive(owner.pid)) && now() - startedAt >= WORKER_START_GRACE_MS) return null;
    await sleep(OBSERVER_POLL_MS);
  }
  return null;
}

export async function runAutomaticUpdateWorker(argv: readonly string[], environment: NodeJS.ProcessEnv = process.env): Promise<number> {
  const parsed = parseWorkerArguments(argv);
  const paths = resolveProductPaths(environment);
  if (!samePath(parsed.dataDir, paths.dataDir)) return 1;
  let verified = false;
  try {
    const launch = readLaunchContext(environment, "release");
    const cohort = await new CohortStateStore(paths.dataDir).read();
    const record = launch.releaseId === undefined ? undefined : cohort.releases[launch.releaseId];
    if (record?.approval === "approved" && samePath(record.releaseRoot, launch.releaseRoot ?? "")
      && record.contentDigest === launch.releaseDigest) {
      const selected = await readCertifiedReleaseManifest(record, resolve(paths.dataDir, "releases"));
      verified = samePath(selected.packageRoot, parsed.packageRoot);
    }
  } catch { /* Security: invalid provenance fails closed without running the updater. */ }
  if (!verified) {
    await recordAutomaticPreflightFailure(parsed, paths.dataDir);
    return 1;
  }
  const store = new AutomaticUpdateStateStore(paths.dataDir);
  const attemptedAt = Date.now();
  const output: UpdateOutput = { stdout() {}, stderr() {} };
  let acquired = false;
  let runningWrite: Promise<void> = Promise.resolve();
  try {
    const code = await runSelfUpdate({
      packageRoot: parsed.packageRoot,
      channel: parsed.channel === "stable" ? "stable" : "next",
      resolvedTarget: parsed.targetVersion,
      mode: "automatic",
      environment,
      output,
      progress: false,
      onLeaseAcquired: () => {
        acquired = true;
        runningWrite = store.write(state(parsed, "running", attemptedAt, null, null));
      },
    });
    if (code === UPDATE_ALREADY_RUNNING_EXIT_CODE) return 0;
    if (code !== 0) {
      await runningWrite;
      if (acquired) await store.write(state(parsed, "failed", attemptedAt, null, `exit-${code}`));
      else await recordAutomaticPreflightFailure(parsed, paths.dataDir);
      return code;
    }
    const active = await activeRelease(paths.dataDir);
    if (active === null || releaseChannelOf(active.packageVersion) !== parsed.channel
      || (active.packageVersion !== parsed.targetVersion && !isNewerRelease(active.packageVersion, parsed.targetVersion))) {
      if (acquired) {
        await runningWrite;
        await store.write(state(parsed, "failed", attemptedAt, null, "target-not-active"));
      } else await recordAutomaticPreflightFailure(parsed, paths.dataDir);
      return 1;
    }
    await runningWrite;
    await store.write(state(parsed, "installed", attemptedAt, active.packageVersion, null));
    return 0;
  } catch (error) {
    await runningWrite.catch(() => undefined);
    if (acquired) await store.write(state(parsed, "failed", attemptedAt, null, errorMessage(error).slice(0, 512))).catch(() => undefined);
    else await recordAutomaticPreflightFailure(parsed, paths.dataDir);
    return 1;
  }
}

async function recordAutomaticPreflightFailure(parsed: WorkerArguments, dataDir: string): Promise<void> {
  // Security: even a rejected worker must claim the ordinary update lease before recording
  // failure, so it cannot overwrite another owner's result or an unfinished transaction.
  const lease = await acquireUpdateExecutionLease({ dataDir, packageRoot: parsed.packageRoot,
    channel: parsed.channel === "stable" ? "stable" : "next", targetVersion: parsed.targetVersion, mode: "automatic" }).catch(() => null);
  if (lease?.status !== "acquired") return;
  try {
    if (await new UpdateTransactionStore(dataDir).read() !== null) return;
    const store = new AutomaticUpdateStateStore(dataDir);
    const existing = await store.read();
    if (existing !== null && (existing.targetVersion !== parsed.targetVersion || existing.status === "installed")) return;
    await store.write(state(parsed, "failed", Date.now(), null, "worker-preflight-failed"));
  } catch { /* Rationale: preflight failure is best effort; never mask the rejected worker. */ }
  finally { await lease.release().catch(() => undefined); }
}

async function spawnAutomaticUpdateWorker(entry: string, arguments_: readonly string[], environment: NodeJS.ProcessEnv): Promise<void> {
  const child = spawn(process.execPath, [entry, ...arguments_], {
    detached: true,
    env: environment,
    stdio: "ignore",
    windowsHide: true,
  });
  await new Promise<void>((resolvePromise, rejectPromise) => {
    child.once("spawn", resolvePromise);
    child.once("error", rejectPromise);
  });
  child.unref();
}

async function activeNewerVersion(dataDir: string, runningVersion: string, target: AvailableRelease): Promise<string | null> {
  const active = await activeRelease(dataDir);
  return active !== null && releaseChannelOf(active.packageVersion) === target.channel
    && isNewerRelease(active.packageVersion, runningVersion)
    && (active.packageVersion === target.version || isNewerRelease(active.packageVersion, target.version))
    ? active.packageVersion : null;
}

async function activeRelease(dataDir: string): Promise<CohortState["releases"][string] | null> {
  const cohort = await new CohortStateStore(dataDir).read();
  const activeId = cohort.references.active;
  if (activeId === null) return null;
  const active = cohort.releases[activeId];
  return active?.approval === "approved" ? active : null;
}

function state(
  parsed: WorkerArguments,
  status: AutomaticUpdateState["status"],
  attemptedAt: number,
  installedVersion: string | null,
  failure: string | null,
): AutomaticUpdateState {
  return {
    schema: AUTOMATIC_UPDATE_STATE_SCHEMA,
    channel: parsed.channel,
    targetVersion: parsed.targetVersion,
    status,
    attemptedAt,
    updatedAt: Date.now(),
    installedVersion,
    failure,
  };
}

interface WorkerArguments {
  readonly packageRoot: string;
  readonly channel: ReleaseChannel;
  readonly targetVersion: string;
  readonly dataDir: string;
}

function parseWorkerArguments(argv: readonly string[]): WorkerArguments {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined || values.has(key)) throw new Error("invalid automatic update worker arguments");
    values.set(key, value);
  }
  const packageRoot = values.get("--package-root");
  const channel = values.get("--channel");
  const targetVersion = values.get("--target-version");
  const dataDir = values.get("--data-dir");
  if (!packageRoot || (channel !== "stable" && channel !== "development") || !targetVersion || !dataDir
    || validSemver(targetVersion) === null) throw new Error("incomplete automatic update worker arguments");
  return { packageRoot, channel, targetVersion, dataDir };
}

function validateState(value: AutomaticUpdateState): void {
  if (value.schema !== AUTOMATIC_UPDATE_STATE_SCHEMA || (value.channel !== "stable" && value.channel !== "development")
    || validSemver(value.targetVersion) === null || !["running", "installed", "failed"].includes(value.status)
    || !Number.isFinite(value.attemptedAt) || !Number.isFinite(value.updatedAt)
    || (value.installedVersion !== null && validSemver(value.installedVersion) === null)
    || (value.failure !== null && (typeof value.failure !== "string" || value.failure.length > 512))) {
    throw new Error("invalid automatic update state");
  }
}

function samePath(left: string, right: string): boolean {
  const canonicalLeft = resolve(left);
  const canonicalRight = resolve(right);
  return process.platform === "win32"
    ? canonicalLeft.toLowerCase() === canonicalRight.toLowerCase()
    : canonicalLeft === canonicalRight;
}

function hasCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
