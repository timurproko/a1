import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { MaterializedRelease } from "./release-store.js";
import { PRODUCT_IDENTITY } from "../../product-identity.js";
import type { PackageRole, LauncherRuntimeCompatibility } from "./launcher-contract.js";

export const RELEASE_COHORT_SCHEMA = PRODUCT_IDENTITY.protocol.releaseCohortSchema;
const RELEASE_ID_PATTERN = /^[0-9A-Za-z.+_-]+-[a-f0-9]{20}$/;

export type ReleaseApproval = "candidate" | "approved" | "rejected";

export interface ReleaseRecord {
  readonly releaseId: string;
  readonly releaseRoot: string;
  readonly packageVersion: string;
  readonly contentDigest: string;
  readonly approval: ReleaseApproval;
  readonly materializedAt: string;
  readonly certifiedAt: string | null;
  readonly diagnosticsPath: string | null;
  /** Absent for combined releases created before the stable launcher split. */
  readonly packageRole?: PackageRole;
  readonly launcherCompatibility?: LauncherRuntimeCompatibility;
}

export interface ReleaseReferences {
  readonly active: string | null;
  readonly pending: string | null;
  readonly approved: string | null;
  readonly rollback: string | null;
  readonly retention: readonly string[];
}

export type ExternalReleaseHoldAuthority = "agent" | "migration";

/** A current hold supplied by an authority that must participate in every reconciliation. */
export interface ExternalReleaseHold {
  readonly authority: ExternalReleaseHoldAuthority;
  readonly releaseId: string;
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

export interface CohortState {
  readonly schema: typeof RELEASE_COHORT_SCHEMA;
  readonly revision: number;
  readonly releases: Readonly<Record<string, ReleaseRecord>>;
  readonly references: ReleaseReferences;
  readonly cleanup: ReleaseCleanupState;
  readonly activation: {
    readonly state: "idle" | "pending" | "draining" | "blocked" | "failed";
    readonly reason: string | null;
    readonly blockerGenerationIds: readonly string[];
    readonly updatedAt: string;
  };
}

export interface EndpointOwnership {
  readonly state: "idle" | "busy" | "draining" | "released" | "blocked";
  readonly liveInstanceIds: readonly string[];
  readonly nonResumableInstanceIds: readonly string[];
  readonly uncertainInstanceIds: readonly string[];
}

export interface SupervisorEndpointMetadata {
  readonly schema: string;
  readonly supervisorId: string;
  readonly endpoint: string;
  readonly pid: number;
  readonly pidStartIdentity: string;
  readonly bootNonce: string;
  readonly startedAt: string;
  readonly releaseId: string;
  readonly releaseRoot: string;
  readonly contentDigest: string;
  readonly ownership: EndpointOwnership;
  readonly envelope: string;
  readonly envelopeRevision: number;
  readonly requiredFeatures: readonly string[];
  readonly optionalFeatures: readonly string[];
  readonly contractDigest: string;
  readonly packageRole?: PackageRole;
  readonly launcherCompatibility?: LauncherRuntimeCompatibility;
}

export interface ProtectedReleaseInputs {
  readonly liveReleaseIds?: readonly string[];
  readonly externalHolds?: readonly ExternalReleaseHold[];
  readonly transaction?: ActiveReleaseTransactionReference | null;
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
  readonly state: CohortState;
  readonly plan: ProtectedReleasePlan;
  readonly detachedReleaseIds: readonly string[];
}

/**
 * Derive protection exclusively from current selectors and ownership authorities.
 * The historical retention snapshot is deliberately not an input to this plan.
 */
export function planProtectedReleases(state: CohortState, inputs: ProtectedReleaseInputs = {}): ProtectedReleasePlan {
  const holds = inputs.externalHolds ?? [];
  for (const hold of holds) {
    if (hold.authority !== "agent" && hold.authority !== "migration") throw new Error(`unknown release hold authority: ${String(hold.authority)}`);
    if (!state.releases[hold.releaseId] && !state.cleanup.pending[hold.releaseId]) {
      throw new Error(`external ${hold.authority} hold names unknown release ${hold.releaseId}`);
    }
  }
  const protectedIds = new Set<string>();
  for (const id of [state.references.active, state.references.pending, state.references.approved, state.references.rollback]) {
    if (id !== null) protectedIds.add(id);
  }
  for (const id of inputs.liveReleaseIds ?? []) protectedIds.add(id);
  for (const hold of holds) protectedIds.add(hold.releaseId);
  if (inputs.transaction?.status === "active" && inputs.transaction.priorActiveReleaseId !== null) {
    protectedIds.add(inputs.transaction.priorActiveReleaseId);
  }
  const protectedReleaseIds = [...protectedIds].sort();
  const known = Object.keys(state.releases).sort();
  return {
    protectedReleaseIds,
    retainedReleaseIds: known.filter(id => protectedIds.has(id)),
    collectibleReleaseIds: known.filter(id => !protectedIds.has(id)),
  };
}

/** Serializes validated cohort-state revisions under a lock and commits each update atomically. */
export class CohortStateStore {
  readonly path: string;

