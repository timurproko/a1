import { randomUUID } from "node:crypto";
import { chmod, lstat, mkdir, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { PRODUCT_IDENTITY } from "../../product-identity.js";
import { immutablePlatformPolicy } from "./immutable-platform.js";

export const DEPENDENCY_CERTIFICATIONS_DIRECTORY = "dependency-certifications";

type LayerIdentity = { readonly layerId: string; readonly contentDigest: string };

export interface ReadDependencyCertificationOptions {
  /** Only authenticated parent-started supervisors may upgrade missing platform evidence. */
  readonly allowLegacyParentCertification?: boolean;
  /** Cleanup must validate canonical evidence without migrating or falling back. */
  readonly canonicalOnly?: boolean;
}

/** Derive the canonical record path without accepting path components as layer identities. */
export function dependencyLayerCertificationPath(dataDir: string, layerId: string): string {
  assertLayerId(layerId);
  return resolve(dataDir, DEPENDENCY_CERTIFICATIONS_DIRECTORY, `${layerId}.json`);
}

/** Keep the historical filename solely for compatibility reads and managed cleanup. */
export function legacyDependencyLayerCertificationPath(dataDir: string, layerId: string): string {
  assertLayerId(layerId);
  return resolve(dataDir, `dependency-layer-certification-${layerId}.json`);
}

/** Validate the dedicated directory before reading, creating, or deleting any contained record. */
export async function dependencyCertificationDirectory(dataDir: string, create = false): Promise<string | null> {
  const canonicalData = await realpath(dataDir);
  const directory = resolve(canonicalData, DEPENDENCY_CERTIFICATIONS_DIRECTORY);
  if (create) await mkdir(directory, { mode: 0o700 }).catch(error => {
    if (!hasCode(error, "EEXIST")) throw error;
  });
  const metadata = await lstat(directory).catch(missingOrThrow);
  if (metadata === null) return null;
  if (!metadata.isDirectory() || metadata.isSymbolicLink() || await realpath(directory) !== directory) {
    throw new Error("dependency certification directory is not a managed non-link directory");
  }
  return directory;
}

/** Resolve only direct regular managed records; callers never follow directory or record links. */
export async function managedDependencyCertificationPath(dataDir: string, layerId: string, legacy = false): Promise<string | null> {
  const canonicalData = await realpath(dataDir);
  const path = legacy ? legacyDependencyLayerCertificationPath(canonicalData, layerId) : dependencyLayerCertificationPath(canonicalData, layerId);
  if (!legacy && await dependencyCertificationDirectory(canonicalData) === null) return null;
  const metadata = await lstat(path).catch(missingOrThrow);
  if (metadata === null) return null;
  if (!metadata.isFile() || metadata.isSymbolicLink() || await realpath(path) !== path) {
    throw new Error(`dependency certification is not a managed regular file: ${path}`);
  }
  return path;
}

/** Prefer canonical evidence; copy validated legacy evidence without changing its sealed source. */
export async function readDependencyCertification(
  dataDir: string,
  identity: LayerIdentity,
  options: ReadDependencyCertificationOptions = {},
): Promise<void> {
  const canonical = await managedDependencyCertificationPath(dataDir, identity.layerId);
  const source = canonical ?? (options.canonicalOnly ? null : await managedDependencyCertificationPath(dataDir, identity.layerId, true));
  if (source === null) throw new Error(`dependency layer certification is absent: ${identity.layerId}`);
  const document: unknown = JSON.parse(await readFile(source, "utf8"));
  const legacyPlatform = validateCertification(document, identity, options.allowLegacyParentCertification === true);
  if (!legacyPlatform && ((await lstat(source)).mode & 0o222) !== 0) throw new Error("dependency certification is writable");
  if (legacyPlatform) {
    // Compatibility: only the authenticated parent path may replace older platform-less evidence.
    await writeDependencyCertification(dataDir, identity);
  } else if (canonical === null) {
    await publishCertification(dataDir, identity, document as Record<string, unknown>, false);
  }
}

/** Publish certification after materialization/full verification, preserving an already-valid winner. */
export async function writeDependencyCertification(dataDir: string, identity: LayerIdentity): Promise<void> {
  await publishCertification(dataDir, identity, {
    schema: PRODUCT_IDENTITY.evidence.dependencyLayerCertificationSchema,
    layerId: identity.layerId,
    contentDigest: identity.contentDigest,
    platform: process.platform,
    platformPolicy: immutablePlatformPolicy(),
    certifiedAt: new Date().toISOString(),
  }, true);
}

async function publishCertification(dataDir: string, identity: LayerIdentity, document: Record<string, unknown>, replaceInvalid: boolean): Promise<void> {
  const directory = (await dependencyCertificationDirectory(dataDir, true))!;
  const path = dependencyLayerCertificationPath(dirname(directory), identity.layerId);
  const lockPath = `${path}.lock`;
  const releaseLock = await acquirePublicationLock(lockPath);
  try {
    await publishLockedCertification(dataDir, identity, document, replaceInvalid, path);
  } finally {
    await releaseLock();
  }
}

async function publishLockedCertification(dataDir: string, identity: LayerIdentity, document: Record<string, unknown>, replaceInvalid: boolean, path: string): Promise<void> {
  const existing = await managedDependencyCertificationPath(dataDir, identity.layerId);
  if (existing !== null) {
    const source = await readFile(existing, "utf8");
    const metadata = await lstat(existing);
    try {
      validateCertification(JSON.parse(source), identity);
      // Invariant: full verification restores writable evidence; ordinary valid reuse is read-only.
      if ((metadata.mode & 0o222) === 0) return;
      if (!replaceInvalid) throw new Error("dependency certification is writable");
    } catch (error) {
      if (!replaceInvalid) throw error;
    }
    await rm(existing, { force: true });
  }
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(document, null, 2), { flag: "wx", mode: 0o400 });
    await chmod(temporary, 0o400);
    await dependencyCertificationDirectory(dataDir);
    // Concurrency: the per-layer lease protects the winner check and atomic publication together.
    // Rename publishes final read-only metadata; no later temporary unlink changes sealed evidence.
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function acquirePublicationLock(path: string): Promise<() => Promise<void>> {
  const token = randomUUID();
  const candidate = `${path}.candidate-${token}`;
  await mkdir(candidate, { mode: 0o700 });
  try {
    await writeFile(resolve(candidate, "owner.json"), JSON.stringify({ pid: process.pid, token }), { flag: "wx", mode: 0o600 });
    const deadline = Date.now() + 5_000;
    while (true) {
      try {
        // Concurrency: a nonempty directory cannot replace another nonempty directory on either
        // platform. Publishing the complete owner atomically also avoids partially written leases.
        await rename(candidate, path);
        return async () => {
          const released = `${path}.released-${token}`;
          await rename(path, released);
          await rm(released, { recursive: true, force: true });
        };
      } catch (error) {
        if (!["EEXIST", "ENOTEMPTY", "EPERM", "EACCES"].some(code => hasCode(error, code))) throw error;
        const metadata = await lstat(path).catch(missingOrThrow);
        if (metadata !== null) {
          if (!metadata.isDirectory() || metadata.isSymbolicLink()) throw new Error("dependency certification publication lock is not a managed directory");
          const ownerPath = resolve(path, "owner.json");
          const ownerMetadata = await lstat(ownerPath).catch(missingOrThrow);
          if (ownerMetadata !== null) {
            if (!ownerMetadata.isFile() || ownerMetadata.isSymbolicLink()) throw new Error("dependency certification publication owner is not a regular file");
            const owner = await readFile(ownerPath, "utf8").then(source => JSON.parse(source) as { pid: number; token: string }).catch(error => {
              if (hasCode(error, "ENOENT")) return null;
              throw error;
            });
            if (owner !== null && Number.isSafeInteger(owner.pid) && owner.pid > 0 && /^[a-f0-9-]{36}$/.test(owner.token)) {
              let abandoned = false;
              try { process.kill(owner.pid, 0); }
              catch (probeError) { abandoned = hasCode(probeError, "ESRCH"); }
              if (abandoned) {
                // Concurrency: retain this generation's nonempty tombstone. A delayed second reclaimer
                // cannot overwrite it and accidentally steal a newly acquired replacement lease.
                await rename(path, `${path}.abandoned-${owner.token}`).catch(error => {
                  if (!["ENOENT", "EEXIST", "ENOTEMPTY", "EPERM", "EACCES"].some(code => hasCode(error, code))) throw error;
                });
              }
            }
          }
        }
        if (Date.now() >= deadline) throw new Error("dependency certification publication is busy");
        await new Promise(resolvePromise => setTimeout(resolvePromise, 20));
      }
    }
  } finally {
    await rm(candidate, { recursive: true, force: true });
  }
}

function validateCertification(value: unknown, identity: LayerIdentity, allowLegacyPlatform = false): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`dependency layer certification differs from manifest: ${identity.layerId}`);
  const certification = value as Record<string, unknown>;
  const identityMatches = certification.schema === PRODUCT_IDENTITY.evidence.dependencyLayerCertificationSchema
    && certification.layerId === identity.layerId && certification.contentDigest === identity.contentDigest;
  const currentPlatform = certification.platform === process.platform && certification.platformPolicy === immutablePlatformPolicy();
  const legacyPlatform = allowLegacyPlatform && certification.platform === undefined && certification.platformPolicy === undefined;
  if (!identityMatches || (!currentPlatform && !legacyPlatform)) throw new Error(`dependency layer certification differs from manifest: ${identity.layerId}`);
  return legacyPlatform;
}

function assertLayerId(layerId: string): void {
  if (!/^dependencies-[a-f0-9]{32}$/.test(layerId)) throw new Error(`invalid dependency layer identity: ${layerId}`);
}

function hasCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

function missingOrThrow(error: unknown): null {
  if (hasCode(error, "ENOENT")) return null;
  throw error;
}
