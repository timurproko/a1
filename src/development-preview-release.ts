import { compare, inc, prerelease, valid } from "semver";

export interface DevelopmentPreviewCandidate {
  readonly version: string;
  readonly requiresVersionCommit: boolean;
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

export function developmentPreviewTarballName(packageName: string, version: string): string {
  if (valid(version) === null) throw new Error(`invalid development preview version: ${version}`);
  const unscopedName = packageName.startsWith("@") ? packageName.slice(1).replace("/", "-") : packageName;
  if (!/^[a-z0-9._-]+$/i.test(unscopedName)) throw new Error(`invalid package name: ${packageName}`);
  return `${unscopedName}-${version}.tgz`;
}
