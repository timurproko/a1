import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { PRODUCT_IDENTITY, PRODUCT_TEXT } from "../../product-identity.js";
import { mapWithConcurrency } from "./concurrency.js";

const RELEASE_FILE_IO_CONCURRENCY = 32;

export const PRODUCT_PACKAGE_NAME = PRODUCT_IDENTITY.packageName;

export interface ReleaseFileIdentity {
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
  readonly executable: boolean;
}

export interface ReleaseIdentity {
  readonly packageName: typeof PRODUCT_PACKAGE_NAME;
  readonly packageVersion: string;
  readonly contentDigest: string;
  readonly releaseId: string;
  readonly packageRoot: string;
  readonly files: readonly ReleaseFileIdentity[];
}

interface PackageManifest {
  readonly name?: unknown;
  readonly version?: unknown;
  readonly files?: unknown;
  readonly dependencies?: unknown;
  readonly optionalDependencies?: unknown;
}

/**
 * Derive release execution identity only from installed distribution metadata and
 * bytes. The version remains display metadata; the digest selects executable
 * content.
 */
export async function deriveReleaseIdentity(packageRoot: string): Promise<ReleaseIdentity> {
  const canonicalRoot = await realpath(packageRoot);
  const manifestPath = resolve(canonicalRoot, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as PackageManifest;
  if (manifest.name !== PRODUCT_PACKAGE_NAME) throw new Error(`unexpected ${PRODUCT_TEXT.displayName} package name: ${String(manifest.name)}`);
  if (typeof manifest.version !== "string" || manifest.version.length === 0) throw new Error(PRODUCT_TEXT.diagnostic("package metadata has no version"));

  const roots = distributionRoots(manifest);
  const paths = new Set<string>(["package.json"]);
  for (const root of roots) {
    const absolute = resolveWithin(canonicalRoot, root);
    await collectFiles(canonicalRoot, absolute, paths);
  }
  await collectDependencyClosure(canonicalRoot, canonicalRoot, manifest, paths, new Set());

  const sortedPaths = [...paths].sort();
  const files = await mapWithConcurrency(sortedPaths, RELEASE_FILE_IO_CONCURRENCY, async path => {
    const absolute = resolveWithin(canonicalRoot, path);
    const metadata = await lstat(absolute);
    if (!metadata.isFile()) throw new Error(`release payload is not a regular file: ${path}`);
    const bytes = await readFile(absolute);
    return {
      path: normalizeRelative(path),
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      executable: (metadata.mode & 0o111) !== 0,
    } satisfies ReleaseFileIdentity;
  });

  const digest = createHash("sha256");
  for (const file of files) digest.update(`${file.path}\0${file.bytes}\0${file.sha256}\0${file.executable ? 1 : 0}\n`);
  const contentDigest = digest.digest("hex");
  return {
    packageName: PRODUCT_PACKAGE_NAME,
    packageVersion: manifest.version,
    contentDigest,
    releaseId: `${manifest.version}-${contentDigest.slice(0, 20)}`,
    packageRoot: canonicalRoot,
    files,
  };
}

export function resolveWithin(root: string, candidate: string): string {
  if (candidate.includes("\0")) throw new Error("release path contains a null byte");
  const absolute = resolve(root, candidate);
  const fromRoot = relative(root, absolute);
  if (fromRoot === "" || (!isAbsolute(fromRoot) && fromRoot !== ".." && !fromRoot.startsWith(`..${sep}`))) return absolute;
  throw new Error(`release path escapes selected root: ${candidate}`);
}

function distributionRoots(manifest: PackageManifest): string[] {
  if (!Array.isArray(manifest.files)) throw new Error(PRODUCT_TEXT.diagnostic("package metadata has no distribution files list"));
  const roots = manifest.files.map(value => {
    if (typeof value !== "string" || value.length === 0) throw new Error(PRODUCT_TEXT.diagnostic("distribution file entry is invalid"));
    const normalized = normalizeRelative(value);
    if (normalized === "package.json") return normalized;
    if (isAbsolute(value) || normalized === ".." || normalized.startsWith("../")) throw new Error(PRODUCT_TEXT.diagnostic(`distribution path escapes package root: ${value}`));
    return normalized;
  });
  return [...new Set(roots)];
}

async function collectFiles(root: string, path: string, output: Set<string>, skipNodeModules = false): Promise<void> {
  const metadata = await lstat(path);
  const relativePath = normalizeRelative(relative(root, path));
  if (metadata.isSymbolicLink()) throw new Error(`release payload contains a symbolic link: ${relativePath}`);
  if (metadata.isFile()) {
    output.add(relativePath);
    return;
  }
  if (!metadata.isDirectory()) throw new Error(`release payload contains an unsupported entry: ${relativePath}`);
  for (const entry of await readdir(path)) {
    if (entry === ".bin" || (skipNodeModules && entry === "node_modules")) continue;
    await collectFiles(root, resolve(path, entry), output, skipNodeModules);
  }
}

async function collectDependencyClosure(
  root: string,
  requesterRoot: string,
  manifest: PackageManifest,
  output: Set<string>,
  visited: Set<string>,
): Promise<void> {
  const required = dependencyNames(manifest.dependencies);
  const optional = new Set(dependencyNames(manifest.optionalDependencies));
  for (const name of [...new Set([...required, ...optional])].sort()) {
    const packagePath = await findInstalledDependency(root, requesterRoot, name);
    if (!packagePath) {
      if (optional.has(name)) continue;
      throw new Error(`installed ${PRODUCT_TEXT.displayName} dependency is missing: ${name}`);
    }
    if (visited.has(packagePath)) continue;
    visited.add(packagePath);
    await collectFiles(root, packagePath, output, true);
    const dependencyManifest = JSON.parse(await readFile(resolve(packagePath, "package.json"), "utf8")) as PackageManifest;
    await collectDependencyClosure(root, packagePath, dependencyManifest, output, visited);
  }
}

async function findInstalledDependency(root: string, requesterRoot: string, name: string): Promise<string | null> {
  let directory = requesterRoot;
  while (true) {
    const candidate = resolve(directory, "node_modules", name);
    const fromRoot = relative(root, candidate);
    if (fromRoot !== ".." && !fromRoot.startsWith(`..${sep}`) && !isAbsolute(fromRoot)) {
      const metadata = await lstat(candidate).catch(() => null);
      if (metadata?.isDirectory() && !metadata.isSymbolicLink()) return candidate;
    }
    if (directory === root) return null;
    const parent = dirname(directory);
    if (parent === directory || relative(root, parent).startsWith("..")) return null;
    directory = parent;
  }
}

function dependencyNames(value: unknown): string[] {
  if (value === undefined) return [];
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(PRODUCT_TEXT.diagnostic("dependency metadata is invalid"));
  return Object.keys(value);
}

function normalizeRelative(path: string): string {
  return path.split(sep).join("/").replace(/^\.\//, "");
}

export function packageRootFromModule(moduleUrl: string): string {
  const url = new URL(moduleUrl);
  if (url.protocol !== "file:") throw new Error(PRODUCT_TEXT.diagnostic(`module URL must be a file URL: ${moduleUrl}`));
  let directory = dirname(url.pathname.replace(/^\/(.:)/, "$1"));
  while (basename(directory) !== "") {
    if (basename(directory) === "dist") return dirname(directory);
    directory = dirname(directory);
  }
  throw new Error(PRODUCT_TEXT.diagnostic("package root could not be derived from module URL"));
}
