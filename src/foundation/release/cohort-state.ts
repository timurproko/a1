import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { MaterializedRelease } from "./release-store.js";
import { PRODUCT_IDENTITY } from "../../product-identity.js";

export const RELEASE_COHORT_SCHEMA = PRODUCT_IDENTITY.protocol.releaseCohortSchema;

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
}

export interface ReleaseReferences {
  readonly active: string | null;
  readonly pending: string | null;
  readonly approved: string | null;
  readonly rollback: string | null;
  readonly retention: readonly string[];
}

export interface CohortState {
  readonly schema: typeof RELEASE_COHORT_SCHEMA;
  readonly revision: number;
  readonly releases: Readonly<Record<string, ReleaseRecord>>;
  readonly references: ReleaseReferences;
  readonly activation: {
    readonly state: "idle" | "pending" | "draining" | "blocked" | "failed";
    readonly reason: string | null;
    readonly blockerGenerationIds: readonly string[];
    readonly updatedAt: string;
  };
}

export interface EndpointOwnership {
  readonly state: "idle" | "busy" | "draining" | "released" | "blocked";
  readonly liveGenerationIds: readonly string[];
  readonly nonResumableGenerationIds: readonly string[];
}

export interface SupervisorEndpointMetadata {
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
}

export class CohortStateStore {
  readonly path: string;

  constructor(dataDir: string) {
    this.path = resolve(dataDir, "release-state.json");
  }

  async read(): Promise<CohortState> {
    try {
      const state = JSON.parse(await readFile(this.path, "utf8")) as CohortState;
      validateState(state);
      return state;
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return emptyState();
      throw error;
    }
  }

  async update(operation: (current: CohortState) => CohortState): Promise<CohortState> {
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    const lockPath = `${this.path}.lock`;
    const lock = await acquireLock(lockPath);
    try {
      const current = await this.read();
      const next = operation(current);
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
          retention: unique([...current.references.retention, release.releaseId]),
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
          active: releaseId,
          pending: null,
          approved: releaseId,
          rollback: prior && prior !== releaseId ? prior : current.references.rollback,
          retention: unique([...current.references.retention, releaseId, ...(prior ? [prior] : [])]),
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
          retention: unique([...current.references.retention, rollbackId, ...(current.references.active ? [current.references.active] : [])]),
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

  async removeUnreferencedRelease(releaseId: string, externalReferences: readonly string[]): Promise<CohortState> {
    return await this.update(current => {
      requiredRelease(current, releaseId);
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
      return { ...current, releases };
    });
  }
}

export function emptyState(): CohortState {
  return {
    schema: RELEASE_COHORT_SCHEMA,
    revision: 0,
    releases: {},
    references: { active: null, pending: null, approved: null, rollback: null, retention: [] },
    activation: activation("idle", null),
  };
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
    try { return await open(path, "wx", 0o600); }
    catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "EEXIST") || Date.now() >= deadline) throw error;
      await new Promise(resolvePromise => setTimeout(resolvePromise, 20));
    }
  }
}
function validateState(state: CohortState): void {
  if (state.schema !== RELEASE_COHORT_SCHEMA || !Number.isSafeInteger(state.revision) || state.revision < 0) throw new Error("invalid release cohort state");
  for (const reference of [state.references.active, state.references.pending, state.references.approved, state.references.rollback]) {
    if (reference !== null && !state.releases[reference]) throw new Error(`release reference points to an unknown release: ${reference}`);
  }
}
function validateTransition(current: CohortState, next: CohortState): void {
  validateState(next);
  if (next.schema !== current.schema) throw new Error("release cohort schema cannot change during a state update");
  if (next.revision !== current.revision) throw new Error("release cohort revision is controlled by the state store");
}
