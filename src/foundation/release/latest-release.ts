import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { gt, prerelease, valid as validSemver } from "semver";
import lockfile from "proper-lockfile";
import { PRODUCT_IDENTITY, PRODUCT_TEXT } from "../../product-identity.js";

/** Published release channels: stable `X.Y.Z` on dist-tag `latest`, development `X.Y.Z-dev.N` on `next`. */
export type ReleaseChannel = "stable" | "development";
export type StartupUpdateMode = "auto" | "notify" | "no";

export interface DistTagVersions {
  readonly release: string | null;
  readonly develop: string | null;
  readonly error: string | null;
}

export type RegistryFetcher = (url: string) => Promise<{ readonly ok: boolean; readonly status: number; text(): Promise<string> }>;

export interface AvailableRelease {
  readonly channel: ReleaseChannel;
  readonly version: string;
  /** The command that installs it: `a1 update` or `a1 update --develop`. */
  readonly command: string;
  /** The GitHub Release page; development releases have none. */
  readonly changelogUrl: string | null;
}

export const DEFAULT_NPM_REGISTRY = "https://registry.npmjs.org";
export const UPDATE_CHECK_INTERVAL_MS = 15 * 60_000;
export const NOTIFY_CHECK_INTERVAL_MS = 24 * 60 * 60_000;
const STARTUP_FETCH_TIMEOUT_MS = 3_000;
const CACHE_FILENAME = "update-check.json";
const CACHE_VERSION = 2;
const MAX_CACHE_BYTES = 4096;
const MAX_PACKAGE_DOCUMENT_BYTES = 32 * 1024 * 1024;

/** One published version with the pull request its manifest records, when it records one. */
export interface PublishedVersion {
  readonly version: string;
  readonly pullRequest: number | null;
}

export interface PublishedVersions {
  readonly versions: readonly PublishedVersion[];
  readonly error: string | null;
}
const DEVELOPMENT_BUILD = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)-dev\.(0|[1-9]\d*)$/u;
const RELEASE_PAGE = "https://github.com/timurproko/a1/releases/tag/v";

/**
 * The channel a running version updates on, or null for a version that was never published:
 * a bare `X.Y.Z-dev` only comes from a source checkout, which has nothing to update to.
 */
export function releaseChannelOf(version: string): ReleaseChannel | null {
  if (validSemver(version) !== version) return null;
  if (prerelease(version) === null) return "stable";
  return DEVELOPMENT_BUILD.test(version) ? "development" : null;
}

/** True only when both versions are valid semver and the candidate sorts strictly above the current one. */
export function isNewerRelease(candidate: string, current: string): boolean {
  const left = validSemver(candidate);
  const right = validSemver(current);
  return left !== null && right !== null && gt(left, right);
}

export function distTagsUrl(registry: string = DEFAULT_NPM_REGISTRY): string {
  return `${registry.replace(/\/+$/u, "")}/-/package/${encodeURIComponent(PRODUCT_TEXT.packageName)}/dist-tags`;
}

/** Read `latest` (required) and `next` (optional) from a dist-tags object. */
export function parseDistTags(metadata: unknown, source: string): DistTagVersions {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
    return unavailableDistTags(`${source} returned a non-object dist-tags value`);
  }
  try {
    const tags = metadata as Record<string, unknown>;
    const release = parseVersion(tags.latest, `${source} latest`);
    const develop = tags.next === undefined ? null : parseVersion(tags.next, `${source} development channel`);
    return { release, develop, error: null };
  } catch (error) {
    return unavailableDistTags(errorMessage(error));
  }
}

export async function queryRegistryDistTags(fetcher: RegistryFetcher, registry?: string): Promise<DistTagVersions> {
  try {
    const response = await fetcher(distTagsUrl(registry));
    if (!response.ok) return unavailableDistTags(`registry responded with status ${response.status}`);
    return parseDistTags(JSON.parse(await response.text()), "registry");
  } catch (error) {
    return unavailableDistTags(errorMessage(error));
  }
}

export function packageDocumentUrl(registry: string = DEFAULT_NPM_REGISTRY): string {
  return `${registry.replace(/\/+$/u, "")}/${encodeURIComponent(PRODUCT_TEXT.packageName)}`;
}

