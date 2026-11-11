import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { MaterializedRelease } from "./release-store.js";
import { selectOrdinaryLaunchReleaseId } from "./ordinary-launch-selection.js";
import { PRODUCT_IDENTITY } from "../../product-identity.js";

export const RELEASE_STATE_SCHEMA = PRODUCT_IDENTITY.protocol.releaseCohortSchema;
const RELEASE_ID_PATTERN = /^[0-9A-Za-z.+_-]+-[a-f0-9]{20}$/;
/** Minimum age retention; live, uncertain, and legacy ownership independently overrides age. */
export const RELEASE_RETENTION_MS = 7 * 24 * 60 * 60 * 1_000;

export type ReleaseApproval = "candidate" | "approved" | "rejected";

export interface ReleaseRecord {
  readonly releaseId: string;
  readonly releaseRoot: string;
  readonly packageVersion: string;
  readonly contentDigest: string;
  readonly launchContract?: string;
  /** Only binaries implementing launch claims may become age-collectible. */
  readonly lifetimeClaims?: true;
  readonly approval: ReleaseApproval;
  readonly materializedAt: string;
  /** When the release was approved; retention measures its age from this instant. */
  readonly certifiedAt: string | null;
  readonly diagnosticsPath: string | null;
}

export interface ReleaseReferences {
  readonly active: string | null;
  readonly pending: string | null;
  readonly approved: string | null;
  readonly rollback: string | null;
  readonly retention: readonly string[];
}

export interface ActiveReleaseTransactionReference {
  readonly status: "active" | "completed" | "rolled-back" | "failed";
  readonly priorActiveReleaseId: string | null;
}

export type ReleaseCleanupStage = "detached" | "trash";

export interface ReleaseCleanupDisposition {
  readonly release: ReleaseRecord;
  readonly stage: ReleaseCleanupStage;
  readonly trashPath: string | null;
  readonly attempts: number;
  readonly lastAttemptAt: string | null;
  readonly lastError: string | null;
}

export interface ReleaseCleanupDiagnostic {
  readonly releaseId: string;
  readonly stage: string;
  readonly attemptedAt: string;
  readonly error: string;
}

export type ReleaseCleanupWorkerStatus = "scheduled" | "running" | "completed" | "blocked" | "continued" | "failed" | "skipped";

export interface ReleaseCleanupWorkerRun {
  readonly runId: string;
  readonly status: ReleaseCleanupWorkerStatus;
  readonly scheduledAt: string;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly pid: number | null;
  readonly batches: number;
  readonly attempted: number;
  readonly completed: number;
  readonly remaining: number;
  readonly error: string | null;
}

export interface ReleaseCleanupWorkerSummary {
  readonly batches: number;
  readonly attempted: number;
  readonly completed: number;
  readonly remaining: number;
}

export interface ReleaseCleanupState {
  readonly pending: Readonly<Record<string, ReleaseCleanupDisposition>>;
  readonly diagnostics: readonly ReleaseCleanupDiagnostic[];
  readonly workerRuns: readonly ReleaseCleanupWorkerRun[];
}

export interface ReleaseUseClaim {
  readonly releaseId: string;
  readonly pid: number;
  /** An interrupted handoff is uncertain and must remain protected. */
  readonly phase: "launching" | "running";
}

export interface ReleaseState {
  readonly schema: typeof RELEASE_STATE_SCHEMA;
  readonly revision: number;
  readonly releases: Readonly<Record<string, ReleaseRecord>>;
  readonly references: ReleaseReferences;
  readonly cleanup: ReleaseCleanupState;
  readonly uses?: Readonly<Record<string, ReleaseUseClaim>>;
}

export interface ProtectedReleaseInputs {
  /** Releases the reconciling command itself runs from; they are never collected under it. */
  readonly ownReleaseIds?: readonly string[];
  readonly transaction?: ActiveReleaseTransactionReference | null;
  /** Clock for the age window; defaults to the wall clock. */
  readonly now?: number;
  /** Age window measured from approval; defaults to seven days. */
  readonly retentionMs?: number;
}

export interface ProtectedReleasePlan {
  readonly protectedReleaseIds: readonly string[];
  readonly retainedReleaseIds: readonly string[];
  readonly collectibleReleaseIds: readonly string[];
}