  constructor(dataDir: string) {
    this.path = resolve(dataDir, "release-state.json");
  }

  async read(): Promise<CohortState> {
    try {
      const state = normalizeState(JSON.parse(await readFile(this.path, "utf8")));
      validateState(state);
      return state;
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return emptyState();
      throw error;
    }
  }

  async update(operation: (current: CohortState) => CohortState | Promise<CohortState>): Promise<CohortState> {
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    const lockPath = `${this.path}.lock`;
    const lock = await acquireLock(lockPath);
    try {
      const current = await this.read();
      const next = await operation(current);
      validateTransition(current, next);
      const committed: CohortState = { ...next, revision: current.revision + 1 };
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

  async recordCandidate(release: MaterializedRelease): Promise<CohortState> {
    return await this.update(current => {
      const existing = current.releases[release.releaseId];
      const record: ReleaseRecord = existing ?? {
        releaseId: release.releaseId,
        releaseRoot: release.releaseRoot,
        packageVersion: release.packageVersion,
        contentDigest: release.contentDigest,
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
        activation: activation("pending", "candidate awaits certification and safe activation"),
      };
    });
  }

  async approve(releaseId: string, diagnosticsPath: string): Promise<CohortState> {
    return await this.update(current => {
      const release = requiredRelease(current, releaseId);
      return {
        ...current,
        releases: { ...current.releases, [releaseId]: { ...release, approval: "approved", certifiedAt: new Date().toISOString(), diagnosticsPath } },
        references: { ...current.references, approved: releaseId, pending: current.references.active === releaseId ? null : releaseId },
      };
    });
  }

  async activate(releaseId: string): Promise<CohortState> {
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
        activation: activation("idle", null),
      };
    });
  }

  async blockPending(reason: string, blockerGenerationIds: readonly string[]): Promise<CohortState> {
    return await this.update(current => ({ ...current, activation: { ...activation("blocked", reason), blockerGenerationIds: [...blockerGenerationIds] } }));
  }

