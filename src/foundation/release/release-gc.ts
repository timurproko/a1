import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { lstat, mkdir, readFile, readdir, realpath, rename, rm } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CohortStateStore,
  planProtectedReleases,
  type CohortState,
  type ExternalReleaseHold,
  type OrphanReleaseDisposition,
  type ProtectedReleaseInputs,
  type ReleaseCleanupDisposition,
  type ReleaseRecord,
} from "./cohort-state.js";
import { liveReleaseIds } from "./endpoints.js";
import type { ProductPaths } from "../lifecycle/index.js";
import { resolveProductPaths } from "../lifecycle/index.js";
import { RELEASE_MANIFEST_FILENAME } from "./release-store.js";
import { DEPENDENCY_LAYER_MANIFEST, dependencyLayerCertificationPath } from "./dependency-layer.js";
import { UpdateTransactionStore, type UpdateTransaction } from "./update-transaction.js";
import { PRODUCT_IDENTITY } from "../../product-identity.js";
import { collectCompileCaches, startupCompileCachePath } from "../startup/index.js";

const DEFAULT_CANDIDATE_AGE_MS = 60 * 60 * 1_000;
const DEFAULT_LIMITS: ReleaseCleanupLimits = { maxItems: 8, maxDurationMs: 2_000, concurrency: 1 };
const WORKER_HOLDS_ENV = "A1_RELEASE_CLEANUP_HOLDS";

export interface ReleaseCleanupLimits {
  readonly maxItems: number;
  readonly maxDurationMs: number;
  readonly concurrency: number;
}

export interface ReleaseCleanupOperations {
  readonly rename?: typeof rename;
  readonly remove?: typeof rm;
}

export interface ReleaseCleanupOptions {
  readonly externalHolds?: readonly ExternalReleaseHold[];
  readonly transactionStore?: Pick<UpdateTransactionStore, "read">;
  readonly limits?: Partial<ReleaseCleanupLimits>;
  readonly candidateAgeMs?: number;
  readonly now?: () => number;
  /** Fault-injection seam for bounded filesystem recovery tests. */
  readonly operations?: ReleaseCleanupOperations;
}

export interface ReleaseCleanupResult {
  readonly planned: number;
  readonly attempted: number;
  readonly completed: number;
  readonly remaining: number;
  readonly durationMs: number;
}

interface DiscoveredCleanupInputs {
  readonly orphans: readonly OrphanReleaseDisposition[];
  readonly candidates: readonly string[];
  readonly unmanagedTrash: readonly string[];
  readonly certifications: readonly string[];
  readonly diagnostics: readonly { releaseId: string; stage: string; error: string }[];
}

/**
 * Reconcile current ownership under the cohort-state lock and durably detach obsolete releases.
 * This operation intentionally reads only manifests and directory metadata, never payload bytes.
 */
export async function prepareReleaseCleanup(
  dataDir: string,
  paths?: ProductPaths,
  options: ReleaseCleanupOptions = {},
): Promise<{ readonly store: CohortStateStore; readonly discovered: DiscoveredCleanupInputs }> {
  const store = new CohortStateStore(dataDir);
  const discovered = await discoverCleanupInputs(dataDir, store, options);
  const transactionStore = options.transactionStore ?? new UpdateTransactionStore(dataDir);
  await store.reconcileRetention(async () => await protectionInputs(paths, transactionStore, options.externalHolds ?? []), discovered.orphans);
  for (const diagnostic of discovered.diagnostics.slice(0, 16)) {
    await store.recordCleanupFailure(diagnostic.releaseId, diagnostic.stage, diagnostic.error);
  }
  return { store, discovered };
}