export interface OrphanReleaseDisposition {
  readonly release: ReleaseRecord;
  readonly stage: ReleaseCleanupStage;
  readonly trashPath?: string | null;
}

export interface ReleaseRetentionReconciliation {
  readonly state: ReleaseState;
  readonly plan: ProtectedReleasePlan;
  readonly detachedReleaseIds: readonly string[];
}

/**
 * Age-based retention. A release stays while a selector names it (active, its rollback, or a
 * candidate still being certified), while an unfinished update may return to it, while the
 * reconciling command runs from it, or while its approval is younger than the retention window.
 * Process-lifetime claims override age; legacy approved binaries remain conservatively retained.
 */
export function planProtectedReleases(state: ReleaseState, inputs: ProtectedReleaseInputs = {}): ProtectedReleasePlan {
  const protectedIds = new Set<string>();
  for (const claim of Object.values(state.uses ?? {})) if (releaseUseIsLive(claim)) protectedIds.add(claim.releaseId);
  for (const id of [state.references.active, state.references.pending, state.references.approved, state.references.rollback]) {
    if (id !== null) protectedIds.add(id);
  }
  for (const id of inputs.ownReleaseIds ?? []) protectedIds.add(id);
  if (inputs.transaction?.status === "active" && inputs.transaction.priorActiveReleaseId !== null) {
    protectedIds.add(inputs.transaction.priorActiveReleaseId);
  }
  const now = inputs.now ?? Date.now();
  const window = inputs.retentionMs ?? RELEASE_RETENTION_MS;
  for (const release of Object.values(state.releases)) {
    if (withinRetention(release, now, window) || (release.approval === "approved" && release.lifetimeClaims !== true)) protectedIds.add(release.releaseId);
  }
  const protectedReleaseIds = [...protectedIds].sort();
  const known = Object.keys(state.releases).sort();
  return {
    protectedReleaseIds,
    retainedReleaseIds: known.filter(id => protectedIds.has(id)),
    collectibleReleaseIds: known.filter(id => !protectedIds.has(id)),
  };
}

/**
 * Whether a release is young enough to keep. An approved release counts from its approval; a
 * candidate still awaiting certification counts from its materialization so concurrent work is
 * not collected under it. A record without a readable timestamp is treated as old.
 */
export function withinRetention(release: ReleaseRecord, now: number, retentionMs: number = RELEASE_RETENTION_MS): boolean {
  if (release.approval === "rejected") return false;
  const stamp = release.approval === "approved" ? release.certifiedAt : release.materializedAt;
  const at = stamp === null ? Number.NaN : Date.parse(stamp);
  return Number.isFinite(at) && now - at < retentionMs;
}

/** Serializes validated release-state revisions under a lock and commits each update atomically. */
export class ReleaseStateStore {
  readonly path: string;

  constructor(dataDir: string) {
    this.path = resolve(dataDir, "release-state.json");
  }

  async read(): Promise<ReleaseState> {
    try {
      const state = normalizeState(JSON.parse(await readFile(this.path, "utf8")));
      validateState(state);
      return state;
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return emptyState();
      throw error;
    }
  }

  async update(operation: (current: ReleaseState) => ReleaseState | Promise<ReleaseState>): Promise<ReleaseState> {
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    const lockPath = `${this.path}.lock`;
    const lock = await acquireLock(lockPath);
    try {
      const current = await this.read();
      const next = await operation(current);
      validateTransition(current, next);
      const committed: ReleaseState = { ...next, revision: current.revision + 1 };
      const temporary = `${this.path}.${process.pid}.${randomUUID()}.tmp`;
      const file = await open(temporary, "wx", 0o600);
      try {
        await file.writeFile(JSON.stringify(committed, null, 2));
        await file.sync();
      } finally {
        await file.close();
      }
      await rename(temporary, this.path);
      return committed;
    } finally {
      await lock.close();
      await rm(lockPath, { force: true });
    }
  }