/** The pull request a published or installed manifest records under `publication.pullRequest`, when valid. */
export function recordedPullRequest(manifest: unknown): number | null {
  if (typeof manifest !== "object" || manifest === null) return null;
  const publication = (manifest as { publication?: unknown }).publication;
  if (typeof publication !== "object" || publication === null) return null;
  const value = (publication as { pullRequest?: unknown }).pullRequest;
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

/**
 * Every published version with its recorded pull request, read from the registry's full package
 * document: its per-version manifests keep the publication metadata that version lists and the
 * abbreviated install document leave out.
 */
export async function queryPublishedVersions(fetcher: RegistryFetcher, registry?: string): Promise<PublishedVersions> {
  try {
    const response = await fetcher(packageDocumentUrl(registry));
    if (!response.ok) return { versions: [], error: `registry responded with status ${response.status}` };
    const text = await response.text();
    if (text.length > MAX_PACKAGE_DOCUMENT_BYTES) return { versions: [], error: "registry package document is oversized" };
    return parsePublishedVersions(JSON.parse(text));
  } catch (error) {
    return { versions: [], error: errorMessage(error) };
  }
}

export function parsePublishedVersions(document: unknown): PublishedVersions {
  if (typeof document !== "object" || document === null || Array.isArray(document)) {
    return { versions: [], error: "registry returned a non-object package document" };
  }
  const manifests = (document as { versions?: unknown }).versions;
  if (typeof manifests !== "object" || manifests === null || Array.isArray(manifests)) {
    return { versions: [], error: "registry package document lists no versions" };
  }
  const versions = Object.entries(manifests as Record<string, unknown>)
    .filter(([version]) => validSemver(version) === version)
    .map(([version, manifest]) => ({ version, pullRequest: recordedPullRequest(manifest) }));
  return { versions, error: null };
}

/** Forget the startup release check so the next interactive launch asks the registry again. */
export async function invalidateReleaseCheckCache(configDir: string): Promise<void> {
  await withCacheLock(configDir, async () => { await rm(join(configDir, CACHE_FILENAME), { force: true }); });
}

export function unavailableDistTags(error: string): DistTagVersions {
  return { release: null, develop: null, error };
}

export function createRegistryFetcher(timeoutMs: number, signal?: AbortSignal): RegistryFetcher {
  return async url => await fetch(url, { headers: { accept: "application/json" },
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs) });
}

export interface StartupReleaseCheckOptions {
  readonly runningVersion: string;
  readonly configDir: string;
  readonly environment?: NodeJS.ProcessEnv;
  /** Whether standard output is an interactive terminal. */
  readonly interactive: boolean;
  /** The bare-A1 `updateCheck` setting; comparison profiles omit it and use auto. */
  readonly settingMode?: StartupUpdateMode;
  readonly fetcher?: RegistryFetcher;
  readonly signal?: AbortSignal;
  /** Remaining cache lifetime for a live Auto observer, when discovery succeeds. */
  readonly onNextCheckDelay?: (milliseconds: number) => void;
  readonly now?: () => number;
}

/** Why the startup check is skipped before any cache read or network access, or null when it may run. */
export function startupReleaseCheckSkipReason(options: StartupReleaseCheckOptions): string | null {
  const environment = options.environment ?? process.env;
  if (truthy(environment.PI_OFFLINE)) return "offline";
  if (truthy(environment[PRODUCT_IDENTITY.environment.skipVersionCheck])) return "disabled-by-environment";
  if (truthy(environment.CI)) return "ci";
  if (!options.interactive) return "not-interactive";
  if (options.settingMode === "no") return "disabled-by-setting";
  if (releaseChannelOf(options.runningVersion) === null) return "unpublished-version";
  return null;
}

/**
 * Resolve whether a newer release exists on the running version's channel. A fresh cache for the
 * same channel answers without network access; otherwise the registry is queried and a successful
 * answer replaces the cache. Every failure resolves to null: the notice is best-effort.
 */