/** Run a bounded, restart-safe physical cleanup pass over detached releases and abandoned artifacts. */
export async function runBoundedReleaseCleanup(
  dataDir: string,
  paths?: ProductPaths,
  options: ReleaseCleanupOptions = {},
): Promise<ReleaseCleanupResult> {
  const startedAt = (options.now ?? Date.now)();
  const now = options.now ?? Date.now;
  const limits = normalizeLimits(options.limits);
  const { store, discovered } = await prepareReleaseCleanup(dataDir, paths, options);
  const initial = await store.read();
  const pending = Object.values(initial.cleanup.pending).sort((left, right) => left.release.releaseId.localeCompare(right.release.releaseId));
  let attempted = 0;
  let completed = 0;

  for (let offset = 0; offset < pending.length && attempted < limits.maxItems; offset += limits.concurrency) {
    if (now() - startedAt >= limits.maxDurationMs) break;
    const batch = pending.slice(offset, Math.min(offset + limits.concurrency, offset + (limits.maxItems - attempted)));
    attempted += batch.length;
    const results = await Promise.all(batch.map(async disposition => await collectDisposition(store, dataDir, paths, disposition, options)));
    completed += results.filter(Boolean).length;
  }

  const transaction = await (options.transactionStore ?? new UpdateTransactionStore(dataDir)).read();
  const activeTransaction = transaction?.status === "active";
  const artifactBudget = Math.max(0, limits.maxItems - attempted);
  const artifacts = [
    ...(!activeTransaction ? discovered.candidates : []),
    ...discovered.unmanagedTrash,
    ...discovered.certifications,
  ].slice(0, artifactBudget);
  for (const artifact of artifacts) {
    if (now() - startedAt >= limits.maxDurationMs) break;
    const certificationId = certificationReleaseId(artifact);
    if (certificationId !== null) {
      const inputs = await protectionInputs(paths, options.transactionStore ?? new UpdateTransactionStore(dataDir), options.externalHolds ?? []);
      if (isProtectedDetachedRelease(await store.read(), inputs, certificationId)) continue;
    }
    attempted += 1;
    try {
      await removeAbandonedArtifact(dataDir, artifact, options.operations);
      completed += 1;
    } catch (error) {
      await store.recordCleanupFailure(artifactName(artifact), "artifact-delete", error);
    }
  }

  if (!activeTransaction && attempted < limits.maxItems && now() - startedAt < limits.maxDurationMs) {
    const layerResult = await collectUnreferencedDependencyLayers(store, dataDir, limits.maxItems - attempted, options);
    attempted += layerResult.attempted;
    completed += layerResult.completed;
    await collectCompileCaches(dataDir, await protectedCompileCachePaths(dataDir, await store.read())).catch(() => {});
  }

  const remaining = Object.keys((await store.read()).cleanup.pending).length;
  return { planned: pending.length + artifacts.length, attempted, completed, remaining, durationMs: Math.max(0, now() - startedAt) };
}

/**
 * Commit cleanup intent synchronously, then let a dependency-light detached worker perform
 * potentially slow recursive deletion. A later launch/update resumes work if spawning fails.
 */
export async function scheduleReleaseCleanup(
  dataDir: string,
  paths: ProductPaths,
  options: ReleaseCleanupOptions = {},
): Promise<void> {
  const { store } = await prepareReleaseCleanup(dataDir, paths, options);
  const entry = fileURLToPath(new URL("../../../bin/release-cleanup.js", import.meta.url));
  try {
    const child = spawn(process.execPath, [entry], {
      detached: true,
      windowsHide: true,
      stdio: "ignore",
      env: {
        ...process.env,
        [PRODUCT_IDENTITY.environment.dataDir]: dataDir,
        [PRODUCT_IDENTITY.environment.runtimeDir]: paths.runtimeDir,
        [WORKER_HOLDS_ENV]: JSON.stringify(options.externalHolds ?? []),
      },
    });
    await new Promise<void>((resolvePromise, rejectPromise) => {
      child.once("spawn", resolvePromise);
      child.once("error", rejectPromise);
    });
    child.unref();
  } catch (error) {
    await store.recordCleanupFailure("worker", "spawn", error);
  }
}

/** Entry used by the private cleanup executable shipped in every immutable release. */
export async function runReleaseCleanupWorker(environment: NodeJS.ProcessEnv = process.env): Promise<ReleaseCleanupResult> {
  const paths = resolveProductPaths(environment);
  return await runBoundedReleaseCleanup(paths.dataDir, paths, { externalHolds: parseWorkerHolds(environment[WORKER_HOLDS_ENV]) });
}