  async rollback(ownershipReleased: boolean): Promise<CohortState> {
    if (!ownershipReleased) throw new Error("cannot roll back before current cohort ownership is released");
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
        activation: activation("idle", null),
      };
    });
  }

  async setRetention(releaseIds: readonly string[]): Promise<CohortState> {
    return await this.update(current => {
      for (const releaseId of releaseIds) requiredRelease(current, releaseId);
      return { ...current, references: { ...current.references, retention: unique(releaseIds) } };
    });
  }

  /** Atomically replace legacy retention history and detach every currently collectible record. */
  async reconcileRetention(
    resolveInputs: (current: CohortState) => ProtectedReleaseInputs | Promise<ProtectedReleaseInputs>,
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

  async markCleanupTrash(releaseId: string, trashPath: string): Promise<CohortState> {
    return await this.update(current => {
      const disposition = current.cleanup.pending[releaseId];
      if (!disposition) throw new Error(`release ${releaseId} has no cleanup disposition`);
      return replaceCleanup(current, releaseId, { ...disposition, stage: "trash", trashPath, lastError: null });
    });
  }

  async recordCleanupFailure(releaseId: string, stage: string, error: unknown): Promise<CohortState> {
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

  async completeCleanup(releaseId: string): Promise<CohortState> {
    return await this.update(current => {
      const pending = { ...current.cleanup.pending };
      delete pending[releaseId];
      return { ...current, cleanup: { ...current.cleanup, pending } };
    });
  }

  async recordCleanupWorkerScheduled(runId: string): Promise<CohortState> {
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

  async recordCleanupWorkerStarted(runId: string, pid: number): Promise<CohortState> {
    return await this.update(current => replaceCleanupWorkerRun(current, runId, existing => ({
      ...(existing ?? cleanupWorkerRun(runId, Object.keys(current.cleanup.pending).length)),
      status: "running",
      startedAt: new Date().toISOString(),
      completedAt: null,
      pid,
      error: null,
    })));
  }

  async recordCleanupWorkerProgress(runId: string, summary: ReleaseCleanupWorkerSummary): Promise<CohortState> {
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
  ): Promise<CohortState> {
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

  async removeUnreferencedRelease(releaseId: string, externalReferences: readonly string[]): Promise<CohortState> {
    return await this.update(current => {
      const release = requiredRelease(current, releaseId);
      const protectedIds = new Set([
        current.references.active,
        current.references.pending,
        current.references.approved,
        current.references.rollback,
        ...current.references.retention,
        ...externalReferences,
      ].filter((value): value is string => value !== null));
      if (protectedIds.has(releaseId)) throw new Error(`release ${releaseId} is still referenced and cannot be collected`);
      const releases = { ...current.releases };
      delete releases[releaseId];
      return {
        ...current,
        releases,
        cleanup: {
          ...current.cleanup,
          pending: { ...current.cleanup.pending, [releaseId]: cleanupDisposition(release, "detached", null) },
        },
      };
    });
  }
}

export function emptyState(): CohortState {
  return {
    schema: RELEASE_COHORT_SCHEMA,
    revision: 0,
    releases: {},
    references: { active: null, pending: null, approved: null, rollback: null, retention: [] },
    cleanup: { pending: {}, diagnostics: [], workerRuns: [] },
    activation: activation("idle", null),
  };
}

function cleanupDisposition(release: ReleaseRecord, stage: ReleaseCleanupStage, trashPath: string | null): ReleaseCleanupDisposition {
  return { release, stage, trashPath, attempts: 0, lastAttemptAt: null, lastError: null };
}
function replaceCleanup(current: CohortState, releaseId: string, disposition: ReleaseCleanupDisposition): CohortState {
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
  current: CohortState,
  runId: string,
  operation: (existing: ReleaseCleanupWorkerRun | undefined) => ReleaseCleanupWorkerRun,
): CohortState {
  const existing = current.cleanup.workerRuns.find(run => run.runId === runId);
  const workerRuns = existing
    ? current.cleanup.workerRuns.map(run => run.runId === runId ? operation(run) : run)
    : [...current.cleanup.workerRuns, operation(undefined)];
  return { ...current, cleanup: { ...current.cleanup, workerRuns: workerRuns.slice(-16) } };
}
function activation(state: CohortState["activation"]["state"], reason: string | null): CohortState["activation"] {
  return { state, reason, blockerGenerationIds: [], updatedAt: new Date().toISOString() };
}
function requiredRelease(state: CohortState, releaseId: string): ReleaseRecord {
  const release = state.releases[releaseId];
  if (!release) throw new Error(`unknown release ${releaseId}`);
  return release;
}
function unique(values: readonly string[]): string[] { return [...new Set(values)]; }
async function acquireLock(path: string) {
  const deadline = Date.now() + 5_000;
  while (true) {
    try {
      const lock = await open(path, "wx", 0o600);
      await lock.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
      await lock.sync();
      return lock;
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
      if (await reclaimAbandonedLock(path)) continue;
      if (Date.now() >= deadline) throw error;
      await new Promise(resolvePromise => setTimeout(resolvePromise, 20));
    }
  }
}
async function reclaimAbandonedLock(path: string): Promise<boolean> {
  let abandoned = false;
  try {
    const value = JSON.parse(await readFile(path, "utf8")) as { pid?: unknown };
    if (typeof value.pid === "number") {
      try { process.kill(value.pid, 0); }
      catch (error) { abandoned = !(error instanceof Error && "code" in error && error.code === "EPERM"); }
    }
  } catch {
    const metadata = await stat(path).catch(() => null);
    abandoned = metadata !== null && Date.now() - metadata.mtimeMs > 10_000;
  }
  if (!abandoned) return false;
  const quarantine = `${path}.abandoned`;
  const oldQuarantine = await stat(quarantine).catch(() => null);
  if (oldQuarantine && Date.now() - oldQuarantine.mtimeMs > 10_000) await rm(quarantine, { force: true });
  try {
    // Concurrency: the fixed destination lets exactly one waiter claim the stale lock;
    // another waiter cannot accidentally rename a newly acquired replacement.
    await rename(path, quarantine);
    await rm(quarantine, { force: true });
    return true;
  } catch {
    return false;
  }
}
function normalizeState(value: unknown): CohortState {
  if (!value || typeof value !== "object") return value as CohortState;
  const state = value as Partial<CohortState>;
  const cleanup = state.cleanup;
  return {
    ...state,
    cleanup: cleanup
      ? { ...cleanup, workerRuns: cleanup.workerRuns ?? [] }
      : { pending: {}, diagnostics: [], workerRuns: [] },
  } as CohortState;
}
function validateState(state: CohortState): void {
  if (!state || state.schema !== RELEASE_COHORT_SCHEMA || !Number.isSafeInteger(state.revision) || state.revision < 0
    || !state.releases || typeof state.releases !== "object" || !state.references || !Array.isArray(state.references.retention)
    || !state.cleanup || typeof state.cleanup.pending !== "object" || !Array.isArray(state.cleanup.diagnostics)
    || !Array.isArray(state.cleanup.workerRuns)) {
    throw new Error("invalid release cohort state");
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
function validateTransition(current: CohortState, next: CohortState): void {
  validateState(next);
  if (next.schema !== current.schema) throw new Error("release cohort schema cannot change during a state update");
  if (next.revision !== current.revision) throw new Error("release cohort revision is controlled by the state store");
}
function boundedError(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).replace(/[\r\n]+/g, " ").slice(0, 1_000);
}
