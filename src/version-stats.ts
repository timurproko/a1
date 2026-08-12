import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { valid as validSemver } from "semver";
import { ADDONE_PACKAGE, createNpmProcessRunner, type UpdateOutput, type UpdateProcessRunner } from "./update.js";

export interface VersionStatsOptions {
  readonly packageRoot: string;
  readonly output?: UpdateOutput;
  readonly runner?: UpdateProcessRunner;
}

const defaultOutput: UpdateOutput = {
  stdout(message) { process.stdout.write(message); },
  stderr(message) { process.stderr.write(message); },
};

export async function runVersionStats(options: VersionStatsOptions): Promise<number> {
  const output = options.output ?? defaultOutput;
  const runner = options.runner ?? createNpmProcessRunner();
  let installed: string;
  try {
    const manifest = JSON.parse(await readFile(resolve(options.packageRoot, "package.json"), "utf8")) as { version?: unknown };
    installed = parseVersion(manifest.version, "installed package");
  } catch (error) {
    output.stderr(`AddOne could not read its installed version: ${message(error)}\n`);
    return 1;
  }

  const [release, next] = await Promise.all([
    queryTag(runner, "latest"),
    queryTag(runner, "next"),
  ]);
  output.stdout(`Installed: ${installed}\nRelease:   ${release.version ?? "unavailable"}\nNext:      ${next.version ?? "unavailable"}\n`);
  for (const result of [release, next]) {
    if (result.error) output.stderr(`AddOne could not resolve npm ${result.tag}: ${result.error}\n`);
  }
  return 0;
}

async function queryTag(runner: UpdateProcessRunner, tag: "latest" | "next"): Promise<{ tag: string; version: string | null; error: string | null }> {
  try {
    const result = await runner("npm", ["view", `${ADDONE_PACKAGE}@${tag}`, "version"], { captureStdout: true });
    if (result.code !== 0) return { tag, version: null, error: `npm exited with status ${result.code ?? "unknown"}` };
    try { return { tag, version: parseVersion(result.stdout.trim(), `npm ${tag}`), error: null }; }
    catch (error) { return { tag, version: null, error: message(error) }; }
  } catch (error) {
    return { tag, version: null, error: message(error) };
  }
}

function parseVersion(value: unknown, source: string): string {
  const parsed = typeof value === "string" ? validSemver(value) : null;
  if (!parsed) throw new Error(`${source} did not provide a valid semantic version`);
  return parsed;
}
function message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
