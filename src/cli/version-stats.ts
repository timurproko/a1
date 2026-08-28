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
  try {
    const manifest = JSON.parse(await readFile(resolve(options.packageRoot, "package.json"), "utf8")) as { version?: unknown };
    installed = parseVersion(manifest.version, "installed package");
  } catch (error) {
    output.stderr(`${PRODUCT_TEXT.diagnostic(`could not read its installed version: ${message(error)}`)}\n`);
    return 1;
  }

  // Match Pi's release behavior: stable builds print only their installed version.
  // Development builds retain channel visibility for preview comparison and updates.
  if (prerelease(installed) === null) {
    output.stdout(`${installed}\n`);
    return 0;
  }

  const remote = await queryDistTags(runner, options.fetcher ?? defaultRegistryFetcher);
  output.stdout(`Current: ${installed}\nDevelop: ${remote.develop ?? "unavailable"}\nRelease: ${remote.release ?? "unavailable"}\n`);
  if (remote.error) output.stderr(`${PRODUCT_TEXT.diagnostic(`could not resolve npm dist-tags: ${remote.error}`)}\n`);
  return 0;
}

// npm view respects the user's .npmrc registry and proxy, so it stays primary; the direct
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
    // npm 12 wraps `npm view <pkg> dist-tags --json` output in a one-element array; older npm returns the bare object.
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
