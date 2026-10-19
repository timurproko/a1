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
    if (artifact) return { runId: String(run.databaseId), headSha: run.headSha, artifact, branch };
  }
  return null;
}

/** Download the newest terminal library from the first candidate branch that published one. */
export function fetchTerminalVt({
  branches,
  platform = `${process.platform}-${process.arch}`,
  target = resolve(TERMINAL_VT_DIRECTORY),
  log = () => {},
  includeMergedDevelop = false,
} = {}) {
  if (!TERMINAL_VT_PLATFORMS.includes(platform)) throw new Error(`no CI terminal library is published for ${platform}`);
  const requested = branches?.filter(Boolean) ?? [capture("git", ["rev-parse", "--abbrev-ref", "HEAD"])];
  // Security: a fallback artifact must come from a pull request already integrated into develop;
  // arbitrary open or closed-unmerged branches can run modified native build code.
  const merged = includeMergedDevelop ? mergedDevelopmentBranches() : [];
  const candidates = [...new Set([...requested, ...merged])];
  let selected = null;
  for (const branch of candidates) {
    selected = findRun(branch, platform);
    if (selected) break;
  }
  if (!selected) {
    throw new Error(`no recent trusted CI run published terminal-vt-${platform}; dispatch one with: gh workflow run ci.yml --ref ${requested[0]}`);
  }
  const partial = `${target}.partial`;
  rmSync(partial, { recursive: true, force: true });
  capture("gh", ["run", "download", selected.runId, "-n", selected.artifact, "-D", partial]);
  if (!existsSync(join(partial, "terminal-vt.manifest.json"))) throw new Error(`${selected.artifact} has no terminal-vt.manifest.json`);
  // Invariant: the previous library is replaced only by a complete download.
  rmSync(target, { recursive: true, force: true });
  renameSync(partial, target);
  log(`fetched ${selected.artifact} from run ${selected.runId} (${selected.headSha.slice(0, 8)} on ${selected.branch}) into ${target}`);
  return { ...selected, target };
}

function mergedDevelopmentBranches() {
  const pullRequests = JSON.parse(capture("gh", [
    "pr", "list", "--state", "merged", "--base", "develop", "--limit", "50", "--json", "headRefName,mergedAt",
  ]));
  return pullRequests
    .filter(entry => typeof entry?.headRefName === "string" && typeof entry?.mergedAt === "string")
    .sort((left, right) => right.mergedAt.localeCompare(left.mergedAt))
    .map(entry => entry.headRefName);
}

function main() {
  const branch = argument("--branch") ?? capture("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  const selected = fetchTerminalVt({ branches: [branch], log: message => console.log(message) });
  console.log(`link it with TERMINAL_HOST_LOCAL_BUILD=1 and TERMINAL_HOST_PREBUILT_VT=${selected.target}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