/** Compatibility helper: detach one requested release and execute a one-item pass. */
export async function collectRelease(
  store: CohortStateStore,
  dataDir: string,
  releaseId: string,
  externalReferences: readonly string[],
  paths?: ProductPaths,
): Promise<void> {
  const holds = externalReferences.map(referenced => ({ authority: "migration" as const, releaseId: referenced }));
  const state = await store.read();
  if (!state.releases[releaseId]) throw new Error(`unknown release ${releaseId}`);
  await store.reconcileRetention(async () => ({ ...(await protectionInputs(paths, new UpdateTransactionStore(dataDir), holds) ) }));
  const disposition = (await store.read()).cleanup.pending[releaseId];
  if (!disposition) throw new Error(`release ${releaseId} is still referenced and cannot be collected`);
  const removed = await collectDisposition(store, dataDir, paths, disposition, { externalHolds: holds, limits: { maxItems: 1 } });
  if (!removed) throw new Error(`release ${releaseId} could not be collected`);
}

async function collectDisposition(
  store: CohortStateStore,
  dataDir: string,
  paths: ProductPaths | undefined,
  disposition: ReleaseCleanupDisposition,
  options: ReleaseCleanupOptions,
): Promise<boolean> {
  const releaseId = disposition.release.releaseId;
  try {
    const inputs = await protectionInputs(paths, options.transactionStore ?? new UpdateTransactionStore(dataDir), options.externalHolds ?? []);
    const current = await store.read();
    if (isProtectedDetachedRelease(current, inputs, releaseId)) return false;

    const storeRoot = await canonicalReleaseStore(dataDir);
    const trashRoot = await canonicalTrashRoot(storeRoot);
    let trashPath = disposition.trashPath;
    if (disposition.stage === "detached") {
      const source = resolve(storeRoot, releaseId);
      const sourceMetadata = await lstat(source).catch(error => missingOrThrow(error));
      if (sourceMetadata === null) {
        trashPath = await findReleaseTrash(trashRoot, releaseId);
        if (trashPath === null) {
          await removeCertificationEvidence(dataDir, disposition.release, store);
          await store.completeCleanup(releaseId);
          return true;
        }
      } else {
        await assertReleaseDirectory(source, storeRoot, disposition.release, releaseId);
        trashPath = resolve(trashRoot, `${releaseId}--${randomUUID()}`);
        await (options.operations?.rename ?? rename)(source, trashPath);
      }
      await store.markCleanupTrash(releaseId, trashPath);
    }

    if (trashPath === null) throw new Error(`release ${releaseId} has no managed trash path`);
    await assertReleaseDirectory(trashPath, trashRoot, disposition.release, `${releaseId}--`);
    await (options.operations?.remove ?? rm)(trashPath, { recursive: true, force: false, maxRetries: 0 });
    await removeCertificationEvidence(dataDir, disposition.release, store);
    await store.completeCleanup(releaseId);
    return true;
  } catch (error) {
    await store.recordCleanupFailure(releaseId, disposition.stage, error);
    return false;
  }
}

function isProtectedDetachedRelease(state: CohortState, inputs: ProtectedReleaseInputs, releaseId: string): boolean {
  const selected = [state.references.active, state.references.pending, state.references.approved, state.references.rollback]
    .some(reference => reference === releaseId);
  return selected
    || (inputs.liveReleaseIds ?? []).includes(releaseId)
    || (inputs.externalHolds ?? []).some(hold => hold.releaseId === releaseId)
    || (inputs.transaction?.status === "active" && inputs.transaction.priorActiveReleaseId === releaseId);
}

async function protectionInputs(
  paths: ProductPaths | undefined,
  transactionStore: Pick<UpdateTransactionStore, "read">,
  externalHolds: readonly ExternalReleaseHold[],
): Promise<ProtectedReleaseInputs> {
  const [liveIds, transaction] = await Promise.all([
    paths ? liveReleaseIds(paths) : Promise.resolve([] as readonly string[]),
    transactionStore.read(),
  ]);
  return { liveReleaseIds: liveIds, externalHolds, transaction: transactionReference(transaction) };
}

function transactionReference(transaction: UpdateTransaction | null) {
  return transaction === null ? null : { status: transaction.status, priorActiveReleaseId: transaction.priorActiveReleaseId };
}

