import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { PRODUCT_IDENTITY } from "../../product-identity.js";
import { dependencyLayerCertificationPath } from "./dependency-certification.js";
import { RELEASE_MANIFEST_FILENAME } from "./release-store.js";
import { readRestartCertifiedRelease, type RestartSeal } from "./restart-certification.js";

export interface DependencyCertificationProtection {
  readonly referenced: Set<string>;
  readonly legacyRequired: Set<string>;
  readonly uncertain: boolean;
}

/** Inspect retained and not-yet-collected release metadata, never dependency payload bytes. */
export async function dependencyCertificationProtection(dataDir: string, retainedReleaseIds: readonly string[] = []): Promise<DependencyCertificationProtection> {
  const referenced = new Set<string>();
  const legacyRequired = new Set<string>();
  const canonicalData = await realpath(dataDir);
  const releasesRoot = resolve(canonicalData, "releases");
  const roots: string[] = [];
  let uncertain = false;
  const rootMetadata = await lstat(releasesRoot);
  if (!rootMetadata.isDirectory() || rootMetadata.isSymbolicLink()) return { referenced, legacyRequired, uncertain: true };
  const entries = await readdir(releasesRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) { uncertain = true; continue; }
    if (!entry.isDirectory() || entry.name.startsWith(".candidate-")) continue;
    if (entry.name === ".trash") {
      for (const trash of await readdir(resolve(releasesRoot, entry.name), { withFileTypes: true })) {
        if (trash.isSymbolicLink()) uncertain = true;
        else if (trash.isDirectory() && !trash.name.startsWith(".candidate")) roots.push(resolve(releasesRoot, entry.name, trash.name));
      }
    } else roots.push(resolve(releasesRoot, entry.name));
  }
  const discoveredIds = new Set(roots.map(root => basename(root).split("--", 1)[0]!));
  if (retainedReleaseIds.some(id => !discoveredIds.has(id))) uncertain = true;
  for (const root of roots) {
    try {
      const manifestPath = resolve(root, RELEASE_MANIFEST_FILENAME);
      const metadata = await lstat(manifestPath);
      if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error("release manifest is not a regular file");
      const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
        releaseId: string; contentDigest: string; dependencyLayers?: Array<{ layerId: string; contentDigest: string }>;
      };
      if (!manifest || !/^[0-9A-Za-z.+_-]+-[a-f0-9]{20}$/.test(manifest.releaseId)
        || (manifest.dependencyLayers !== undefined && !Array.isArray(manifest.dependencyLayers))) throw new Error("invalid retained release manifest");
      const seal = await canonicalConsumerSeal(canonicalData, manifest.releaseId, manifest.contentDigest);
      for (const layer of manifest.dependencyLayers ?? []) {
        if (!layer || !/^dependencies-[a-f0-9]{32}$/.test(layer.layerId)) throw new Error("invalid retained dependency reference");
        referenced.add(layer.layerId);
        const evidence = seal?.dependencyLayers.filter(item => item.layerId === layer.layerId);
        if (evidence?.length !== 1 || evidence[0]!.contentDigest !== layer.contentDigest
          || evidence[0]!.certification?.path !== dependencyLayerCertificationPath(canonicalData, layer.layerId)) {
          // Compatibility: an absent, legacy, or uncertain seal cannot prove canonical-only use.
          legacyRequired.add(layer.layerId);
        }
      }
    } catch {
      // Security: an unreadable retained manifest might reference any layer; do not guess ownership.
      uncertain = true;
    }
  }
  return { referenced, legacyRequired, uncertain };
}

async function canonicalConsumerSeal(dataDir: string, releaseId: string, contentDigest: string): Promise<RestartSeal | null> {
  try {
    const path = resolve(dataDir, `certification-${releaseId}.json`);
    const metadata = await lstat(path);
    if (!metadata.isFile() || metadata.isSymbolicLink() || (metadata.mode & 0o222) !== 0) return null;
    const document = JSON.parse(await readFile(path, "utf8")) as {
      schema: string; releaseId: string; contentDigest: string; restartSeal: RestartSeal;
    };
    if (document.schema !== PRODUCT_IDENTITY.evidence.releaseCertificationSchema || document.releaseId !== releaseId
      || document.contentDigest !== contentDigest || !document.restartSeal) return null;
    // Security: path claims alone do not prove a canonical-only consumer. Reuse the bounded
    // restart validator so stale, unsupported, or tampered seals conservatively retain legacy files.
    await readRestartCertifiedRelease({ releaseId, contentDigest, releaseRoot: resolve(dataDir, "releases", releaseId) }, dataDir);
    return document.restartSeal;
  } catch {
    return null;
  }
}
