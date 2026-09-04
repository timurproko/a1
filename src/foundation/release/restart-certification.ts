import { createHash } from "node:crypto";
import { lstat, readFile, realpath, stat } from "node:fs/promises";
import { basename, isAbsolute, relative, resolve, sep } from "node:path";
import { PRODUCT_IDENTITY } from "../../product-identity.js";
import { DEPENDENCY_LAYER_MANIFEST, dependencyLayerCertificationPath, type DependencyLayerReference } from "./dependency-layer.js";
import { immutablePlatformPolicy, type ImmutablePlatformPolicy } from "./immutable-platform.js";
import { PRODUCT_PACKAGE_NAME, type ReleaseFileIdentity } from "./release.js";
import { RELEASE_MANIFEST_FILENAME, type CertifiedReleaseRecord, type MaterializedRelease } from "./release-store.js";
import { UpdateTransactionStore } from "./update-transaction.js";

const RESTART_SEAL_VERSION = 1;
const REQUIRED_LAUNCH_ENTRIES = ["bin/supervisor.js", "bin/guardian.js"] as const;

type EvidenceKind = "directory" | "file" | "binding";

interface PathEvidence {
  readonly path: string;
  readonly kind: EvidenceKind;
  readonly device: string;
  readonly inode: string;
  readonly mode: number;
  readonly size: string;
  readonly modifiedNs: string;
  readonly changedNs: string;
  readonly bornNs: string;
}

interface LayerRestartEvidence extends DependencyLayerReference {
  readonly layerRoot: PathEvidence;
  readonly manifest: PathEvidence;
  readonly certification: PathEvidence;
  readonly bindingEvidence: PathEvidence;
  readonly bindingTarget: string;
}

interface RestartSealCore {
  readonly version: typeof RESTART_SEAL_VERSION;
  readonly platform: NodeJS.Platform;
  readonly platformPolicy: ImmutablePlatformPolicy;
  readonly releaseId: string;
  readonly packageVersion: string;
  readonly contentDigest: string;
  readonly packageRoot: string;
  readonly releaseRoot: PathEvidence;
  readonly manifest: PathEvidence;
  readonly launchEntries: readonly ReleaseFileIdentity[];
  readonly launchEntryEvidence: readonly PathEvidence[];
  readonly dependencyLayers: readonly LayerRestartEvidence[];
  readonly certifiedAt: string;
}

export interface RestartSeal extends RestartSealCore {
  readonly sealDigest: string;
}

interface ReleaseCertificationDocument {
  readonly schema: typeof PRODUCT_IDENTITY.evidence.releaseCertificationSchema;
  readonly releaseId: string;
  readonly contentDigest: string;
  readonly verifiedAt: string;
  readonly checks: readonly { readonly id: string; readonly passed: boolean }[];
  readonly restartSeal: RestartSeal | null;
}

export interface RestartValidationEvent {
  readonly operation: "restart-evidence-read";
  readonly path: string;
}

/** Build compact restart authority after complete content verification established read-only payload files. */
export async function createRestartSeal(release: MaterializedRelease, dataDir: string): Promise<RestartSeal | null> {
  const policy = immutablePlatformPolicy();
  if (policy === null) return null;
  const canonicalData = await realpath(dataDir);
  const releasesRoot = await realpath(resolve(canonicalData, "releases"));
  const releaseRoot = await realpath(release.releaseRoot);
  assertDirectChild(releasesRoot, releaseRoot, release.releaseId, "release");
  const manifestPath = resolve(releaseRoot, RELEASE_MANIFEST_FILENAME);
  const launchEntries = REQUIRED_LAUNCH_ENTRIES.map(path => release.files.find(candidate => candidate.path === path));
  if (launchEntries.some(file => file === undefined)) return null;
  const certifiedLaunchEntries = launchEntries as readonly ReleaseFileIdentity[];
  const layersRoot = release.dependencyLayers?.length ? await realpath(resolve(canonicalData, "dependency-layers")) : null;
  const dependencyLayers = await Promise.all((release.dependencyLayers ?? []).map(async reference => {
    if (layersRoot === null) throw new Error("restart certification has no dependency-layer root");
    const layerRoot = await realpath(resolve(layersRoot, reference.layerId));
    assertDirectChild(layersRoot, layerRoot, reference.layerId, "dependency layer");
    const bindingPath = resolve(releaseRoot, reference.binding);
    const bindingTarget = await realpath(bindingPath);
    const expectedTarget = await realpath(resolve(layerRoot, "node_modules"));
    if (bindingTarget !== expectedTarget) throw new Error(`restart certification dependency binding targets unexpected content: ${bindingPath}`);
    return {
      ...reference,
      layerRoot: await pathEvidence(layerRoot, "directory"),
      manifest: await pathEvidence(resolve(layerRoot, DEPENDENCY_LAYER_MANIFEST), "file"),
      certification: await pathEvidence(dependencyLayerCertificationPath(canonicalData, reference.layerId), "file"),
      bindingEvidence: await pathEvidence(bindingPath, "binding", true),
      bindingTarget,
    } satisfies LayerRestartEvidence;
  }));
  const core: RestartSealCore = {
    version: RESTART_SEAL_VERSION,
    platform: process.platform,
    platformPolicy: policy,
    releaseId: release.releaseId,
    packageVersion: release.packageVersion,
    contentDigest: release.contentDigest,
    packageRoot: release.packageRoot,
    releaseRoot: await pathEvidence(releaseRoot, "directory"),
    manifest: await pathEvidence(manifestPath, "file"),
    launchEntries: certifiedLaunchEntries,
    launchEntryEvidence: await Promise.all(certifiedLaunchEntries.map(file => pathEvidence(resolve(releaseRoot, file.path), "file"))),
    dependencyLayers,
    certifiedAt: new Date().toISOString(),
  };
  return { ...core, sealDigest: restartSealDigest(core) };
}