  async recordCandidate(release: MaterializedRelease): Promise<ReleaseState> {
    return await this.update(current => {
      const existing = current.releases[release.releaseId];
      const record: ReleaseRecord = existing ?? {
        releaseId: release.releaseId,
        releaseRoot: release.releaseRoot,
        packageVersion: release.packageVersion,
        contentDigest: release.contentDigest,
        ...(release.launchContract === undefined ? {} : { launchContract: release.launchContract }),
        ...(release.files.some(file => file.path === "dist/foundation/release/release-use.js") ? { lifetimeClaims: true as const } : {}),
        approval: "candidate",
        materializedAt: new Date().toISOString(),
        certifiedAt: null,
        diagnosticsPath: null,
      };
      return {
        ...current,
        releases: { ...current.releases, [release.releaseId]: record },
        references: {
          ...current.references,
          pending: current.references.active === release.releaseId ? current.references.pending : release.releaseId,
        },
      };
    });
  }

  async approve(releaseId: string, diagnosticsPath: string): Promise<ReleaseState> {
    return await this.update(current => {
      const release = requiredRelease(current, releaseId);
      return {
        ...current,
        releases: { ...current.releases, [releaseId]: { ...release, approval: "approved", certifiedAt: new Date().toISOString(), diagnosticsPath } },
        references: { ...current.references, approved: releaseId, pending: current.references.active === releaseId ? null : releaseId },
      };
    });
  }

  async activate(releaseId: string): Promise<ReleaseState> {
    return await this.update(current => {
      const release = requiredRelease(current, releaseId);
      if (release.approval !== "approved") throw new Error(`cannot activate unverified release ${releaseId}`);
      const prior = current.references.active;
      return {
        ...current,
        references: {
          ...current.references,
          active: releaseId,
          pending: null,
          approved: releaseId,
          rollback: prior && prior !== releaseId ? prior : current.references.rollback,
        },
      };
    });
  }

  /** Atomically advances ordinary launch without allowing an older installation to roll active state back. */
  async activateForLaunch(releaseId: string, replaceUnlaunchableActiveId?: string): Promise<ReleaseState> {
    return await this.update(current => {
      const release = requiredRelease(current, releaseId);
      if (release.approval !== "approved") throw new Error(`cannot activate unverified release ${releaseId}`);
      const selectedId = current.references.active === replaceUnlaunchableActiveId
        ? releaseId
        : selectOrdinaryLaunchReleaseId(release, current.references.active === null ? undefined : current.releases[current.references.active]);
      if (selectedId !== releaseId) {
        return {
          ...current,
          references: {
            ...current.references,
            pending: current.references.pending === releaseId ? null : current.references.pending,
            approved: selectedId,
          },
          };
      }
      const prior = current.references.active;
      return {
        ...current,
        references: {
          ...current.references,
          active: releaseId,
          pending: null,
          approved: releaseId,
          rollback: prior && prior !== releaseId ? prior : current.references.rollback,
        },
      };
    });
  }

  async rollback(): Promise<ReleaseState> {
    return await this.update(current => {
      const rollbackId = current.references.rollback;
      if (!rollbackId) throw new Error("no rollback release is recorded");
      const rollback = requiredRelease(current, rollbackId);
      if (rollback.approval !== "approved") throw new Error(`cannot roll back to unverified release ${rollbackId}`);
      return {
        ...current,
        references: {
          ...current.references,
          active: rollbackId,
          pending: null,
          approved: rollbackId,
          rollback: current.references.active,
        },
      };
    });
  }

  /** Atomically replace legacy retention history and detach every currently collectible record. */
  async reconcileRetention(
    resolveInputs: (current: ReleaseState) => ProtectedReleaseInputs | Promise<ProtectedReleaseInputs>,
    orphans: readonly OrphanReleaseDisposition[] = [],
  ): Promise<ReleaseRetentionReconciliation> {
    let plan: ProtectedReleasePlan | null = null;
    let detachedReleaseIds: readonly string[] = [];
    const state = await this.update(async current => {
      const inputs = await resolveInputs(current);
      plan = planProtectedReleases(current, inputs);
      const nextReleases = { ...current.releases };
      const pending = { ...current.cleanup.pending };
      for (const releaseId of plan.collectibleReleaseIds) {
        const release = nextReleases[releaseId]!;
        pending[releaseId] ??= cleanupDisposition(release, "detached", null);
        delete nextReleases[releaseId];
      }
      for (const orphan of orphans) {
        const releaseId = orphan.release.releaseId;
        if (nextReleases[releaseId] || pending[releaseId] || plan.protectedReleaseIds.includes(releaseId)) continue;
        pending[releaseId] = cleanupDisposition(orphan.release, orphan.stage, orphan.trashPath ?? null);
      }
      detachedReleaseIds = plan.collectibleReleaseIds;
      return {
        ...current,
        releases: nextReleases,
        references: { ...current.references, retention: plan.retainedReleaseIds },
        cleanup: { ...current.cleanup, pending },
      };
    });
    if (plan === null) throw new Error("release retention reconciliation did not produce a plan");
    return { state, plan, detachedReleaseIds };
  }

