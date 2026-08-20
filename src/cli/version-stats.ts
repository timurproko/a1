import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import crossSpawn from "cross-spawn";
import { valid as validSemver } from "semver";
import { PRODUCT_TEXT } from "../product-identity.js";
interface VersionProcessResult { readonly code: number | null; readonly stdout: string }
type VersionProcessRunner = (command: string, arguments_: readonly string[]) => Promise<VersionProcessResult>;
interface VersionOutput { stdout(message: string): void; stderr(message: string): void }

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

  const [release, next] = await Promise.all([
    queryTag(runner, "latest"),
    queryTag(runner, "next"),
  ]);
  output.stdout(`Installed: ${installed}\nRelease:   ${release.version ?? "unavailable"}\nNext:      ${next.version ?? "unavailable"}\n`);
  for (const result of [release, next]) {
    if (result.error) output.stderr(`${PRODUCT_TEXT.diagnostic(`could not resolve npm ${result.tag}: ${result.error}`)}\n`);
  }
  return 0;
}

async function queryTag(runner: VersionProcessRunner, tag: "latest" | "next"): Promise<{ tag: string; version: string | null; error: string | null }> {
  try {
    const result = await runner("npm", ["view", `${PRODUCT_TEXT.packageName}@${tag}`, "version"]);
    if (result.code !== 0) return { tag, version: null, error: `npm exited with status ${result.code ?? "unknown"}` };
    try { return { tag, version: parseVersion(result.stdout.trim(), `npm ${tag}`), error: null }; }
    catch (error) { return { tag, version: null, error: message(error) }; }
  } catch (error) {
    return { tag, version: null, error: message(error) };
  }
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
