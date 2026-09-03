import { randomUUID } from "node:crypto";
import { chmod, lstat, mkdir, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, posix, relative, resolve, sep } from "node:path";
import { mapWithConcurrency } from "./concurrency.js";
import { digestManifestFiles, releaseFileIdentity, resolveWithin, type ReleaseFileIdentity } from "./release.js";
import { PRODUCT_IDENTITY } from "../../product-identity.js";

const LAYER_IO_CONCURRENCY = 32;
export const DEPENDENCY_LAYER_SCHEMA = PRODUCT_IDENTITY.evidence.dependencyLayerSchema;
export const DEPENDENCY_LAYER_MANIFEST = "dependency-layer-manifest.json";
export const RUNTIME_PAYLOAD_INVENTORY = "dist/runtime-payload-inventory.json";

export interface RuntimePayloadExclusion {
  readonly path: string;
  readonly reason: "type-declaration" | "source-map" | "unreachable-development";
}

export interface RuntimePayloadInventory {
  readonly schema: typeof PRODUCT_IDENTITY.evidence.runtimePayloadSchema;
  readonly includedFiles: number;
  readonly includedBytes: number;
  readonly excludedFiles: number;
  readonly excludedBytes: number;
  readonly uncertaintyRetainedFiles: number;
  readonly exclusions: readonly RuntimePayloadExclusion[];
}

export interface DependencyLayerIdentity {
  readonly schema: typeof DEPENDENCY_LAYER_SCHEMA;
  readonly layerId: string;
  readonly contentDigest: string;
  readonly files: readonly ReleaseFileIdentity[];
  readonly inventory: RuntimePayloadInventory;
}

export interface DependencyLayerReference {
  readonly layerId: string;
  readonly contentDigest: string;
  readonly binding: "node_modules";
}

export interface MaterializedDependencyLayer extends DependencyLayerIdentity {
  readonly layerRoot: string;
  readonly reused: boolean;
}

export interface DependencyLayerOperationEvent {
  readonly operation: "source-read" | "layer-write" | "layer-reuse" | "verification-read";
  readonly path: string;
  readonly bytes: number;
}

export interface SelectedRuntimePayload {
  readonly paths: readonly string[];
  readonly inventory: RuntimePayloadInventory;
}

export interface PublishedRuntimePayload extends SelectedRuntimePayload {
  readonly schema: typeof PRODUCT_IDENTITY.evidence.runtimePayloadSchema;
  readonly entryPoints: readonly string[];
  readonly declaredAssets: readonly string[];
}

/** Consume a publication-generated inventory when present, otherwise retain the conservative policy. */
export async function selectPublishedDependencyRuntimePayload(packageRoot: string, paths: readonly string[]): Promise<SelectedRuntimePayload> {
  const inventoryPath = resolve(packageRoot, RUNTIME_PAYLOAD_INVENTORY);
  const published = await readFile(inventoryPath, "utf8").then(source => JSON.parse(source) as PublishedRuntimePayload).catch(() => null);
  if (published === null) return await selectDependencyRuntimePayload(packageRoot, paths);
  if (published.schema !== PRODUCT_IDENTITY.evidence.runtimePayloadSchema || !Array.isArray(published.paths)
    || !Array.isArray(published.entryPoints) || !Array.isArray(published.declaredAssets) || !published.inventory
    || published.inventory.schema !== PRODUCT_IDENTITY.evidence.runtimePayloadSchema) {
    throw new Error("published runtime payload inventory is invalid");
  }
  const discovered = [...paths].sort();
  const accounted = [...published.paths, ...published.inventory.exclusions.map(item => item.path)].sort();
  if (JSON.stringify(discovered) !== JSON.stringify(accounted)) {
    throw new Error("installed dependency topology differs from the published runtime inventory");
  }
  return { paths: [...published.paths], inventory: published.inventory };
}