  async markCleanupTrash(releaseId: string, trashPath: string): Promise<ReleaseState> {
    return await this.update(current => {
      const disposition = current.cleanup.pending[releaseId];
      if (!disposition) throw new Error(`release ${releaseId} has no cleanup disposition`);
      return replaceCleanup(current, releaseId, { ...disposition, stage: "trash", trashPath, lastError: null });
    });
  }

  async recordCleanupFailure(releaseId: string, stage: string, error: unknown): Promise<ReleaseState> {
    return await this.update(current => {
      const attemptedAt = new Date().toISOString();
      const message = boundedError(error);
      const disposition = current.cleanup.pending[releaseId];
      const pending = disposition ? {
        ...current.cleanup.pending,
        [releaseId]: { ...disposition, attempts: disposition.attempts + 1, lastAttemptAt: attemptedAt, lastError: message },
      } : current.cleanup.pending;
      return {
        ...current,
        cleanup: {
          ...current.cleanup,
          pending,
          diagnostics: [...current.cleanup.diagnostics, { releaseId, stage, attemptedAt, error: message }].slice(-64),
        },
      };
    });
  }

  async completeCleanup(releaseId: string): Promise<ReleaseState> {
    return await this.update(current => {
      const pending = { ...current.cleanup.pending };
      delete pending[releaseId];
      return { ...current, cleanup: { ...current.cleanup, pending } };
    });
  }

  async recordCleanupWorkerScheduled(runId: string): Promise<ReleaseState> {
    return await this.update(current => {
      const scheduledAt = new Date().toISOString();
      const run: ReleaseCleanupWorkerRun = {
        runId,
        status: "scheduled",
        scheduledAt,
        startedAt: null,
        completedAt: null,
        pid: null,
        batches: 0,
        attempted: 0,
        completed: 0,
        remaining: Object.keys(current.cleanup.pending).length,
        error: null,
      };
      return { ...current, cleanup: { ...current.cleanup, workerRuns: [...current.cleanup.workerRuns, run].slice(-16) } };
    });
  }

  async recordCleanupWorkerStarted(runId: string, pid: number): Promise<ReleaseState> {
    return await this.update(current => replaceCleanupWorkerRun(current, runId, existing => ({
      ...(existing ?? cleanupWorkerRun(runId, Object.keys(current.cleanup.pending).length)),
      status: "running",
      startedAt: new Date().toISOString(),
      completedAt: null,
      pid,
      error: null,
    })));
  }

  async recordCleanupWorkerProgress(runId: string, summary: ReleaseCleanupWorkerSummary): Promise<ReleaseState> {
    return await this.update(current => replaceCleanupWorkerRun(current, runId, existing => ({
      ...(existing ?? cleanupWorkerRun(runId, summary.remaining)),
      status: "running",
      startedAt: existing?.startedAt ?? new Date().toISOString(),
      pid: existing?.pid ?? process.pid,
      ...summary,
    })));
  }

  async recordCleanupWorkerFinished(
    runId: string,
    status: Exclude<ReleaseCleanupWorkerStatus, "scheduled" | "running">,
    summary: ReleaseCleanupWorkerSummary,
    error: unknown = null,
  ): Promise<ReleaseState> {
    return await this.update(current => replaceCleanupWorkerRun(current, runId, existing => ({
      ...(existing ?? cleanupWorkerRun(runId, summary.remaining)),
      status,
      startedAt: existing?.startedAt ?? new Date().toISOString(),
      completedAt: new Date().toISOString(),
      pid: existing?.pid ?? process.pid,
      ...summary,
      error: error === null ? null : boundedError(error),
    })));
  }

}

