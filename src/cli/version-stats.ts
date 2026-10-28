import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import crossSpawn from "cross-spawn";
import { prerelease, valid as validSemver } from "semver";
import { PRODUCT_TEXT } from "../product-identity.js";

interface VersionProcessResult { readonly code: number | null; readonly stdout: string }
type VersionProcessRunner = (command: string, arguments_: readonly string[]) => Promise<VersionProcessResult>;
type RegistryFetcher = (url: string) => Promise<{ readonly ok: boolean; readonly status: number; text(): Promise<string> }>;
interface VersionOutput { stdout(message: string): void; stderr(message: string): void }
interface RemoteVersions { readonly release: string | null; readonly develop: string | null; readonly error: string | null }

export interface VersionStatsOptions {
  readonly packageRoot: string;
  readonly output?: VersionOutput;
  readonly runner?: VersionProcessRunner;
  readonly fetcher?: RegistryFetcher;
}

const defaultOutput: VersionOutput = {
  stdout(message) { process.stdout.write(message); },
  stderr(message) { process.stderr.write(message); },
};

export async function runVersionStats(options: VersionStatsOptions): Promise<number> {
  const output = options.output ?? defaultOutput;
  const runner = options.runner ?? createVersionProcessRunner();
  let installed: string;
  let installedPullRequest: number | null;
  try {
    const manifest = JSON.parse(await readFile(resolve(options.packageRoot, "package.json"), "utf8")) as { version?: unknown };
    installed = parseVersion(manifest.version, "installed package");
    installedPullRequest = recordedPullRequest(manifest);
  } catch (error) {
    output.stderr(`${PRODUCT_TEXT.diagnostic(`could not read its installed version: ${message(error)}`)}\n`);
    return 1;
  }

  // Rationale: unlike Pi, stable builds also show the release channel head so users can see they are
  // behind without starting a session. Only development builds show the preview channel, and only
  // they carry the pull request a preview's manifest records; a missing record is silently omitted.
  const remote = await queryDistTags(runner, options.fetcher ?? defaultRegistryFetcher);
  const developmentBuild = prerelease(installed) !== null;
  const headPullRequest = developmentBuild && remote.develop !== null ? await queryRecordedPullRequest(runner, remote.develop) : null;
  const develop = developmentBuild
    ? `Develop: ${remote.develop === null ? "unavailable" : withPullRequest(remote.develop, headPullRequest)}\n`
    : "";
  output.stdout(`Current: ${withPullRequest(installed, developmentBuild ? installedPullRequest : null)}\n${develop}Release: ${remote.release ?? "unavailable"}\n`);
  if (remote.error) output.stderr(`${PRODUCT_TEXT.diagnostic(`could not resolve npm dist-tags: ${remote.error}`)}\n`);
  return 0;
}

// Rationale: npm view respects the user's .npmrc registry and proxy, so it stays primary; the direct
// registry fetch below covers npm CLI versions whose --json output shape we cannot parse.
async function queryDistTags(runner: VersionProcessRunner, fetcher: RegistryFetcher): Promise<RemoteVersions> {
  const fromNpm = await queryDistTagsViaNpm(runner);
  if (fromNpm.error === null) return fromNpm;
  const fromRegistry = await queryDistTagsViaRegistry(fetcher);
  if (fromRegistry.error === null) return fromRegistry;
  return unavailable(`${fromNpm.error}; registry fallback failed: ${fromRegistry.error}`);
}

async function queryDistTagsViaNpm(runner: VersionProcessRunner): Promise<RemoteVersions> {
  let result: VersionProcessResult;
  try {
    result = await runner("npm", ["view", PRODUCT_TEXT.packageName, "dist-tags", "--json"]);
  } catch (error) {
    return unavailable(message(error));
  }
  if (result.code !== 0) return unavailable(`npm exited with status ${result.code ?? "unknown"}`);

  try {
    const parsed: unknown = JSON.parse(result.stdout);
    // Compatibility: npm 12 wraps `npm view <pkg> dist-tags --json` output in a one-element array; older npm returns the bare object.
    const metadata: unknown = Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : parsed;
    return parseDistTags(metadata, "npm");
  } catch (error) {
    return unavailable(message(error));
  }
}

async function queryDistTagsViaRegistry(fetcher: RegistryFetcher): Promise<RemoteVersions> {
  try {
    const response = await fetcher(`https://registry.npmjs.org/-/package/${encodeURIComponent(PRODUCT_TEXT.packageName)}/dist-tags`);
    if (!response.ok) return unavailable(`registry responded with status ${response.status}`);
    return parseDistTags(JSON.parse(await response.text()), "registry");
  } catch (error) {
    return unavailable(message(error));
  }
}

function parseDistTags(metadata: unknown, source: "npm" | "registry"): RemoteVersions {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
    return unavailable(`${source} returned a non-object dist-tags value`);
  }
  try {
    const tags = metadata as Record<string, unknown>;
    const release = parseVersion(tags.latest, `${source} latest`);
    const develop = tags.next === undefined ? null : parseVersion(tags.next, `${source} development channel`);
    return { release, develop, error: null };
  } catch (error) {
    return unavailable(message(error));
  }
}

function unavailable(error: string): RemoteVersions {
  return { release: null, develop: null, error };
}

function withPullRequest(version: string, pullRequest: number | null): string {
  return pullRequest === null ? version : `${version} (#${pullRequest})`;
}

/** The pull request a manifest records under `publication.pullRequest`, when it is a positive integer. */
function recordedPullRequest(manifest: unknown): number | null {
  if (typeof manifest !== "object" || manifest === null) return null;
  const publication = (manifest as { publication?: unknown }).publication;
  if (typeof publication !== "object" || publication === null) return null;
  const value = (publication as { pullRequest?: unknown }).pullRequest;
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

/** The pull request the published head records, read through npm; any failure means no record. */
async function queryRecordedPullRequest(runner: VersionProcessRunner, version: string): Promise<number | null> {
  try {
    const result = await runner("npm", ["view", `${PRODUCT_TEXT.packageName}@${version}`, "publication.pullRequest", "--json"]);
    if (result.code !== 0 || result.stdout.trim().length === 0) return null;
    const parsed: unknown = JSON.parse(result.stdout);
    // Compatibility: npm 12 wraps single-field `npm view --json` output in a one-element array.
    const value: unknown = Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : parsed;
    return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

const defaultRegistryFetcher: RegistryFetcher = async url =>
  await fetch(url, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10_000) });

function createVersionProcessRunner(): VersionProcessRunner {
  return async (command, arguments_) => await new Promise((resolvePromise, rejectPromise) => {
    const child = process.platform === "win32"
      ? crossSpawn(command, [...arguments_], { stdio: ["ignore", "pipe", "ignore"] })
      : spawn(command, [...arguments_], { stdio: ["ignore", "pipe", "ignore"] });
    const stdout: Buffer[] = [];
    child.stdout?.on("data", chunk => stdout.push(Buffer.from(chunk)));
    child.once("error", rejectPromise);
    child.once("close", code => resolvePromise({ code, stdout: Buffer.concat(stdout).toString("utf8") }));
  });
}

function parseVersion(value: unknown, source: string): string {
  const parsed = typeof value === "string" ? validSemver(value) : null;
  if (!parsed) throw new Error(`${source} did not provide a valid semantic version`);
  return parsed;
}
function message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
