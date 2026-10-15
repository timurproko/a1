#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, rmSync, renameSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

// Rationale: Zig cannot run on a developer workstation whose antivirus quarantines its package
// fetch, so a local native build links the terminal library a CI lane built and published instead.
// This fetches the newest one for this platform; `build.rs` verifies its manifest before linking.

/** The platforms whose native validation lane publishes `terminal-vt-<platform>-<architecture>`. */
export const TERMINAL_VT_PLATFORMS = Object.freeze(["win32-x64", "linux-x64", "darwin-arm64"]);
export const TERMINAL_VT_DIRECTORY = ".artifacts/terminal-vt";

/** The newest unexpired library artifact for one platform among a run's artifacts, if any. */
export function terminalVtArtifact(artifacts, platform) {
  const prefix = `terminal-vt-${platform}-attempt-`;
  const matching = artifacts
    .filter(entry => typeof entry?.name === "string" && entry.name.startsWith(prefix) && entry.expired !== true)
    .map(entry => ({ name: entry.name, attempt: Number(entry.name.slice(prefix.length)) }))
    .filter(entry => Number.isSafeInteger(entry.attempt) && entry.attempt > 0)
    .sort((left, right) => right.attempt - left.attempt);
  return matching[0]?.name ?? null;
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? null : process.argv[index + 1] ?? null;
}

function capture(command, arguments_) {
  const result = spawnSync(command, arguments_, { encoding: "utf8", windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${arguments_.slice(0, 3).join(" ")} failed: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

// Invariant: the upload step runs only after the native lane's tests pass, so the newest run that
// carries the artifact is the newest successful native validation of that branch.
function findRun(branch, platform) {
  const runs = JSON.parse(capture("gh", [
    "run", "list", "--workflow", "ci.yml", "--branch", branch, "--limit", "20", "--json", "databaseId,headSha",
  ]));
  for (const run of runs) {
    const artifacts = JSON.parse(capture("gh", [
      "api", `repos/{owner}/{repo}/actions/runs/${run.databaseId}/artifacts`, "--jq", ".artifacts",
    ]));
    const artifact = terminalVtArtifact(artifacts, platform);
    if (artifact) return { runId: String(run.databaseId), headSha: run.headSha, artifact };
  }
  throw new Error(`no recent CI run on ${branch} published terminal-vt-${platform}; dispatch one with: gh workflow run ci.yml --ref ${branch}`);
}

function main() {
  const platform = `${process.platform}-${process.arch}`;
  if (!TERMINAL_VT_PLATFORMS.includes(platform)) throw new Error(`no CI terminal library is published for ${platform}`);
  const branch = argument("--branch") ?? capture("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  const selected = findRun(branch, platform);
  const target = resolve(TERMINAL_VT_DIRECTORY);
  const partial = `${target}.partial`;
  rmSync(partial, { recursive: true, force: true });
  capture("gh", ["run", "download", selected.runId, "-n", selected.artifact, "-D", partial]);
  if (!existsSync(join(partial, "terminal-vt.manifest.json"))) throw new Error(`${selected.artifact} has no terminal-vt.manifest.json`);
  // Invariant: the previous library is replaced only by a complete download.
  rmSync(target, { recursive: true, force: true });
  renameSync(partial, target);
  console.log(`fetched ${selected.artifact} from run ${selected.runId} (${selected.headSha.slice(0, 8)} on ${branch}) into ${TERMINAL_VT_DIRECTORY}`);
  console.log(`link it with TERMINAL_HOST_LOCAL_BUILD=1 and TERMINAL_HOST_PREBUILT_VT=${target}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
