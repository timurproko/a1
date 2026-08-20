import { createHash, randomUUID } from "node:crypto";
import { chmod, copyFile, lstat, mkdir, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { PRODUCT_PACKAGE_NAME, deriveReleaseIdentity, resolveWithin, type ReleaseIdentity, type ReleaseFileIdentity } from "./release.js";
import { PRODUCT_IDENTITY, PRODUCT_TEXT } from "../../product-identity.js";
import { mapWithConcurrency } from "./concurrency.js";

const RELEASE_FILE_IO_CONCURRENCY = 32;

export const RELEASE_MANIFEST_FILENAME = PRODUCT_IDENTITY.manifest.releaseFilename;

export interface MaterializedRelease extends ReleaseIdentity {
  readonly releaseRoot: string;
}

export interface MaterializeReleaseOptions {
  readonly onProgress?: (progress: { readonly phase: "copying"; readonly fileCount: number }) => void;
}

export interface CertifiedReleaseRecord {
  readonly releaseId: string;
  readonly releaseRoot: string;
  readonly packageVersion?: string;
  readonly contentDigest: string;
}

export async function materializeRelease(packageRoot: string, dataDir: string, options: MaterializeReleaseOptions = {}): Promise<MaterializedRelease> {
  const identity = await deriveReleaseIdentity(packageRoot);
  const storeRoot = resolve(dataDir, "releases");
  await mkdir(storeRoot, { recursive: true, mode: 0o700 });
  const releaseRoot = resolveWithin(storeRoot, identity.releaseId);
  const existing = await lstat(releaseRoot).catch(() => null);
  if (existing) return await verifyMaterializedRelease(releaseRoot, identity);

  options.onProgress?.({ phase: "copying", fileCount: identity.files.length });
  const candidate = resolveWithin(storeRoot, `.candidate-${identity.releaseId}-${randomUUID()}`);
  await mkdir(candidate, { recursive: false, mode: 0o700 });
  try {
    const directories = [...new Set(identity.files.map(file => dirname(resolveWithin(candidate, file.path))))];
    await mapWithConcurrency(directories, RELEASE_FILE_IO_CONCURRENCY, async directory => {
      await mkdir(directory, { recursive: true, mode: 0o700 });
    });
    await mapWithConcurrency(identity.files, RELEASE_FILE_IO_CONCURRENCY, async file => {
      const source = resolveWithin(identity.packageRoot, file.path);
      const destination = resolveWithin(candidate, file.path);
      await copyFile(source, destination);
      await chmod(destination, file.executable ? 0o500 : 0o400);
    });
    await writeFile(resolve(candidate, RELEASE_MANIFEST_FILENAME), JSON.stringify(identity, null, 2), { mode: 0o400, flag: "wx" });
    try {
      await rename(candidate, releaseRoot);
    } catch (error) {
      if (!await lstat(releaseRoot).catch(() => null)) throw error;
      await rm(candidate, { recursive: true, force: true });
      return await verifyMaterializedRelease(releaseRoot, identity);
    }
    return { ...identity, releaseRoot: await realpath(releaseRoot) };
  } catch (error) {
    await rm(candidate, { recursive: true, force: true });
    throw error;
  }
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
  assertContained(await realpath(selectedStoreRoot), canonical, "release root is outside the selected release store");
  const manifest = JSON.parse(await readFile(resolveWithin(canonical, RELEASE_MANIFEST_FILENAME), "utf8")) as ReleaseIdentity;
  validateManifest(manifest);
  if (manifest.releaseId !== record.releaseId || manifest.contentDigest !== record.contentDigest
    || (record.packageVersion !== undefined && manifest.packageVersion !== record.packageVersion)) {
    throw new Error(`certified release record differs from manifest for ${canonical}`);
  }
  if (canonical.split(sep).at(-1) !== manifest.releaseId) throw new Error(`release directory does not match identity ${manifest.releaseId}`);
  return { ...manifest, releaseRoot: canonical };
}

export async function verifyMaterializedRelease(
  releaseRoot: string,
  expected?: ReleaseIdentity,
  selectedStoreRoot?: string,
): Promise<MaterializedRelease> {
  const canonical = await realpath(releaseRoot);
  if (selectedStoreRoot) assertContained(await realpath(selectedStoreRoot), canonical, "release root is outside the selected release store");
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
    await verifyFile(canonical, file);
  });
  const recomputed = digestManifestFiles(manifest.files);
  if (recomputed !== manifest.contentDigest) throw new Error(`release content digest mismatch for ${manifest.releaseId}`);
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

async function verifyFile(root: string, file: ReleaseFileIdentity): Promise<void> {
  const path = resolveWithin(root, file.path);
  const metadata = await lstat(path).catch(() => null);
  if (!metadata?.isFile() || metadata.isSymbolicLink()) throw new Error(`release candidate is incomplete: ${file.path}`);
  if (metadata.size !== file.bytes) throw new Error(`release file size mismatch: ${file.path}`);
  const digest = createHash("sha256").update(await readFile(path)).digest("hex");
  if (digest !== file.sha256) throw new Error(`release file digest mismatch: ${file.path}`);
}

function validateManifest(value: ReleaseIdentity): void {
  if (value.packageName !== PRODUCT_PACKAGE_NAME || typeof value.packageVersion !== "string") throw new Error(PRODUCT_TEXT.diagnostic("release manifest metadata is invalid"));
  if (!/^[a-f0-9]{64}$/.test(value.contentDigest) || !/^[0-9A-Za-z.+_-]+-[a-f0-9]{20}$/.test(value.releaseId)) throw new Error(PRODUCT_TEXT.diagnostic("release identity is invalid"));
  if (!Array.isArray(value.files) || value.files.length === 0) throw new Error("release manifest contains no files");
  for (const file of value.files) {
    if (typeof file.path !== "string" || file.path.length === 0 || file.path.includes("\\") || file.path.startsWith("/") || file.path.split("/").includes("..")) {
      throw new Error(`invalid release manifest path: ${String(file.path)}`);
    }
    if (!Number.isSafeInteger(file.bytes) || file.bytes < 0 || !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error(`invalid release manifest file identity: ${file.path}`);
  }
}

function digestManifestFiles(files: readonly ReleaseFileIdentity[]): string {
  const digest = createHash("sha256");
  for (const file of [...files].sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0)) {
    digest.update(`${file.path}\0${file.bytes}\0${file.sha256}\0${file.executable ? 1 : 0}\n`);
  }
  return digest.digest("hex");
}

function assertContained(parent: string, child: string, message: string): void {
  const fromParent = relative(parent, child);
  if (fromParent === "" || (!fromParent.startsWith(`..${sep}`) && fromParent !== ".." && !isAbsolute(fromParent))) return;
  throw new Error(`${message}: ${child}`);
}