async function discoverCleanupInputs(
  dataDir: string,
  store: CohortStateStore,
  options: ReleaseCleanupOptions,
): Promise<DiscoveredCleanupInputs> {
  const releaseRoot = resolve(dataDir, "releases");
  await mkdir(releaseRoot, { recursive: true, mode: 0o700 });
  const state = await store.read();
  const orphans: OrphanReleaseDisposition[] = [];
  const candidates: string[] = [];
  const unmanagedTrash: string[] = [];
  const certifications: string[] = [];
  const diagnostics: Array<{ releaseId: string; stage: string; error: string }> = [];
  const candidateAgeMs = options.candidateAgeMs ?? DEFAULT_CANDIDATE_AGE_MS;
  const now = options.now ?? Date.now;

  for (const entry of await readdir(releaseRoot, { withFileTypes: true })) {
    const path = resolve(releaseRoot, entry.name);
    if (entry.name === ".trash") continue;
    if (entry.name.startsWith(".candidate-")) {
      try {
        const metadata = await lstat(path);
        if (metadata.isDirectory() && !metadata.isSymbolicLink() && now() - metadata.mtimeMs >= candidateAgeMs) candidates.push(path);
      } catch (error) {
        diagnostics.push({ releaseId: entry.name, stage: "candidate-discovery", error: errorMessage(error) });
      }
      continue;
    }
    if (state.releases[entry.name] || state.cleanup.pending[entry.name]) continue;
    try {
      const release = await readReleaseRecord(path, releaseRoot, entry.name, dataDir);
      orphans.push({ release, stage: "detached" });
    } catch (error) {
      diagnostics.push({ releaseId: entry.name, stage: "orphan-discovery", error: errorMessage(error) });
    }
  }

  const trashRoot = resolve(releaseRoot, ".trash");
  const trashMetadata = await lstat(trashRoot).catch(error => missingOrThrow(error));
  if (trashMetadata !== null) {
    if (!trashMetadata.isDirectory() || trashMetadata.isSymbolicLink()) {
      diagnostics.push({ releaseId: ".trash", stage: "trash-discovery", error: "managed trash is not a direct non-link directory" });
    } else {
      for (const entry of await readdir(trashRoot, { withFileTypes: true })) {
        const path = resolve(trashRoot, entry.name);
        const releaseId = entry.name.split("--", 1)[0]!;
        if (entry.name.startsWith(".candidate--")) {
          unmanagedTrash.push(path);
        } else if (entry.name.includes("--") && !state.cleanup.pending[releaseId]) {
          try {
            const release = await readReleaseRecord(path, trashRoot, `${releaseId}--`, dataDir);
            orphans.push({ release, stage: "trash", trashPath: path });
          } catch (error) {
            diagnostics.push({ releaseId, stage: "trash-discovery", error: errorMessage(error) });
          }
        }
      }
    }
  }
  for (const entry of await readdir(dataDir, { withFileTypes: true })) {
    const match = /^certification-(.+)\.json$/.exec(entry.name);
    if (!match || !entry.isFile()) continue;
    const releaseId = match[1]!;
    if (!state.releases[releaseId] && !state.cleanup.pending[releaseId] && !orphans.some(orphan => orphan.release.releaseId === releaseId)) {
      certifications.push(resolve(dataDir, entry.name));
    }
  }
  return { orphans, candidates, unmanagedTrash, certifications, diagnostics };
}

async function readReleaseRecord(path: string, parent: string, expectedName: string, dataDir: string): Promise<ReleaseRecord> {
  const metadata = await lstat(path);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error("release path is not a non-link directory");
  const [canonicalParent, canonicalPath] = await Promise.all([realpath(parent), realpath(path)]);
  assertDirectChild(canonicalParent, canonicalPath);
  const name = canonicalPath.split(sep).at(-1) ?? "";
  if (expectedName.endsWith("--") ? !name.startsWith(expectedName) : name !== expectedName) throw new Error("release directory name does not match its disposition");
  const manifest = JSON.parse(await readFile(resolve(canonicalPath, RELEASE_MANIFEST_FILENAME), "utf8")) as Record<string, unknown>;
  if (typeof manifest.releaseId !== "string" || !/^[0-9A-Za-z.+_-]+-[a-f0-9]{20}$/.test(manifest.releaseId)
    || typeof manifest.packageVersion !== "string" || typeof manifest.contentDigest !== "string"
    || !/^[a-f0-9]{64}$/.test(manifest.contentDigest) || !name.startsWith(manifest.releaseId)) {
    throw new Error("release manifest identity is invalid for cleanup");
  }
  return {
    releaseId: manifest.releaseId,
    releaseRoot: resolve(parent, manifest.releaseId),
    packageVersion: manifest.packageVersion,
    contentDigest: manifest.contentDigest,
    approval: "approved",
    materializedAt: new Date(0).toISOString(),
    certifiedAt: null,
    diagnosticsPath: resolve(dataDir, `certification-${manifest.releaseId}.json`),
  };
}