export function emptyState(): ReleaseState {
  return {
    schema: RELEASE_STATE_SCHEMA,
    revision: 0,
    releases: {},
    references: { active: null, pending: null, approved: null, rollback: null, retention: [] },
    cleanup: { pending: {}, diagnostics: [], workerRuns: [] },
  };
}

function cleanupDisposition(release: ReleaseRecord, stage: ReleaseCleanupStage, trashPath: string | null): ReleaseCleanupDisposition {
  return { release, stage, trashPath, attempts: 0, lastAttemptAt: null, lastError: null };
}
function replaceCleanup(current: ReleaseState, releaseId: string, disposition: ReleaseCleanupDisposition): ReleaseState {
  return { ...current, cleanup: { ...current.cleanup, pending: { ...current.cleanup.pending, [releaseId]: disposition } } };
}
function cleanupWorkerRun(runId: string, remaining: number): ReleaseCleanupWorkerRun {
  return {
    runId,
    status: "scheduled",
    scheduledAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    pid: null,
    batches: 0,
    attempted: 0,
    completed: 0,
    remaining,
    error: null,
  };
}
function replaceCleanupWorkerRun(
  current: ReleaseState,
  runId: string,
  operation: (existing: ReleaseCleanupWorkerRun | undefined) => ReleaseCleanupWorkerRun,
): ReleaseState {
  const existing = current.cleanup.workerRuns.find(run => run.runId === runId);
  const workerRuns = existing
    ? current.cleanup.workerRuns.map(run => run.runId === runId ? operation(run) : run)
    : [...current.cleanup.workerRuns, operation(undefined)];
  return { ...current, cleanup: { ...current.cleanup, workerRuns: workerRuns.slice(-16) } };
}
function requiredRelease(state: ReleaseState, releaseId: string): ReleaseRecord {
  const release = state.releases[releaseId];
  if (!release) throw new Error(`unknown release ${releaseId}`);
  return release;
}
async function acquireLock(path: string) {
  const deadline = Date.now() + 5_000;
  while (true) {
    try {
      const lock = await open(path, "wx", 0o600);
      await lock.writeFile(JSON.stringify({ pid: process.pid, token: randomUUID(), createdAt: new Date().toISOString() }));
      await lock.sync();
      return lock;
    } catch (error) {
      const code = error instanceof Error && "code" in error ? error.code : undefined;
      // Platform: Windows reports a lock file another holder is still deleting as EPERM or EACCES.
      const releasing = process.platform === "win32" && (code === "EPERM" || code === "EACCES");
      if (code !== "EEXIST" && !releasing) throw error;
      if (code === "EEXIST" && await reclaimAbandonedLock(path)) continue;
      if (Date.now() >= deadline) throw error;
      await new Promise(resolvePromise => setTimeout(resolvePromise, 20));
    }
  }
}
async function reclaimAbandonedLock(path: string): Promise<boolean> {
  let owner: string;
  try {
    owner = await readFile(path, "utf8");
    const value = JSON.parse(owner) as { pid?: unknown };
    if (!Number.isSafeInteger(value.pid) || (value.pid as number) <= 0) return false;
    try { process.kill(value.pid as number, 0); return false; }
    catch (error) { if (!(error instanceof Error && "code" in error && error.code === "ESRCH")) return false; }
  } catch { return false; } // Security: unknown ownership never becomes safe merely through age.
  const gate = `${path}.reclaim`;
  try { await mkdir(gate); } catch { return false; }
  try {
    if (await readFile(path, "utf8") !== owner) return false;
    const quarantine = `${path}.abandoned-${randomUUID()}`;
    await rename(path, quarantine);
    await rm(quarantine, { force: true });
    return true;
  } catch { return false; }
  finally { await rm(gate, { recursive: true, force: true }); }
}
function normalizeState(value: unknown): ReleaseState {
  if (!value || typeof value !== "object") return value as ReleaseState;
  // Compatibility: state written while supervisors coordinated activation carries an
  // `activation` record that nothing reads any more; it is dropped on the next write.
  const { activation: _activation, ...state } = value as Partial<ReleaseState> & { activation?: unknown };
  const cleanup = state.cleanup;
  return {
    ...state,
    // Compatibility: one-way control-state upgrade fences pre-claim cleanup workers; session files are untouched.
    ...(state.schema === "a1-release-cohort-v1" ? { schema: RELEASE_STATE_SCHEMA } : {}),
    cleanup: cleanup
      ? { ...cleanup, workerRuns: cleanup.workerRuns ?? [] }
      : { pending: {}, diagnostics: [], workerRuns: [] },
  } as ReleaseState;
}
function validateState(state: ReleaseState): void {
  if (!state || state.schema !== RELEASE_STATE_SCHEMA || !Number.isSafeInteger(state.revision) || state.revision < 0
    || !state.releases || typeof state.releases !== "object" || !state.references || !Array.isArray(state.references.retention)
    || !state.cleanup || typeof state.cleanup.pending !== "object" || !Array.isArray(state.cleanup.diagnostics)
    || !Array.isArray(state.cleanup.workerRuns)) {
    throw new Error("invalid release state");
  }
  if (state.uses !== undefined && (state.uses === null || typeof state.uses !== "object" || Array.isArray(state.uses))) throw new Error("invalid release use claims");
  for (const [token, claim] of Object.entries(state.uses ?? {})) {
    if (!/^[a-f0-9-]{36}$/.test(token) || !claim || !RELEASE_ID_PATTERN.test(claim.releaseId)
      || !Number.isSafeInteger(claim.pid) || claim.pid <= 0 || !["launching", "running"].includes(claim.phase)) throw new Error("invalid release use claim");
  }
  for (const run of state.cleanup.workerRuns) {
    if (!run || typeof run.runId !== "string" || run.runId.length === 0
      || !["scheduled", "running", "completed", "blocked", "continued", "failed", "skipped"].includes(run.status)
      || typeof run.scheduledAt !== "string" || (run.startedAt !== null && typeof run.startedAt !== "string")
      || (run.completedAt !== null && typeof run.completedAt !== "string") || (run.pid !== null && (!Number.isSafeInteger(run.pid) || run.pid < 1))
      || !Number.isSafeInteger(run.batches) || run.batches < 0 || !Number.isSafeInteger(run.attempted) || run.attempted < 0
      || !Number.isSafeInteger(run.completed) || run.completed < 0 || run.completed > run.attempted
      || !Number.isSafeInteger(run.remaining) || run.remaining < 0 || (run.error !== null && typeof run.error !== "string")) {
      throw new Error("invalid release cleanup worker run");
    }
  }
  for (const [releaseId, release] of Object.entries(state.releases)) validateReleaseRecord(releaseId, release);
  for (const reference of [state.references.active, state.references.pending, state.references.approved, state.references.rollback]) {
    if (reference !== null && !state.releases[reference]) throw new Error(`release reference points to an unknown release: ${reference}`);
  }
  for (const [releaseId, disposition] of Object.entries(state.cleanup.pending)) {
    validateReleaseRecord(releaseId, disposition.release);
    if (!["detached", "trash"].includes(disposition.stage)) throw new Error(`invalid cleanup disposition for ${releaseId}`);
  }
}
function validateReleaseRecord(releaseId: string, release: ReleaseRecord): void {
  if (release.releaseId !== releaseId || !RELEASE_ID_PATTERN.test(releaseId) || typeof release.releaseRoot !== "string"
    || typeof release.packageVersion !== "string" || !/^[a-f0-9]{64}$/.test(release.contentDigest)
    || !["candidate", "approved", "rejected"].includes(release.approval)) {
    throw new Error(`invalid release record for ${releaseId}`);
  }
}
function validateTransition(current: ReleaseState, next: ReleaseState): void {
  validateState(next);
  if (next.schema !== current.schema) throw new Error("release schema cannot change during a state update");
  if (next.revision !== current.revision) throw new Error("release revision is controlled by the state store");
}
export function releaseUseIsLive(claim: ReleaseUseClaim): boolean {
  if (claim.phase === "launching") return true;
  // Security: PID reuse only over-retains: no live/uncertain process identity ever proves a claim dead.
  try { process.kill(claim.pid, 0); return true; }
  catch (error) { return !(error instanceof Error && "code" in error && error.code === "ESRCH"); }
}

function boundedError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).replace(/[\r\n]+/g, " ").slice(0, 1_000);
}
