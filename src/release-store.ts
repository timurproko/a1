import { createHash, randomUUID } from "node:crypto";
import { chmod, copyFile, lstat, mkdir, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { deriveReleaseIdentity, resolveWithin, type AddOneReleaseIdentity, type ReleaseFileIdentity } from "./release.js";

export const RELEASE_MANIFEST = ".addone-release.json";

export interface MaterializedRelease extends AddOneReleaseIdentity {
  readonly releaseRoot: string;
}

export async function materializeRelease(packageRoot: string, dataDir: string): Promise<MaterializedRelease> {
  const identity = await deriveReleaseIdentity(packageRoot);
  const storeRoot = resolve(dataDir, "releases");
  await mkdir(storeRoot, { recursive: true, mode: 0o700 });
  const releaseRoot = resolveWithin(storeRoot, identity.releaseId);
  const existing = await lstat(releaseRoot).catch(() => null);
  if (existing) return await verifyMaterializedRelease(releaseRoot, identity);

  const candidate = resolveWithin(storeRoot, `.candidate-${identity.releaseId}-${randomUUID()}`);
  await mkdir(candidate, { recursive: false, mode: 0o700 });
  try {
    for (const file of identity.files) {
      const source = resolveWithin(identity.packageRoot, file.path);
      const destination = resolveWithin(candidate, file.path);
      await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
      await copyFile(source, destination);
      await chmod(destination, file.executable ? 0o500 : 0o400);
    }
    await writeFile(resolve(candidate, RELEASE_MANIFEST), JSON.stringify(identity, null, 2), { mode: 0o400, flag: "wx" });
    await verifyMaterializedRelease(candidate, identity);
    await rename(candidate, releaseRoot);
    return await verifyMaterializedRelease(releaseRoot, identity);
  } catch (error) {
    await rm(candidate, { recursive: true, force: true });
    throw error;
  }
}

export async function readMaterializedRelease(releaseRoot: string): Promise<MaterializedRelease> {
  const canonical = await realpath(releaseRoot);
  const manifest = JSON.parse(await readFile(resolve(canonical, RELEASE_MANIFEST), "utf8")) as AddOneReleaseIdentity;
  return await verifyMaterializedRelease(canonical, manifest);
}

export async function verifyMaterializedRelease(
  releaseRoot: string,
  expected?: AddOneReleaseIdentity,
  selectedStoreRoot?: string,
): Promise<MaterializedRelease> {
  const canonical = await realpath(releaseRoot);
  if (selectedStoreRoot) assertContained(await realpath(selectedStoreRoot), canonical, "release root is outside the selected release store");
  const manifestPath = resolveWithin(canonical, RELEASE_MANIFEST);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as AddOneReleaseIdentity;
  validateManifest(manifest);
  if (expected && (manifest.releaseId !== expected.releaseId || manifest.contentDigest !== expected.contentDigest)) {
    throw new Error(`release identity mismatch for ${canonical}`);
  }
  if (canonical.split(sep).at(-1) !== manifest.releaseId && !canonical.split(sep).at(-1)?.startsWith(`.candidate-${manifest.releaseId}-`)) {
    throw new Error(`release directory does not match identity ${manifest.releaseId}`);
  }
  for (const file of manifest.files) await verifyFile(canonical, file);
  const recomputed = digestManifestFiles(manifest.files);
  if (recomputed !== manifest.contentDigest) throw new Error(`release content digest mismatch for ${manifest.releaseId}`);
  return { ...manifest, releaseRoot: canonical };
}

export async function assertImmutableExecutionRoot(release: MaterializedRelease, dataDir: string): Promise<void> {
  await verifyMaterializedRelease(release.releaseRoot, release, resolve(dataDir, "releases"));
  if (!process.env.ADDONE_RELEASE_ROOT) throw new Error("persistent AddOne process has no immutable release root");
  const selected = await realpath(process.env.ADDONE_RELEASE_ROOT);
  if (selected !== release.releaseRoot) throw new Error("persistent AddOne process selected a different immutable release root");
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

function validateManifest(value: AddOneReleaseIdentity): void {
  if (value.packageName !== "@timurproko/addone" || typeof value.packageVersion !== "string") throw new Error("invalid AddOne release manifest metadata");
  if (!/^[a-f0-9]{64}$/.test(value.contentDigest) || !/^[0-9A-Za-z.+_-]+-[a-f0-9]{20}$/.test(value.releaseId)) throw new Error("invalid AddOne release identity");
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
