import { createHash, randomUUID } from "node:crypto";
import { chmod, lstat, mkdir, readFile, realpath, rename, rm, symlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import {
  PRODUCT_PACKAGE_NAME,
  createReleaseIdentity,
  discoverReleasePayload,
  releaseFileIdentity,
  resolveWithin,
  type ReleaseFileIdentity,
  type ReleaseIdentity,
} from "./release.js";
import { PRODUCT_IDENTITY, PRODUCT_TEXT } from "../../product-identity.js";
import { mapWithConcurrency } from "./concurrency.js";
import {
  dependencyReference,
  materializeDependencyLayer,
  readCertifiedDependencyLayer,
  selectPublishedDependencyRuntimePayload,
  verifyDependencyLayer,
  type DependencyLayerOperationEvent,
  type DependencyLayerReference,
  type RuntimePayloadInventory,
} from "./dependency-layer.js";

const RELEASE_FILE_IO_CONCURRENCY = 32;
const certificationReady = new WeakSet<MaterializedRelease>();

export const RELEASE_MANIFEST_FILENAME = PRODUCT_IDENTITY.manifest.releaseFilename;

export interface MaterializedRelease extends ReleaseIdentity {
  readonly releaseRoot: string;
}

export type ReleaseContentOperation = "source-read" | "candidate-write" | "layer-write" | "layer-reuse" | "verification-read";
export interface ReleaseContentOperationEvent {
  readonly operation: ReleaseContentOperation;
  readonly path: string;
  readonly bytes: number;
}

export interface MaterializeReleaseOptions {
  readonly onProgress?: (progress: { readonly phase: "copying"; readonly fileCount: number }) => void;
  readonly onOperation?: (event: ReleaseContentOperationEvent) => void;
  readonly onRuntimeInventory?: (inventory: RuntimePayloadInventory) => void;
  /** Test seam for deterministic write-failure coverage. */
  readonly writeCandidateFile?: (path: string, bytes: Uint8Array, mode: number) => Promise<void>;
}

export interface VerifyMaterializedReleaseOptions {
  readonly onOperation?: (event: ReleaseContentOperationEvent) => void;
}

export interface CertifiedReleaseRecord {
  readonly releaseId: string;
  readonly releaseRoot: string;
  readonly packageVersion?: string;
  readonly contentDigest: string;
}

export async function materializeRelease(packageRoot: string, dataDir: string, options: MaterializeReleaseOptions = {}): Promise<MaterializedRelease> {
  const payload = await discoverReleasePayload(packageRoot, {
    onSourceRead: (path, bytes) => options.onOperation?.({ operation: "source-read", path, bytes }),
  });
  const storeRoot = resolve(dataDir, "releases");
  await mkdir(storeRoot, { recursive: true, mode: 0o700 });
  const dependencyPaths = payload.paths.filter(path => path.startsWith("node_modules/"));
  const productPaths = payload.paths.filter(path => !path.startsWith("node_modules/"));
  const selectedDependencies = await selectPublishedDependencyRuntimePayload(payload.packageRoot, dependencyPaths);
  options.onRuntimeInventory?.(selectedDependencies.inventory);
  const layerOperations: DependencyLayerOperationEvent[] = [];
  const layer = await materializeDependencyLayer(payload.packageRoot, dataDir, selectedDependencies.paths, {
    inventory: selectedDependencies.inventory,
    cachedFiles: payload.cachedFiles,
    onOperation: event => layerOperations.push(event),
    ...(options.writeCandidateFile === undefined ? {} : { writeCandidateFile: options.writeCandidateFile }),
  });
  const layerReferences = layer === null ? [] : [dependencyReference(layer)];
  options.onProgress?.({
    phase: "copying",
    fileCount: productPaths.length + (layer?.reused === false ? layer.files.length : 0),
  });
  for (const event of layerOperations) options.onOperation?.(event);

  const candidate = resolveWithin(storeRoot, `.candidate-${randomUUID()}`);
  await mkdir(candidate, { recursive: false, mode: 0o700 });
  try {
    const directories = [...new Set(productPaths.map(path => dirname(resolveWithin(candidate, path))))];
    await mapWithConcurrency(directories, RELEASE_FILE_IO_CONCURRENCY, async directory => {
      await mkdir(directory, { recursive: true, mode: 0o700 });
    });
    const files = await mapWithConcurrency(productPaths, RELEASE_FILE_IO_CONCURRENCY, async path => {
      const source = resolveWithin(payload.packageRoot, path);
      const destination = resolveWithin(candidate, path);
      const metadata = await lstat(source);
      if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error(`release payload is not a regular file: ${path}`);
      const cached = payload.cachedFiles.get(path);
      const bytes = cached ?? await readFile(source);
      if (!cached) options.onOperation?.({ operation: "source-read", path, bytes: bytes.length });
      const mode = (metadata.mode & 0o111) !== 0 ? 0o500 : 0o400;
      if (options.writeCandidateFile) await options.writeCandidateFile(destination, bytes, mode);
      else {
        await writeFile(destination, bytes, { flag: "wx", mode });
        await chmod(destination, mode);
      }
      options.onOperation?.({ operation: "candidate-write", path, bytes: bytes.length });
      return releaseFileIdentity(path, bytes, (metadata.mode & 0o111) !== 0);
    });

    const identity = createReleaseIdentity(payload.packageRoot, payload.packageVersion, files, layerReferences);
    if (layer !== null) {
      const binding = resolveWithin(candidate, "node_modules");
      const target = resolveWithin(layer.layerRoot, "node_modules");
      await symlink(target, binding, process.platform === "win32" ? "junction" : "dir");
    }
    const releaseRoot = resolveWithin(storeRoot, identity.releaseId);
    if (await lstat(releaseRoot).catch(() => null)) {
      await rm(candidate, { recursive: true, force: true });
      return certificationReadyRelease(await verifyMaterializedRelease(releaseRoot, identity));
    }

    await writeFile(resolve(candidate, RELEASE_MANIFEST_FILENAME), JSON.stringify(identity, null, 2), { mode: 0o400, flag: "wx" });
    try {
      await rename(candidate, releaseRoot);
    } catch (error) {
      if (!await lstat(releaseRoot).catch(() => null)) throw error;
      await rm(candidate, { recursive: true, force: true });
      return certificationReadyRelease(await verifyMaterializedRelease(releaseRoot, identity));
    }
    return certificationReadyRelease({ ...identity, releaseRoot: await realpath(releaseRoot) });
  } catch (error) {
    await rm(candidate, { recursive: true, force: true });
    throw error;
  }
}

/** Consume proof that this exact object was freshly materialized or fully verified in this process. */
export function consumeMaterializationProof(release: MaterializedRelease): boolean {
  if (!certificationReady.has(release)) return false;
  certificationReady.delete(release);
  return true;
}

export async function readMaterializedRelease(releaseRoot: string): Promise<MaterializedRelease> {
  const canonical = await realpath(releaseRoot);
  const manifest = JSON.parse(await readFile(resolve(canonical, RELEASE_MANIFEST_FILENAME), "utf8")) as ReleaseIdentity;
  return await verifyMaterializedRelease(canonical, manifest);
}

/**
 * Load metadata for a release whose bytes were already certified by the
 * current parent process or an authenticated live supervisor. Callers must
 * establish one of those preconditions; untrusted releases require full
 * verification.
 */
export async function readCertifiedReleaseManifest(
  record: CertifiedReleaseRecord,
  selectedStoreRoot: string,
): Promise<MaterializedRelease> {
  const canonical = await realpath(record.releaseRoot);
  const canonicalStoreRoot = await realpath(selectedStoreRoot);
  assertContained(canonicalStoreRoot, canonical, "release root is outside the selected release store");
  const manifest = JSON.parse(await readFile(resolveWithin(canonical, RELEASE_MANIFEST_FILENAME), "utf8")) as ReleaseIdentity;
  validateManifest(manifest);
  if (manifest.releaseId !== record.releaseId || manifest.contentDigest !== record.contentDigest
    || (record.packageVersion !== undefined && manifest.packageVersion !== record.packageVersion)) {
    throw new Error(`certified release record differs from manifest for ${canonical}`);
  }
  if (canonical.split(sep).at(-1) !== manifest.releaseId) throw new Error(`release directory does not match identity ${manifest.releaseId}`);
  await verifyReleaseDependencies(canonical, canonicalStoreRoot, manifest.dependencyLayers ?? [], false);
  return { ...manifest, releaseRoot: canonical };
}

export async function verifyMaterializedRelease(
  releaseRoot: string,
  expected?: ReleaseIdentity,
  selectedStoreRoot?: string,
  options: VerifyMaterializedReleaseOptions = {},
): Promise<MaterializedRelease> {
  const canonical = await realpath(releaseRoot);
  const canonicalStoreRoot = selectedStoreRoot ? await realpath(selectedStoreRoot) : await realpath(dirname(canonical));
  assertContained(canonicalStoreRoot, canonical, "release root is outside the selected release store");
  const manifestPath = resolveWithin(canonical, RELEASE_MANIFEST_FILENAME);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as ReleaseIdentity;
  validateManifest(manifest);
  if (expected && (manifest.releaseId !== expected.releaseId || manifest.contentDigest !== expected.contentDigest)) {
    throw new Error(`release identity mismatch for ${canonical}`);
  }
  if (canonical.split(sep).at(-1) !== manifest.releaseId && !canonical.split(sep).at(-1)?.startsWith(`.candidate-${manifest.releaseId}-`)) {
    throw new Error(`release directory does not match identity ${manifest.releaseId}`);
  }
  await mapWithConcurrency(manifest.files, RELEASE_FILE_IO_CONCURRENCY, async file => {
    await verifyFile(canonical, file, options);
  });
  const recomputed = createReleaseIdentity(manifest.packageRoot, manifest.packageVersion, manifest.files, manifest.dependencyLayers ?? []).contentDigest;
  if (recomputed !== manifest.contentDigest) throw new Error(`release content digest mismatch for ${manifest.releaseId}`);
  await verifyReleaseDependencies(canonical, canonicalStoreRoot, manifest.dependencyLayers ?? [], true, options);
  return { ...manifest, releaseRoot: canonical };
}

export async function assertImmutableExecutionRoot(release: MaterializedRelease, dataDir: string): Promise<void> {
  const storeRoot = await realpath(resolve(dataDir, "releases"));
  assertContained(storeRoot, release.releaseRoot, "release root is outside the selected release store");
  const selectedRoot = process.env[PRODUCT_IDENTITY.environment.releaseRoot];
  if (!selectedRoot) throw new Error(PRODUCT_TEXT.diagnostic("persistent process has no immutable release root"));
  const selected = await realpath(selectedRoot);
  if (selected !== release.releaseRoot) throw new Error(PRODUCT_TEXT.diagnostic("persistent process selected a different immutable release root"));
}

export async function resolveReleaseEntryPoint(release: MaterializedRelease, entryPoint: string): Promise<string> {
  const normalized = entryPoint.split("\\").join("/").replace(/^\.\//, "");
  if (!release.files.some(file => file.path === normalized)) throw new Error(`entry point is not in the verified release manifest: ${entryPoint}`);
  const path = resolveWithin(release.releaseRoot, normalized);
  const canonical = await realpath(path);
  assertContained(release.releaseRoot, canonical, "entry point resolves outside the selected release root");
  return canonical;
}

async function verifyReleaseDependencies(
  releaseRoot: string,
  storeRoot: string,
  references: readonly DependencyLayerReference[],
  fullVerification: boolean,
  options: VerifyMaterializedReleaseOptions = {},
): Promise<void> {
  if (references.length === 0) return;
  if (references.length !== 1) throw new Error("release currently supports exactly one dependency layer");
  const dataDir = dirname(storeRoot);
  const reference = references[0]!;
  const layer = fullVerification
    ? await verifyDependencyLayer(dataDir, reference, event => options.onOperation?.({ operation: event.operation, path: event.path, bytes: event.bytes }))
    : await readCertifiedDependencyLayer(dataDir, reference.layerId, reference);
  const binding = resolveWithin(releaseRoot, reference.binding);
  const metadata = await lstat(binding);
  if (!metadata.isSymbolicLink()) throw new Error(`release dependency binding is not managed: ${binding}`);
  const target = await realpath(binding);
  const expected = await realpath(resolveWithin(layer.layerRoot, "node_modules"));
  if (target !== expected) throw new Error(`release dependency binding targets unexpected content: ${target}`);
}

async function verifyFile(root: string, file: ReleaseFileIdentity, options: VerifyMaterializedReleaseOptions): Promise<void> {
  const path = resolveWithin(root, file.path);
  const metadata = await lstat(path).catch(() => null);
  if (!metadata?.isFile() || metadata.isSymbolicLink()) throw new Error(`release candidate is incomplete: ${file.path}`);
  if (metadata.size !== file.bytes) throw new Error(`release file size mismatch: ${file.path}`);
  const bytes = await readFile(path);
  options.onOperation?.({ operation: "verification-read", path: file.path, bytes: bytes.length });
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== file.sha256) throw new Error(`release file digest mismatch: ${file.path}`);
}

function certificationReadyRelease(release: MaterializedRelease): MaterializedRelease {
  certificationReady.add(release);
  return release;
}

function validateManifest(value: ReleaseIdentity): void {
  if (value.packageName !== PRODUCT_PACKAGE_NAME || typeof value.packageVersion !== "string") throw new Error(PRODUCT_TEXT.diagnostic("release manifest metadata is invalid"));
  if (!/^[a-f0-9]{64}$/.test(value.contentDigest) || !/^[0-9A-Za-z.+_-]+-[a-f0-9]{20}$/.test(value.releaseId)) throw new Error(PRODUCT_TEXT.diagnostic("release identity is invalid"));
  if (!Array.isArray(value.files) || value.files.length === 0) throw new Error("release manifest contains no files");
  if (value.dependencyLayers !== undefined && (!Array.isArray(value.dependencyLayers) || value.dependencyLayers.length === 0
    || value.dependencyLayers.some(layer => !/^dependencies-[a-f0-9]{32}$/.test(layer.layerId)
      || !/^[a-f0-9]{64}$/.test(layer.contentDigest) || layer.binding !== "node_modules"))) {
    throw new Error("release dependency-layer references are invalid");
  }
  for (const file of value.files) {
    if (typeof file.path !== "string" || file.path.length === 0 || file.path.includes("\\") || file.path.startsWith("/") || file.path.split("/").includes("..")) {
      throw new Error(`invalid release manifest path: ${String(file.path)}`);
    }
    if (!Number.isSafeInteger(file.bytes) || file.bytes < 0 || !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error(`invalid release manifest file identity: ${file.path}`);
  }
}

function assertContained(parent: string, child: string, message: string): void {
  const fromParent = relative(parent, child);
  if (fromParent === "" || (!fromParent.startsWith(`..${sep}`) && fromParent !== ".." && !isAbsolute(fromParent))) return;
  throw new Error(`${message}: ${child}`);
}