/** Generate publication evidence from literal module reachability and declared runtime assets. */
export async function generateDependencyRuntimePayload(
  packageRoot: string,
  allPaths: readonly string[],
  productPaths: readonly string[],
): Promise<SelectedRuntimePayload> {
  const available = new Set(allPaths);
  const selected = new Set<string>();
  const queue = productPaths.filter(isJavaScriptModule);
  for (const manifestPath of allPaths.filter(path => path.startsWith("node_modules/") && path.endsWith("/package.json"))) {
    try {
      const manifest = JSON.parse(await readFile(resolveWithin(packageRoot, manifestPath), "utf8")) as { exports?: unknown; module?: unknown; main?: unknown };
      const packagePath = manifestPath.slice(0, -"/package.json".length);
      const target = exportedTarget(manifest.exports, "")
        ?? (typeof manifest.module === "string" ? manifest.module : typeof manifest.main === "string" ? manifest.main : "index.js");
      const entry = availableModule(relativePath(packagePath, target), available);
      if (entry !== null && !selected.has(entry)) {
        selected.add(entry);
        if (isJavaScriptModule(entry)) queue.push(entry);
      }
    } catch {}
  }
  const visited = new Set<string>();
  while (queue.length > 0) {
    const importer = queue.shift()!;
    if (visited.has(importer)) continue;
    visited.add(importer);
    const source = await readFile(resolveWithin(packageRoot, importer), "utf8");
    const specifiers = [...source.matchAll(/(?:\bimport\s*(?:[^"'`]*?\sfrom\s*)?|\bexport\s+[^"'`]*?\sfrom\s*|\bimport\s*\(|\brequire\s*\()\s*["'`]([^"'`]+)["'`]/g)]
      .map(match => match[1]!)
      .filter(specifier => !specifier.startsWith("node:"));
    for (const specifier of specifiers) {
      const resolved = await resolvePublishedSpecifier(packageRoot, importer, specifier, available);
      if (resolved === null || !resolved.startsWith("node_modules/")) continue;
      if (!selected.has(resolved)) {
        selected.add(resolved);
        if (isJavaScriptModule(resolved)) queue.push(resolved);
      }
    }
    if (importer.startsWith("node_modules/") && /\b(?:import|require)\s*\(\s*(?!["'`])/.test(source)) {
      const prefix = dependencyPackagePrefix(importer);
      for (const path of allPaths) if (path.startsWith(`${prefix}/`)) selected.add(path);
    }
  }

  for (const path of allPaths) {
    if (!path.startsWith("node_modules/")) continue;
    if (path.endsWith("/package.json") || /(?:^|\/)LICENSE(?:\.|$)/i.test(path)
      || /\.(?:json|node|wasm|css|html|png|jpg|jpeg|gif|svg|md)$/.test(path)) selected.add(path);
  }
  const conservative = await selectDependencyRuntimePayload(packageRoot, allPaths.filter(path => path.startsWith("node_modules/")));
  const paths = conservative.paths.filter(path => selected.has(path)).sort();
  const exclusions: RuntimePayloadExclusion[] = [];
  let includedBytes = 0;
  let excludedBytes = 0;
  let uncertaintyRetainedFiles = 0;
  const conservativeReasons = new Map(conservative.inventory.exclusions.map(item => [item.path, item.reason]));
  for (const path of allPaths.filter(path => path.startsWith("node_modules/")).sort()) {
    const bytes = (await lstat(resolveWithin(packageRoot, path))).size;
    if (paths.includes(path)) {
      includedBytes += bytes;
      if (!isJavaScriptModule(path) && !/\.(?:json|node|wasm|css|html|png|jpg|jpeg|gif|svg)$/.test(path)) uncertaintyRetainedFiles += 1;
    } else {
      excludedBytes += bytes;
      exclusions.push({ path, reason: conservativeReasons.get(path) ?? "unreachable-development" });
    }
  }
  return {
    paths,
    inventory: {
      schema: PRODUCT_IDENTITY.evidence.runtimePayloadSchema,
      includedFiles: paths.length,
      includedBytes,
      excludedFiles: exclusions.length,
      excludedBytes,
      uncertaintyRetainedFiles,
      exclusions,
    },
  };
}

/** Conservatively omit only files Node never executes; uncertain assets remain selected. */
export async function selectDependencyRuntimePayload(packageRoot: string, paths: readonly string[]): Promise<SelectedRuntimePayload> {
  const included: string[] = [];
  const exclusions: RuntimePayloadExclusion[] = [];
  let includedBytes = 0;
  let excludedBytes = 0;
  let uncertaintyRetainedFiles = 0;
  await mapWithConcurrency([...paths].sort(), LAYER_IO_CONCURRENCY, async path => {
    const metadata = await lstat(resolveWithin(packageRoot, path));
    const reason = /\.d\.(?:ts|mts|cts)$/.test(path) ? "type-declaration" as const
      : /\.map$/.test(path) ? "source-map" as const
      : null;
    if (reason !== null) {
      exclusions.push({ path, reason });
      excludedBytes += metadata.size;
      return;
    }
    included.push(path);
    includedBytes += metadata.size;
    if (!/\.(?:js|mjs|cjs|json|node|wasm|css|html|png|jpg|jpeg|gif|svg)$/.test(path) && !/(?:^|\/)LICENSE(?:\.|$)/i.test(path)) {
      uncertaintyRetainedFiles += 1;
    }
  });
  exclusions.sort((left, right) => left.path.localeCompare(right.path));
  included.sort();
  return {
    paths: included,
    inventory: {
      schema: PRODUCT_IDENTITY.evidence.runtimePayloadSchema,
      includedFiles: included.length,
      includedBytes,
      excludedFiles: exclusions.length,
      excludedBytes,
      uncertaintyRetainedFiles,
      exclusions,
    },
  };
}

export interface MaterializeDependencyLayerOptions {
  readonly inventory: RuntimePayloadInventory;
  readonly cachedFiles?: ReadonlyMap<string, Buffer>;
  readonly onOperation?: (event: DependencyLayerOperationEvent) => void;
  readonly writeCandidateFile?: (path: string, bytes: Uint8Array, mode: number) => Promise<void>;
}

/** Materialize or reuse an exact immutable dependency layer after one source-content pass. */
export async function materializeDependencyLayer(
  packageRoot: string,
  dataDir: string,
  paths: readonly string[],
  options: MaterializeDependencyLayerOptions,
): Promise<MaterializedDependencyLayer | null> {
  if (paths.length === 0) return null;
  const sourceRoot = await realpath(packageRoot);
  const selected = [...paths].sort();
  const content = await mapWithConcurrency(selected, LAYER_IO_CONCURRENCY, async path => {
    const source = resolveWithin(sourceRoot, path);
    const metadata = await lstat(source);
    if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error(`dependency-layer input is not a regular file: ${path}`);
    const cached = options.cachedFiles?.get(path);
    const bytes = cached ?? await readFile(source);
    if (!cached) options.onOperation?.({ operation: "source-read", path, bytes: bytes.length });
    return { path, bytes, mode: (metadata.mode & 0o111) !== 0 ? 0o500 : 0o400, identity: releaseFileIdentity(path, bytes, (metadata.mode & 0o111) !== 0) };
  });
  const files = content.map(item => item.identity);
  const contentDigest = digestManifestFiles(files);
  const identity: DependencyLayerIdentity = {
    schema: DEPENDENCY_LAYER_SCHEMA,
    layerId: `dependencies-${contentDigest.slice(0, 32)}`,
    contentDigest,
    files,
    inventory: options.inventory,
  };
  const layersRoot = resolve(dataDir, "dependency-layers");
  await mkdir(layersRoot, { recursive: true, mode: 0o700 });
  const layerRoot = resolveWithin(layersRoot, identity.layerId);
  if (await lstat(layerRoot).catch(() => null)) {
    const reused = await reuseDependencyLayer(dataDir, identity);
    for (const file of reused.files) options.onOperation?.({ operation: "layer-reuse", path: file.path, bytes: file.bytes });
    return { ...reused, reused: true };
  }

  const candidate = resolveWithin(layersRoot, `.candidate-${randomUUID()}`);
  await mkdir(candidate, { mode: 0o700 });
  try {
    const directories = [...new Set(content.map(item => dirname(resolveWithin(candidate, item.path))))];
    await mapWithConcurrency(directories, LAYER_IO_CONCURRENCY, async directory => await mkdir(directory, { recursive: true, mode: 0o700 }));
    await mapWithConcurrency(content, LAYER_IO_CONCURRENCY, async item => {
      const destination = resolveWithin(candidate, item.path);
      if (options.writeCandidateFile) await options.writeCandidateFile(destination, item.bytes, item.mode);
      else {
        await writeFile(destination, item.bytes, { flag: "wx", mode: item.mode });
        await chmod(destination, item.mode);
      }
      options.onOperation?.({ operation: "layer-write", path: item.path, bytes: item.bytes.length });
    });
    await writeFile(resolve(candidate, DEPENDENCY_LAYER_MANIFEST), JSON.stringify(identity, null, 2), { flag: "wx", mode: 0o400 });
    try {
      await rename(candidate, layerRoot);
    } catch (error) {
      if (!await lstat(layerRoot).catch(() => null)) throw error;
      await rm(candidate, { recursive: true, force: true });
      const winner = await reuseDependencyLayer(dataDir, identity);
      for (const file of winner.files) options.onOperation?.({ operation: "layer-reuse", path: file.path, bytes: file.bytes });
      return { ...winner, reused: true };
    }
    await writeLayerCertification(dataDir, identity);
    return { ...identity, layerRoot: await realpath(layerRoot), reused: false };
  } catch (error) {
    await rm(candidate, { recursive: true, force: true });
    throw error;
  }
}

/** Read trusted layer certification and canonical metadata without rereading every payload byte. */
export async function readCertifiedDependencyLayer(
  dataDir: string,
  layerId: string,
  expected?: Pick<DependencyLayerIdentity, "layerId" | "contentDigest">,
): Promise<Omit<MaterializedDependencyLayer, "reused">> {
  const layersRoot = await realpath(resolve(dataDir, "dependency-layers"));
  const layerRoot = await realpath(resolveWithin(layersRoot, layerId));
  assertDirectChild(layersRoot, layerRoot);
  const metadata = await lstat(resolve(layersRoot, layerId));
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error(`dependency layer is not a managed non-link directory: ${layerId}`);
  const manifest = JSON.parse(await readFile(resolve(layerRoot, DEPENDENCY_LAYER_MANIFEST), "utf8")) as DependencyLayerIdentity;
  validateLayerManifest(manifest);
  const certification = JSON.parse(await readFile(certificationPath(dataDir, layerId), "utf8")) as Record<string, unknown>;
  if (certification.schema !== PRODUCT_IDENTITY.evidence.dependencyLayerCertificationSchema || certification.layerId !== manifest.layerId || certification.contentDigest !== manifest.contentDigest) {
    throw new Error(`dependency layer certification differs from manifest: ${layerId}`);
  }
  if (expected && (expected.layerId !== manifest.layerId || expected.contentDigest !== manifest.contentDigest)) {
    throw new Error(`dependency layer identity mismatch: ${layerId}`);
  }
  return { ...manifest, layerRoot };
}

/** Fully verify a layer when certification is absent or explicit tamper evidence is required. */
export async function verifyDependencyLayer(
  dataDir: string,
  reference: DependencyLayerReference,
  onOperation?: (event: DependencyLayerOperationEvent) => void,
): Promise<Omit<MaterializedDependencyLayer, "reused">> {
  const layersRoot = await realpath(resolve(dataDir, "dependency-layers"));
  const layerRoot = await realpath(resolveWithin(layersRoot, reference.layerId));
  assertDirectChild(layersRoot, layerRoot);
  const manifest = JSON.parse(await readFile(resolve(layerRoot, DEPENDENCY_LAYER_MANIFEST), "utf8")) as DependencyLayerIdentity;
  validateLayerManifest(manifest);
  if (manifest.layerId !== reference.layerId || manifest.contentDigest !== reference.contentDigest) throw new Error(`dependency layer reference mismatch: ${reference.layerId}`);
  await mapWithConcurrency(manifest.files, LAYER_IO_CONCURRENCY, async file => {
    const path = resolveWithin(layerRoot, file.path);
    const metadata = await lstat(path);
    if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size !== file.bytes) throw new Error(`dependency layer file mismatch: ${file.path}`);
    const bytes = await readFile(path);
    onOperation?.({ operation: "verification-read", path: file.path, bytes: bytes.length });
    const actual = releaseFileIdentity(file.path, bytes, file.executable);
    if (actual.sha256 !== file.sha256) throw new Error(`dependency layer file digest mismatch: ${file.path}`);
  });
  if (digestManifestFiles(manifest.files) !== manifest.contentDigest) throw new Error(`dependency layer content digest mismatch: ${manifest.layerId}`);
  await writeLayerCertification(dataDir, manifest);
  return { ...manifest, layerRoot };
}

export function dependencyReference(layer: MaterializedDependencyLayer): DependencyLayerReference {
  return { layerId: layer.layerId, contentDigest: layer.contentDigest, binding: "node_modules" };
}

export function dependencyLayerCertificationPath(dataDir: string, layerId: string): string {
  return certificationPath(dataDir, layerId);
}

function certificationPath(dataDir: string, layerId: string): string {
  return resolve(dataDir, `dependency-layer-certification-${layerId}.json`);
}

async function reuseDependencyLayer(dataDir: string, identity: DependencyLayerIdentity): Promise<Omit<MaterializedDependencyLayer, "reused">> {
  try {
    return await readCertifiedDependencyLayer(dataDir, identity.layerId, identity);
  } catch (error) {
    const verified = await verifyDependencyLayer(dataDir, dependencyReference({ ...identity, layerRoot: resolve(dataDir, "dependency-layers", identity.layerId), reused: true }));
    if (verified.layerId !== identity.layerId || verified.contentDigest !== identity.contentDigest) throw error;
    return verified;
  }
}

async function writeLayerCertification(dataDir: string, identity: DependencyLayerIdentity): Promise<void> {
  const path = certificationPath(dataDir, identity.layerId);
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify({
    schema: PRODUCT_IDENTITY.evidence.dependencyLayerCertificationSchema,
    layerId: identity.layerId,
    contentDigest: identity.contentDigest,
    certifiedAt: new Date().toISOString(),
  }, null, 2), { flag: "wx", mode: 0o600 });
  try {
    await rename(temporary, path);
  } catch (error) {
    if (!await lstat(path).catch(() => null)) throw error;
    await rm(temporary, { force: true });
  }
}

function validateLayerManifest(value: DependencyLayerIdentity): void {
  if (value.schema !== DEPENDENCY_LAYER_SCHEMA || !/^dependencies-[a-f0-9]{32}$/.test(value.layerId)
    || !/^[a-f0-9]{64}$/.test(value.contentDigest) || !Array.isArray(value.files) || value.files.length === 0
    || value.files.some(file => !file.path.startsWith("node_modules/") || file.path.includes("..") || !/^[a-f0-9]{64}$/.test(file.sha256))) {
    throw new Error("dependency layer manifest is invalid");
  }
  if (digestManifestFiles(value.files) !== value.contentDigest || value.layerId !== `dependencies-${value.contentDigest.slice(0, 32)}`) {
    throw new Error(`dependency layer manifest identity is invalid: ${value.layerId}`);
  }
}

async function resolvePublishedSpecifier(
  packageRoot: string,
  importer: string,
  specifier: string,
  available: ReadonlySet<string>,
): Promise<string | null> {
  if (specifier.startsWith(".")) return availableModule(relativePath(dirname(importer), specifier), available);
  if (specifier.startsWith("/") || specifier.startsWith("#")) return null;
  const parts = specifier.split("/");
  const packageName = parts[0]!.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]!;
  const subpath = parts.slice(packageName.startsWith("@") ? 2 : 1).join("/");
  const suffix = `node_modules/${packageName}/package.json`;
  const manifests = [...available].filter(path => path.endsWith(suffix));
  manifests.sort((left, right) => commonPrefixLength(importer, right) - commonPrefixLength(importer, left));
  for (const manifestPath of manifests) {
    try {
      const manifest = JSON.parse(await readFile(resolveWithin(packageRoot, manifestPath), "utf8")) as {
        exports?: unknown; module?: unknown; main?: unknown;
      };
      const packagePath = manifestPath.slice(0, -"/package.json".length);
      const target = exportedTarget(manifest.exports, subpath) ?? (subpath.length > 0 ? subpath
        : typeof manifest.module === "string" ? manifest.module
        : typeof manifest.main === "string" ? manifest.main
        : "index.js");
      const resolved = availableModule(relativePath(packagePath, target), available);
      if (resolved !== null) return resolved;
    } catch {}
  }
  return null;
}

function exportedTarget(exportsValue: unknown, subpath: string): string | null {
  const select = (value: unknown): string | null => {
    if (typeof value === "string") return value;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    return select(record.import) ?? select(record.node) ?? select(record.default);
  };
  if (typeof exportsValue === "string") return subpath.length === 0 ? exportsValue : null;
  if (!exportsValue || typeof exportsValue !== "object" || Array.isArray(exportsValue)) return null;
  const record = exportsValue as Record<string, unknown>;
  return select(record[subpath.length === 0 ? "." : `./${subpath}`]) ?? (subpath.length === 0 ? select(exportsValue) : null);
}

function relativePath(root: string, target: string): string {
  return posix.normalize(posix.join(root.split(sep).join("/"), target));
}
function availableModule(path: string, available: ReadonlySet<string>): string | null {
  const normalized = path.replace(/^\.\//, "");
  for (const candidate of [normalized, `${normalized}.js`, `${normalized}.mjs`, `${normalized}.cjs`, `${normalized}.json`, `${normalized}/index.js`]) {
    if (available.has(candidate)) return candidate;
  }
  return null;
}
function commonPrefixLength(left: string, right: string): number {
  const leftParts = left.split("/");
  const rightParts = right.split("/");
  let index = 0;
  while (leftParts[index] === rightParts[index]) index += 1;
  return index;
}

function dependencyPackagePrefix(path: string): string {
  const parts = path.split("/");
  const nodeModules = parts.lastIndexOf("node_modules");
  const packageParts = parts[nodeModules + 1]?.startsWith("@") ? 2 : 1;
  return parts.slice(0, nodeModules + 1 + packageParts).join("/");
}

function isJavaScriptModule(path: string): boolean { return /\.(?:js|mjs|cjs)$/.test(path); }

function assertDirectChild(parent: string, child: string): void {
  const path = relative(parent, child);
  if (path.length === 0 || path === ".." || path.startsWith(`..${sep}`) || path.includes(sep)) throw new Error(`dependency layer escapes managed storage: ${child}`);
}