/** Recover an approved release from durable bounded evidence without traversing its payload. */
export async function readRestartCertifiedRelease(
  record: CertifiedReleaseRecord & { readonly diagnosticsPath?: string | null },
  dataDir: string,
  onEvent?: (event: RestartValidationEvent) => void,
): Promise<MaterializedRelease> {
  const transaction = await new UpdateTransactionStore(dataDir).read();
  if (transaction?.status === "active") throw new Error("restart certification is unavailable during an active update transaction");
  const certificationPath = resolve(dataDir, `certification-${record.releaseId}.json`);
  if (record.diagnosticsPath !== undefined && record.diagnosticsPath !== certificationPath) {
    throw new Error("restart certification path differs from the approved release record");
  }
  const certificationMetadata = await lstat(certificationPath);
  onEvent?.({ operation: "restart-evidence-read", path: certificationPath });
  if (!certificationMetadata.isFile() || certificationMetadata.isSymbolicLink() || (certificationMetadata.mode & 0o222) !== 0) {
    throw new Error("restart certification is not an immutable regular file");
  }
  const certification = await readJson<ReleaseCertificationDocument>(certificationPath, onEvent);
  if (certification.schema !== PRODUCT_IDENTITY.evidence.releaseCertificationSchema
    || certification.releaseId !== record.releaseId || certification.contentDigest !== record.contentDigest
    || !certification.checks.some(check => check.id === "immutable-content" && check.passed)) {
    throw new Error("restart certification differs from the approved release record");
  }
  const seal = normalizeRestartSeal(certification.restartSeal);
  if (seal.platform !== process.platform || seal.platformPolicy !== immutablePlatformPolicy()) {
    throw new Error("restart certification platform immutability evidence is unsupported");
  }
  if (seal.releaseId !== record.releaseId || seal.contentDigest !== record.contentDigest
    || resolve(seal.releaseRoot.path) !== resolve(record.releaseRoot)
    || (record.packageVersion !== undefined && seal.packageVersion !== record.packageVersion)) {
    throw new Error("restart seal differs from the approved release identity");
  }
  const { sealDigest, ...core } = seal;
  if (restartSealDigest(core) !== sealDigest) throw new Error("restart seal digest is invalid");

  const canonicalData = await observedRealpath(dataDir, onEvent);
  const releasesRoot = await observedRealpath(resolve(canonicalData, "releases"), onEvent);
  const releaseRoot = await observedRealpath(seal.releaseRoot.path, onEvent);
  assertDirectChild(releasesRoot, releaseRoot, seal.releaseId, "release");
  await assertPathEvidence(seal.releaseRoot, onEvent);
  await assertPathEvidence(seal.manifest, onEvent);
  for (let index = 0; index < seal.launchEntries.length; index += 1) {
    const file = seal.launchEntries[index]!;
    if (!REQUIRED_LAUNCH_ENTRIES.includes(file.path as typeof REQUIRED_LAUNCH_ENTRIES[number])) {
      throw new Error(`restart seal contains an unexpected launch entry: ${file.path}`);
    }
    const evidence = seal.launchEntryEvidence[index];
    if (!evidence || evidence.path !== resolve(releaseRoot, file.path) || file.bytes !== Number(evidence.size)) {
      throw new Error(`restart launch entry evidence differs: ${file.path}`);
    }
    await assertPathEvidence(evidence, onEvent);
  }
  if (seal.launchEntries.length !== REQUIRED_LAUNCH_ENTRIES.length) throw new Error("restart seal launch entries are incomplete");

  const layersRoot = seal.dependencyLayers.length ? await observedRealpath(resolve(canonicalData, "dependency-layers"), onEvent) : null;
  for (const layer of seal.dependencyLayers) {
    if (layersRoot === null) throw new Error("restart seal has no dependency-layer root");
    const layerRoot = await observedRealpath(layer.layerRoot.path, onEvent);
    assertDirectChild(layersRoot, layerRoot, layer.layerId, "dependency layer");
    await assertPathEvidence(layer.layerRoot, onEvent);
    await assertPathEvidence(layer.manifest, onEvent);
    await assertPathEvidence(layer.certification, onEvent);
    await assertPathEvidence(layer.bindingEvidence, onEvent, true);
    const bindingTarget = await observedRealpath(layer.bindingEvidence.path, onEvent);
    const expectedTarget = await observedRealpath(resolve(layerRoot, "node_modules"), onEvent);
    if (bindingTarget !== layer.bindingTarget || bindingTarget !== expectedTarget) {
      throw new Error(`restart dependency binding targets unexpected content: ${layer.bindingEvidence.path}`);
    }
  }

  return {
    packageName: PRODUCT_PACKAGE_NAME,
    packageVersion: seal.packageVersion,
    contentDigest: seal.contentDigest,
    releaseId: seal.releaseId,
    packageRoot: seal.packageRoot,
    files: seal.launchEntries,
    ...(seal.dependencyLayers.length === 0 ? {} : {
      dependencyLayers: seal.dependencyLayers.map(({ layerId, contentDigest, binding }) => ({ layerId, contentDigest, binding })),
    }),
    releaseRoot,
  };
}