export async function checkForNewerRelease(options: StartupReleaseCheckOptions): Promise<AvailableRelease | null> {
  if (options.signal?.aborted || startupReleaseCheckSkipReason(options) !== null) return null;
  const channel = releaseChannelOf(options.runningVersion)!;
  const environment = options.environment ?? process.env;
  const now = options.now ?? Date.now;
  const cachePath = join(options.configDir, CACHE_FILENAME);
  try {
    const interval = options.settingMode === "notify" ? NOTIFY_CHECK_INTERVAL_MS : UPDATE_CHECK_INTERVAL_MS;
    const latest = await withCacheLock(options.configDir, async () => {
      if (options.signal?.aborted) return null;
      const document = await readCache(cachePath);
      const cached = freshVersion(document[channel], now(), interval);
      if (cached !== null) return cached;
      const tags = await queryRegistryDistTags(
        options.fetcher ?? createRegistryFetcher(STARTUP_FETCH_TIMEOUT_MS, options.signal),
        environment.npm_config_registry?.trim() || undefined,
      );
      const discovered = channel === "stable" ? tags.release : tags.develop;
      if (tags.error !== null || discovered === null || options.signal?.aborted) return null;
      const entry = { latest: discovered, checkedAt: now() };
      await writeCache(options.configDir, cachePath, { ...document, [channel]: entry }).catch(() => undefined);
      return entry;
    });
    if (options.signal?.aborted || latest === null) return null;
    options.onNextCheckDelay?.(Math.min(interval, Math.max(1, interval - (now() - latest.checkedAt))));
    return isNewerRelease(latest.latest, options.runningVersion) ? availableRelease(channel, latest.latest) : null;
  } catch {
    return null;
  }
}

export function availableRelease(channel: ReleaseChannel, version: string): AvailableRelease {
  return {
    channel,
    version,
    command: channel === "stable" ? `${PRODUCT_TEXT.commandName} update` : `${PRODUCT_TEXT.commandName} update --develop`,
    changelogUrl: channel === "stable" ? `${RELEASE_PAGE}${version}` : null,
  };
}

interface CacheEntry { readonly latest: string; readonly checkedAt: number }
interface CacheDocument {
  readonly version: typeof CACHE_VERSION;
  readonly stable?: CacheEntry;
  readonly development?: CacheEntry;
}

function validEntry(value: unknown, channel: ReleaseChannel): CacheEntry | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const entry = value as Partial<CacheEntry>;
  return typeof entry.latest === "string" && releaseChannelOf(entry.latest) === channel
    && typeof entry.checkedAt === "number" && Number.isFinite(entry.checkedAt) ? { latest: entry.latest, checkedAt: entry.checkedAt } : undefined;
}

async function readCache(path: string): Promise<CacheDocument> {
  try {
    const source = await readFile(path, "utf8");
    if (Buffer.byteLength(source, "utf8") > MAX_CACHE_BYTES) return { version: CACHE_VERSION };
    const value: unknown = JSON.parse(source);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return { version: CACHE_VERSION };
    const cache = value as Record<string, unknown>;
    if (cache.version === 1) {
      // Compatibility: an old cache has exactly one channel; do not infer a value for the other.
      if (cache.channel !== "stable" && cache.channel !== "development") return { version: CACHE_VERSION };
      const entry = validEntry(cache, cache.channel);
      return entry ? { version: CACHE_VERSION, [cache.channel]: entry } : { version: CACHE_VERSION };
    }
    if (cache.version !== CACHE_VERSION) return { version: CACHE_VERSION };
    const stable = validEntry(cache.stable, "stable");
    const development = validEntry(cache.development, "development");
    return { version: CACHE_VERSION, ...(stable ? { stable } : {}), ...(development ? { development } : {}) };
  } catch { return { version: CACHE_VERSION }; }
}

function freshVersion(entry: CacheEntry | undefined, now: number, interval: number): CacheEntry | null {
  if (!entry) return null;
  // Invariant: a timestamp from the future is stale rather than fresh forever.
  const age = now - entry.checkedAt;
  return age >= 0 && age < interval ? entry : null;
}

async function withCacheLock<T>(directory: string, operation: () => Promise<T>): Promise<T> {
  await mkdir(directory, { recursive: true });
  const release = await lockfile.lock(join(directory, CACHE_FILENAME), {
    realpath: false, stale: 30_000, update: 10_000,
    retries: { retries: 20, factor: 1.2, minTimeout: 20, maxTimeout: 100, randomize: true },
  });
  try { return await operation(); } finally { await release(); }
}

async function writeCache(directory: string, path: string, document: CacheDocument): Promise<void> {
  await mkdir(directory, { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(document)}\n`, { encoding: "utf8", mode: 0o600 });
    await rename(temporary, path);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

function truthy(value: string | undefined): boolean {
  if (value === undefined) return false;
  const normalized = value.trim().toLowerCase();
  return normalized !== "" && normalized !== "0" && normalized !== "false";
}

function parseVersion(value: unknown, source: string): string {
  const parsed = typeof value === "string" ? validSemver(value) : null;
  if (!parsed) throw new Error(`${source} did not provide a valid semantic version`);
  return parsed;
}

function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
