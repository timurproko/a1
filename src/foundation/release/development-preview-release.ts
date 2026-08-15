import { compare, inc, prerelease, valid } from "semver";

export interface DevelopmentPreviewCandidate {
  readonly version: string;
  readonly requiresVersionCommit: boolean;
}

export interface DevelopmentPreviewRegistryState {
  readonly published: boolean;
  readonly nextVersion: string | null;
}

export interface DevelopmentPreviewVerificationOptions {
  readonly attempts?: number;
  readonly delayMs?: number;
  readonly delay?: (milliseconds: number) => Promise<void>;
}

export interface DevelopmentPreviewPublishResult {
  readonly published: boolean;
  readonly recoveredPublishError: unknown | null;
}

export interface UncertifiedDevelopmentPreviewEvidenceInput {
  readonly packageName: string;
  readonly version: string;
  readonly commit: string;
  readonly tarball: string;
  readonly integrity: string;
  readonly shasum: string;
  readonly platform: NodeJS.Platform;
  readonly architecture: string;
  readonly recordedAt: string;
}

export interface UncertifiedDevelopmentPreviewEvidence extends UncertifiedDevelopmentPreviewEvidenceInput {
  readonly schema: "addone-development-preview-certification-v2";
  readonly channel: "next";
  readonly certificationStatus: "uncertified-development-preview";
  readonly terminalCapability: "owned-ui";
  readonly manualAcceptance: "accepted";
  readonly physicalHostCertification: "deferred";
  readonly crossPlatformCertification: "deferred";
  readonly stableReleaseEligible: false;
}

export function createUncertifiedDevelopmentPreviewEvidence(
  input: UncertifiedDevelopmentPreviewEvidenceInput,
): UncertifiedDevelopmentPreviewEvidence {
  const prereleaseParts = prerelease(input.version);
  if (valid(input.version) === null || prereleaseParts?.[0] !== "dev") {
    throw new Error(`uncertified preview requires a development prerelease: ${input.version}`);
  }
  return {
    schema: "addone-development-preview-certification-v2",
    channel: "next",
    certificationStatus: "uncertified-development-preview",
    terminalCapability: "owned-ui",
    manualAcceptance: "accepted",
    physicalHostCertification: "deferred",
    crossPlatformCertification: "deferred",
    stableReleaseEligible: false,
    ...input,
  };
}

export function requireManuallyAcceptedDevelopmentPreview(version: string, acceptedVersion: string): void {
  const acceptedPrerelease = prerelease(acceptedVersion);
  if (valid(acceptedVersion) === null || acceptedPrerelease?.[0] !== "dev") {
    throw new Error(`invalid manually accepted development preview: ${acceptedVersion}`);
  }
  if (version !== acceptedVersion) {
    throw new Error(`development preview ${version} has no exact manual acceptance; accepted version is ${acceptedVersion}`);
  }
}

export function selectDevelopmentPreviewCandidate(
  currentVersion: string,
  publishedVersions: readonly string[],
): DevelopmentPreviewCandidate {
  if (valid(currentVersion) === null) throw new Error(`invalid current package version: ${currentVersion}`);
  const published = publishedVersions.map(version => {
    if (valid(version) === null) throw new Error(`invalid published package version: ${version}`);
    return version;
  });
  const publishedSet = new Set(published);
  const highestPublished = published.reduce<string | null>(
    (highest, version) => highest === null || compare(version, highest) > 0 ? version : highest,
    null,
  );
  const currentPrerelease = prerelease(currentVersion);
  const currentIsUnpublishedLeadingDev = currentPrerelease?.[0] === "dev"
    && !publishedSet.has(currentVersion)
    && (highestPublished === null || compare(currentVersion, highestPublished) > 0);
  if (currentIsUnpublishedLeadingDev) return { version: currentVersion, requiresVersionCommit: false };

  const base = highestPublished === null || compare(currentVersion, highestPublished) > 0
    ? currentVersion
    : highestPublished;
  const basePrerelease = prerelease(base);
  let candidate = basePrerelease?.[0] === "dev"
    ? inc(base, "prerelease", "dev")
    : inc(base, "prepatch", "dev");
  if (candidate === null) throw new Error(`could not increment development preview from ${base}`);
  while (publishedSet.has(candidate)) {
    candidate = inc(candidate, "prerelease", "dev");
    if (candidate === null) throw new Error(`could not increment development preview from ${base}`);
  }
  return { version: candidate, requiresVersionCommit: candidate !== currentVersion };
}

/**
 * Treats npm's process result as provisional: browser-auth completion can fail
 * after the immutable upload succeeds. Registry identity remains authoritative.
 */
export async function publishDevelopmentPreviewWithRecovery(
  publish: () => Promise<void>,
  verify: () => Promise<void>,
): Promise<DevelopmentPreviewPublishResult> {
  let publishError: unknown | null = null;
  try { await publish(); }
  catch (error) { publishError = error; }
  try {
    await verify();
    return { published: true, recoveredPublishError: publishError };
  } catch (verificationError) {
    if (publishError !== null) throw new AggregateError([publishError, verificationError], "npm publish failed and the exact version could not be verified in the registry");
    throw verificationError;
  }
}

export async function verifyDevelopmentPreviewRegistry(
  version: string,
  observe: () => Promise<DevelopmentPreviewRegistryState>,
  repairNextTag: () => Promise<void>,
  options: DevelopmentPreviewVerificationOptions = {},
): Promise<void> {
  const attempts = options.attempts ?? 12;
  const delayMs = options.delayMs ?? 2_000;
  const delay = options.delay ?? (async milliseconds => await new Promise(resolvePromise => setTimeout(resolvePromise, milliseconds)));
  if (!Number.isInteger(attempts) || attempts < 1) throw new Error(`invalid registry verification attempts: ${attempts}`);
  let repaired = false;
  let last: DevelopmentPreviewRegistryState = { published: false, nextVersion: null };
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    last = await observe();
    if (last.published && last.nextVersion === version) return;
    if (last.published && !repaired) {
      await repairNextTag();
      repaired = true;
    }
    if (attempt < attempts) await delay(delayMs);
  }
  if (!last.published) throw new Error(`npm registry did not expose published version ${version} after ${attempts} attempts`);
  throw new Error(`npm next resolved ${last.nextVersion ?? "nothing"}; expected ${version} after ${attempts} attempts`);
}

export function developmentPreviewTarballName(packageName: string, version: string): string {
  if (valid(version) === null) throw new Error(`invalid development preview version: ${version}`);
  const unscopedName = packageName.startsWith("@") ? packageName.slice(1).replace("/", "-") : packageName;
  if (!/^[a-z0-9._-]+$/i.test(unscopedName)) throw new Error(`invalid package name: ${packageName}`);
  return `${unscopedName}-${version}.tgz`;
}