export function releaseCertificationDocument(
  release: MaterializedRelease,
  restartSeal: RestartSeal | null,
  verifiedAt = new Date().toISOString(),
): ReleaseCertificationDocument {
  return {
    schema: PRODUCT_IDENTITY.evidence.releaseCertificationSchema,
    releaseId: release.releaseId,
    contentDigest: release.contentDigest,
    verifiedAt,
    checks: [{ id: "immutable-content", passed: true }],
    restartSeal,
  };
}

export function restartSealDigest(core: RestartSealCore): string {
  return createHash("sha256").update(JSON.stringify(core)).digest("hex");
}

async function assertPathEvidence(evidence: PathEvidence, onEvent?: (event: RestartValidationEvent) => void, symbolic = false): Promise<void> {
  const actual = await pathEvidence(evidence.path, evidence.kind, symbolic, onEvent);
  if (JSON.stringify(actual) !== JSON.stringify(evidence)) throw new Error(`restart path evidence changed: ${evidence.path}`);
}

async function pathEvidence(
  path: string,
  kind: EvidenceKind,
  symbolic = false,
  onEvent?: (event: RestartValidationEvent) => void,
): Promise<PathEvidence> {
  onEvent?.({ operation: "restart-evidence-read", path });
  const metadata = symbolic ? await lstat(path, { bigint: true }) : await stat(path, { bigint: true });
  if ((kind === "directory") !== metadata.isDirectory()) throw new Error(`restart evidence kind changed: ${path}`);
  if (kind === "file" && !metadata.isFile()) throw new Error(`restart evidence file changed: ${path}`);
  if (kind === "binding" && !metadata.isSymbolicLink()) throw new Error(`restart evidence binding changed: ${path}`);
  if (kind === "file" && (metadata.mode & 0o222n) !== 0n) throw new Error(`restart evidence file is writable: ${path}`);
  return {
    path: resolve(path),
    kind,
    device: metadata.dev.toString(),
    inode: metadata.ino.toString(),
    mode: Number(metadata.mode),
    size: metadata.size.toString(),
    modifiedNs: metadata.mtimeNs.toString(),
    changedNs: metadata.ctimeNs.toString(),
    bornNs: metadata.birthtimeNs.toString(),
  };
}

function normalizeRestartSeal(value: unknown): RestartSeal {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("release certification has no durable restart seal");
  const seal = value as RestartSeal;
  if (seal.version !== RESTART_SEAL_VERSION || typeof seal.platform !== "string" || typeof seal.platformPolicy !== "string"
    || typeof seal.releaseId !== "string" || typeof seal.packageVersion !== "string" || typeof seal.contentDigest !== "string"
    || typeof seal.packageRoot !== "string" || typeof seal.certifiedAt !== "string" || typeof seal.sealDigest !== "string"
    || !seal.releaseRoot || !seal.manifest || !Array.isArray(seal.launchEntries) || !Array.isArray(seal.launchEntryEvidence)
    || !Array.isArray(seal.dependencyLayers)) {
    throw new Error("durable restart seal is invalid");
  }
  return seal;
}

async function readJson<T>(path: string, onEvent?: (event: RestartValidationEvent) => void): Promise<T> {
  onEvent?.({ operation: "restart-evidence-read", path });
  return JSON.parse(await readFile(path, "utf8")) as T;
}

async function observedRealpath(path: string, onEvent?: (event: RestartValidationEvent) => void): Promise<string> {
  onEvent?.({ operation: "restart-evidence-read", path });
  return await realpath(path);
}

function assertDirectChild(parent: string, child: string, expectedName: string, kind: string): void {
  const fromParent = relative(parent, child);
  if (isAbsolute(fromParent) || fromParent === ".." || fromParent.startsWith(`..${sep}`) || fromParent.includes(sep)
    || basename(child) !== expectedName) {
    throw new Error(`restart ${kind} is outside its managed store: ${child}`);
  }
}