async function assertReleaseDirectory(path: string, parent: string, release: ReleaseRecord, expectedName: string): Promise<void> {
  const metadata = await lstat(path);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error(`refused cleanup of linked or non-directory release ${release.releaseId}`);
  const [canonicalParent, canonicalPath] = await Promise.all([realpath(parent), realpath(path)]);
  assertDirectChild(canonicalParent, canonicalPath);
  const name = canonicalPath.split(sep).at(-1) ?? "";
  if (expectedName.endsWith("--") ? !name.startsWith(expectedName) : name !== expectedName) throw new Error(`release directory does not match identity ${release.releaseId}`);
  if (!expectedName.endsWith("--") && canonicalPath !== await realpath(release.releaseRoot)) throw new Error(`recorded release path differs from managed identity ${release.releaseId}`);
  const manifest = JSON.parse(await readFile(resolve(canonicalPath, RELEASE_MANIFEST_FILENAME), "utf8")) as Record<string, unknown>;
  if (manifest.releaseId !== release.releaseId || manifest.contentDigest !== release.contentDigest || manifest.packageVersion !== release.packageVersion) {
    throw new Error(`release manifest metadata differs from detached record ${release.releaseId}`);
  }
}

async function removeCertificationEvidence(dataDir: string, release: ReleaseRecord, store: CohortStateStore): Promise<void> {
  if (release.diagnosticsPath === null) return;
  const expected = resolve(dataDir, `certification-${release.releaseId}.json`);
  if (resolve(release.diagnosticsPath) !== expected) {
    await store.recordCleanupFailure(release.releaseId, "certification", "refused to delete certification evidence outside its managed identity path");
    return;
  }
  const metadata = await lstat(expected).catch(error => missingOrThrow(error));
  if (metadata === null) return;
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    await store.recordCleanupFailure(release.releaseId, "certification", "refused to delete linked or non-file certification evidence");
    return;
  }
  await rm(expected, { force: true });
}

async function canonicalReleaseStore(dataDir: string): Promise<string> {
  const root = resolve(dataDir, "releases");
  await mkdir(root, { recursive: true, mode: 0o700 });
  const metadata = await lstat(root);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error("release store is not a non-link directory");
  return await realpath(root);
}

async function canonicalTrashRoot(storeRoot: string): Promise<string> {
  const root = resolve(storeRoot, ".trash");
  await mkdir(root, { recursive: true, mode: 0o700 });
  const metadata = await lstat(root);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error("managed release trash is not a non-link directory");
  const canonical = await realpath(root);
  assertDirectChild(storeRoot, canonical);
  return canonical;
}

async function findReleaseTrash(trashRoot: string, releaseId: string): Promise<string | null> {
  const names = (await readdir(trashRoot)).filter(name => name.startsWith(`${releaseId}--`)).sort();
  return names.length === 0 ? null : resolve(trashRoot, names[0]!);
}

async function removeAbandonedArtifact(dataDir: string, path: string, operations: ReleaseCleanupOperations | undefined): Promise<void> {
  const storeRoot = await canonicalReleaseStore(dataDir);
  const metadata = await lstat(path);
  if (metadata.isSymbolicLink()) throw new Error("abandoned artifact is a link");
  const canonical = await realpath(path);
  const parent = dirname(canonical);
  const canonicalDataDir = await realpath(dataDir);
  if (parent === canonicalDataDir && certificationReleaseId(canonical) !== null && metadata.isFile()) {
    await (operations?.remove ?? rm)(canonical, { force: true });
    return;
  }
  if (!metadata.isDirectory()) throw new Error("abandoned artifact is not a managed directory or certification file");
  if (parent === storeRoot && canonical.split(sep).at(-1)?.startsWith(".candidate-")) {
    const trashRoot = await canonicalTrashRoot(storeRoot);
    const moved = resolve(trashRoot, `.candidate--${randomUUID()}`);
    await (operations?.rename ?? rename)(canonical, moved);
    await (operations?.remove ?? rm)(moved, { recursive: true, force: false, maxRetries: 0 });
    return;
  }
  const trashRoot = await canonicalTrashRoot(storeRoot);
  if (parent === trashRoot && canonical.split(sep).at(-1)?.startsWith(".candidate--")) {
    await (operations?.remove ?? rm)(canonical, { recursive: true, force: false, maxRetries: 0 });
    return;
  }
  throw new Error("abandoned artifact is outside managed candidate, trash, or certification paths");
}

