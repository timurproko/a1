import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import crossSpawn from "cross-spawn";
import { valid as validSemver } from "semver";
import { PRODUCT_TEXT } from "../product-identity.js";

interface VersionProcessResult { readonly code: number | null; readonly stdout: string }
type VersionProcessRunner = (command: string, arguments_: readonly string[]) => Promise<VersionProcessResult>;
interface VersionOutput { stdout(message: string): void; stderr(message: string): void }
interface RemoteVersions { readonly release: string | null; readonly develop: string | null; readonly error: string | null }

export interface VersionStatsOptions {
  readonly packageRoot: string;
  readonly output?: VersionOutput;
  readonly runner?: VersionProcessRunner;
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

  const remote = await queryDistTags(runner);
  output.stdout(`Current: ${installed}\nDevelop: ${remote.develop ?? "unavailable"}\nRelease: ${remote.release ?? "unavailable"}\n`);
  if (remote.error) output.stderr(`${PRODUCT_TEXT.diagnostic(`could not resolve npm dist-tags: ${remote.error}`)}\n`);
  return 0;
}

async function queryDistTags(runner: VersionProcessRunner): Promise<RemoteVersions> {
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
    if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) throw new TypeError("npm returned a non-object dist-tags value");
    const tags = metadata as Record<string, unknown>;
    const release = parseVersion(tags.latest, "npm latest");
    const develop = tags.next === undefined ? null : parseVersion(tags.next, "npm development channel");
    return { release, develop, error: null };
  } catch (error) {
    return unavailable(message(error));
  }
}

function unavailable(error: string): RemoteVersions {
  return { release: null, develop: null, error };
}

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
