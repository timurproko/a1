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

/** Selects a monotonic, unpublished dev prerelease without moving npm next backward. */
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

/** Tolerates npm registry propagation after a successful immutable upload. */
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
