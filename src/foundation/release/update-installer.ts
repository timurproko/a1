import type { ProductPaths } from "../lifecycle/index.js";
import { certifyMaterializedRelease } from "./bootstrap.js";
import { scheduleReleaseCleanup } from "./release-gc.js";
import { ReleaseStateStore } from "./release-state.js";
import { materializeRelease, readMaterializedRelease } from "./release-store.js";
import type { UpdateRecoveryState, UpdateTransaction } from "./update-transaction.js";
import { resolveNpmCli, runProtectedPackageReplacement, type ProtectedPackageReplacementResult } from "./update-recovery.js";

/** The approved release protected replacement restores when the new package cannot launch. */
export interface UpdatePriorRelease {
  readonly releaseId: string;
  readonly releaseRoot: string;
  readonly contentDigest: string;
}

/** What an update knows about the release that was active when it began. */
export interface UpdatePriorReleaseProtection {
  /** The active release to roll back to, or null when none was recorded. */
  readonly priorActiveReleaseId: string | null;
  /** The approved record for a release id, or undefined when it cannot protect replacement. */
  approvedRelease(releaseId: string | null): UpdatePriorRelease | undefined;
}

export interface UpdatePackageReplacementInput {
  readonly globalRoot: string;
  readonly npmCliRoot: string;
  readonly npmCli?: string;
  readonly packageRoot: string;
  readonly transaction: UpdateTransaction;
  readonly priorRelease: UpdatePriorRelease;
  readonly output: { stderr(message: string): void };
  readonly onRecoveryState: (state: UpdateRecoveryState) => Promise<void>;
}

/**
 * The update steps that touch npm and release storage. Every update runs all of them in the same
 * order; a test replaces a step's behaviour, never which steps run.
 */
export interface UpdateInstaller {
  /** Resolve npm's CLI entry before anything changes; a throw stops the update with nothing changed. */
  preflight(npmCliRoot: string): Promise<string | undefined>;
  /** Make sure an approved release can launch while npm replaces the package. */
  protectPriorRelease(packageRoot: string): Promise<UpdatePriorReleaseProtection>;
  replacePackage(input: UpdatePackageReplacementInput): Promise<ProtectedPackageReplacementResult>;
  /** Return to the prior release after a failure, describing what happened. "rolled back" means it did. */
  rollback(priorReleaseId: string | null): Promise<string>;
  /** Release cleanup committed after activation and before success is reported. */
  maintenance(): Promise<void>;
}

/** The production installer: npm preflight, recovery release, protected replacement, rollback and release cleanup. */
export function createProtectedUpdateInstaller(paths: ProductPaths, environment: NodeJS.ProcessEnv): UpdateInstaller {
  const dataDir = paths.dataDir;
  return {
    preflight: async npmCliRoot => await resolveNpmCli(npmCliRoot, environment),
    protectPriorRelease: async packageRoot => await protectPriorRelease(dataDir, packageRoot),
    replacePackage: async input => await runProtectedPackageReplacement({ ...input, dataDir, environment }),
    rollback: async priorReleaseId => await rollbackPriorRelease(dataDir, priorReleaseId),
    maintenance: async () => { await scheduleReleaseCleanup(dataDir, paths); },
  };
}

async function protectPriorRelease(dataDir: string, packageRoot: string): Promise<UpdatePriorReleaseProtection> {
  const releaseStateStore = new ReleaseStateStore(dataDir);
  let state = await releaseStateStore.read();
  let priorActiveReleaseId = state.references.active;
  if (priorActiveReleaseId === null || state.releases[priorActiveReleaseId]?.approval !== "approved") {
    // Invariant: protected replacement needs an immutable launch authority that npm cannot rename.
    const recoveryRelease = await materializeRelease(packageRoot, dataDir);
    await releaseStateStore.recordCandidate(recoveryRelease);
    const diagnostics = await certifyMaterializedRelease(recoveryRelease, dataDir);
    await releaseStateStore.approve(recoveryRelease.releaseId, diagnostics);
    await releaseStateStore.activate(recoveryRelease.releaseId);
    state = await releaseStateStore.read();
    priorActiveReleaseId = recoveryRelease.releaseId;
  }
  const releases = state.releases;
  return {
    priorActiveReleaseId,
    approvedRelease: releaseId => {
      const record = releaseId === null ? undefined : releases[releaseId];
      return record?.approval === "approved" ? record : undefined;
    },
  };
}

async function rollbackPriorRelease(dataDir: string, priorReleaseId: string | null): Promise<string> {
  if (!priorReleaseId) return "no prior release was available for rollback";
  const stateStore = new ReleaseStateStore(dataDir);
  const state = await stateStore.read();
  const prior = state.releases[priorReleaseId];
  if (!prior || prior.approval !== "approved") return "prior release is not a verified rollback candidate";
  if (state.references.active !== priorReleaseId) {
    if (state.references.rollback === priorReleaseId) await stateStore.rollback();
    else throw new Error(`prior release ${priorReleaseId} is not the recorded rollback release`);
  }
  // Invariant: rollback selects only a prior release whose retained content still verifies.
  await readMaterializedRelease(prior.releaseRoot);
  return "rolled back";
}