async function collectUnreferencedDependencyLayers(
  store: CohortStateStore,
  dataDir: string,
  maxItems: number,
  options: ReleaseCleanupOptions,
): Promise<{ readonly attempted: number; readonly completed: number }> {
  const layersRoot = resolve(dataDir, "dependency-layers");
  const layersMetadata = await lstat(layersRoot).catch(error => missingOrThrow(error));
  if (layersMetadata === null) return { attempted: 0, completed: 0 };
  if (!layersMetadata.isDirectory() || layersMetadata.isSymbolicLink()) throw new Error("dependency-layer store is not a managed directory");
  const referenced = await referencedDependencyLayerIds(dataDir);
  const trashRoot = resolve(layersRoot, ".trash");
  await mkdir(trashRoot, { recursive: true, mode: 0o700 });
  let attempted = 0;
  let completed = 0;
  const entries = await readdir(layersRoot, { withFileTypes: true });
  const candidates: Array<{ path: string; layerId: string | null; inTrash: boolean }> = [];
  for (const entry of entries) {
    if (entry.name === ".trash") continue;
    const path = resolve(layersRoot, entry.name);
    if (entry.name.startsWith(".candidate-")) {
      const metadata = await lstat(path);
      const currentTime = options.now?.() ?? Date.now();
      if (currentTime - metadata.mtimeMs >= (options.candidateAgeMs ?? DEFAULT_CANDIDATE_AGE_MS)) {
        candidates.push({ path, layerId: null, inTrash: false });
      }
      continue;
    }
    if (!referenced.has(entry.name)) candidates.push({ path, layerId: entry.name, inTrash: false });
  }
  for (const entry of await readdir(trashRoot, { withFileTypes: true })) {
    candidates.push({ path: resolve(trashRoot, entry.name), layerId: entry.name.split("--", 1)[0] ?? null, inTrash: true });
  }
  for (const candidate of candidates.slice(0, maxItems)) {
    if (candidate.layerId !== null && referenced.has(candidate.layerId)) continue;
    attempted += 1;
    try {
      const metadata = await lstat(candidate.path);
      if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error("dependency-layer cleanup candidate is not a non-link directory");
      let removalPath = candidate.path;
      if (!candidate.inTrash) {
        const canonicalRoot = await realpath(layersRoot);
        const canonical = await realpath(candidate.path);
        assertDirectChild(canonicalRoot, canonical);
        if (candidate.layerId !== null) {
          const manifest = JSON.parse(await readFile(resolve(canonical, DEPENDENCY_LAYER_MANIFEST), "utf8")) as Record<string, unknown>;
          if (manifest.layerId !== candidate.layerId || typeof manifest.contentDigest !== "string") throw new Error("dependency-layer manifest does not match its directory");
        }
        removalPath = resolve(trashRoot, `${candidate.layerId ?? ".candidate"}--${randomUUID()}`);
        await (options.operations?.rename ?? rename)(canonical, removalPath);
      } else {
        const canonicalTrash = await realpath(trashRoot);
        assertDirectChild(canonicalTrash, await realpath(removalPath));
      }
      await (options.operations?.remove ?? rm)(removalPath, { recursive: true, force: false, maxRetries: 0 });
      if (candidate.layerId !== null && /^dependencies-[a-f0-9]{32}$/.test(candidate.layerId)) {
        await rm(dependencyLayerCertificationPath(dataDir, candidate.layerId), { force: true });
      }
      completed += 1;
    } catch (error) {
      // Platform: the pass is retry based, so a sharing violation leaves managed trash.
      await store.recordCleanupFailure(candidate.layerId ?? artifactName(candidate.path), "dependency-layer-delete", error);
    }
  }
  if (attempted < maxItems) {
    for (const entry of await readdir(dataDir, { withFileTypes: true })) {
      const match = /^dependency-layer-certification-(dependencies-[a-f0-9]{32})\.json$/.exec(entry.name);
      if (!match || !entry.isFile() || referenced.has(match[1]!)) continue;
      if (await lstat(resolve(layersRoot, match[1]!)).catch(error => missingOrThrow(error)) !== null) continue;
      attempted += 1;
      try {
        await (options.operations?.remove ?? rm)(resolve(dataDir, entry.name), { force: true });
        completed += 1;
      } catch (error) {
        await store.recordCleanupFailure(match[1]!, "dependency-layer-certification", error);
      }
      if (attempted >= maxItems) break;
    }
  }
  return { attempted, completed };
}

async function protectedCompileCachePaths(dataDir: string, state: CohortState): Promise<readonly string[]> {
  const paths: string[] = [];
  for (const release of Object.values(state.releases)) {
    try {
      const manifest = JSON.parse(await readFile(resolve(release.releaseRoot, RELEASE_MANIFEST_FILENAME), "utf8")) as { dependencyLayers?: Array<{ layerId?: unknown }> };
      const layers = (manifest.dependencyLayers ?? []).map(layer => layer.layerId).filter((id): id is string => typeof id === "string");
      paths.push(startupCompileCachePath(dataDir, release.releaseId, layers));
    } catch {
      paths.push(startupCompileCachePath(dataDir, release.releaseId, []));
    }
  }
  return paths;
}

async function referencedDependencyLayerIds(dataDir: string): Promise<Set<string>> {
  const referenced = new Set<string>();
  const releasesRoot = resolve(dataDir, "releases");
  const roots: string[] = [];
  for (const entry of await readdir(releasesRoot, { withFileTypes: true }).catch(() => [])) {
    if (entry.name === ".trash") {
      for (const trash of await readdir(resolve(releasesRoot, entry.name), { withFileTypes: true }).catch(() => [])) {
        if (trash.isDirectory()) roots.push(resolve(releasesRoot, entry.name, trash.name));
      }
    } else if (entry.isDirectory() && !entry.name.startsWith(".candidate-")) roots.push(resolve(releasesRoot, entry.name));
  }
  for (const root of roots) {
    try {
      const manifest = JSON.parse(await readFile(resolve(root, RELEASE_MANIFEST_FILENAME), "utf8")) as { dependencyLayers?: Array<{ layerId?: unknown }> };
      for (const layer of manifest.dependencyLayers ?? []) if (typeof layer.layerId === "string") referenced.add(layer.layerId);
    } catch {}
  }
  return referenced;
}

function assertDirectChild(parent: string, child: string): void {
  const fromParent = relative(parent, child);
  if (fromParent.length === 0 || fromParent === ".." || fromParent.startsWith(`..${sep}`) || isAbsolute(fromParent) || fromParent.includes(sep)) {
    throw new Error(`cleanup path is not a direct child of its managed root: ${child}`);
  }
}

function normalizeLimits(input: Partial<ReleaseCleanupLimits> | undefined): ReleaseCleanupLimits {
  const limits = { ...DEFAULT_LIMITS, ...input };
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value < 1) throw new Error(`invalid release cleanup ${name}: ${value}`);
  }
  return limits;
}

function parseWorkerHolds(value: string | undefined): readonly ExternalReleaseHold[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((hold): hold is ExternalReleaseHold => Boolean(hold) && typeof hold === "object"
      && ((hold as ExternalReleaseHold).authority === "agent" || (hold as ExternalReleaseHold).authority === "migration")
      && typeof (hold as ExternalReleaseHold).releaseId === "string");
  } catch {
    return [];
  }
}

function missingOrThrow(error: unknown): null {
  if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
  throw error;
}
function artifactName(path: string): string { return path.split(sep).at(-1) ?? "artifact"; }
function certificationReleaseId(path: string): string | null {
  return /^certification-(.+)\.json$/.exec(artifactName(path))?.[1] ?? null;
}
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
