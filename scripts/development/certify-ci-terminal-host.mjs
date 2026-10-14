#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { closeSync, existsSync, openSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import process from "node:process";

// Rationale: the native host builds only in CI, so local certification reuses the debug host the
// matching platform lane uploaded and runs the same fidelity and latency proofs against this
// checkout's fixtures, turning a CI round-trip into a local loop.
const PLATFORM_ARTIFACTS = Object.freeze({
  "win32-x64": { artifact: "terminal-host-win32-x64", binary: "terminal-host.exe" },
  "linux-x64": { artifact: "terminal-host-linux-x64", binary: "terminal-host" },
  "darwin-arm64": { artifact: "terminal-host-darwin-arm64", binary: "terminal-host" },
});

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

function findRun(branch, artifactPrefix) {
  const runs = JSON.parse(capture("gh", [
    "run", "list", "--workflow", "ci.yml", "--branch", branch, "--limit", "20", "--json", "databaseId,headSha",
  ]));
  for (const run of runs) {
    const artifacts = JSON.parse(capture("gh", [
      "api", `repos/{owner}/{repo}/actions/runs/${run.databaseId}/artifacts`, "--jq", ".artifacts",
    ]));
    const artifact = artifacts.find(entry => entry.name.startsWith(`${artifactPrefix}-attempt-`) && !entry.expired);
    if (artifact) return { runId: String(run.databaseId), headSha: run.headSha, artifact: artifact.name };
  }
  throw new Error(`no CI run on ${branch} uploaded ${artifactPrefix}; dispatch one with: gh workflow run ci.yml --ref ${branch}`);
}

function main() {
  const key = `${process.platform}-${process.arch}`;
  const target = PLATFORM_ARTIFACTS[key];
  if (!target) throw new Error(`no CI terminal host is published for ${key}`);
  const branch = argument("--branch") ?? capture("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  const repeat = Number(argument("--repeat") ?? "3");
  if (!Number.isSafeInteger(repeat) || repeat < 1) throw new Error("--repeat must be a positive integer");
  const requested = argument("--run");
  const selected = requested === null
    ? findRun(branch, target.artifact)
    : { runId: requested, headSha: null, artifact: null };
  const directory = resolve(".artifacts", "ci-terminal-host", selected.runId);
  const host = join(directory, "native", "terminal-host", "target", "debug", target.binary);
  if (!existsSync(host)) {
    const artifact = selected.artifact ?? JSON.parse(capture("gh", [
      "api", `repos/{owner}/{repo}/actions/runs/${selected.runId}/artifacts`, "--jq", ".artifacts",
    ])).find(entry => entry.name.startsWith(`${target.artifact}-attempt-`))?.name;
    if (!artifact) throw new Error(`run ${selected.runId} did not upload ${target.artifact}`);
    capture("gh", ["run", "download", selected.runId, "-n", artifact, "-D", directory]);
  }
  const head = capture("git", ["rev-parse", "HEAD"]);
  if (selected.headSha && selected.headSha !== head) {
    console.error(`note: host from run ${selected.runId} was built at ${selected.headSha.slice(0, 8)}; checkout is ${head.slice(0, 8)}, so native changes since then are not exercised`);
  }
  // Compatibility: the fixtures import the compiled bridge client, so rebuild it from this checkout.
  capture(process.execPath, [resolve("node_modules/typescript/bin/tsc"), "-p", "tsconfig.build.json"]);
  const failures = [];
  const fidelity = spawnSync(process.execPath, ["scripts/development/verify-terminal-fidelity.mjs", "--host", host], { encoding: "utf8" });
  console.log(`fidelity: ${fidelity.status === 0 ? "pass" : "FAIL"}`);
  if (fidelity.status !== 0) failures.push(`fidelity: ${(fidelity.stderr || fidelity.stdout).trim().split("\n").pop()}`);
  for (let attempt = 1; attempt <= repeat; attempt++) {
    // Platform: the measured host detaches a server that inherits stdio; files, as in CI, let the
    // proof finish without waiting for that long-lived server to close a pipe.
    const outputFile = join(directory, `performance-${attempt}.json`);
    const errorFile = join(directory, `performance-${attempt}.err`);
    const outputHandle = openSync(outputFile, "w");
    const errorHandle = openSync(errorFile, "w");
    const measurement = spawnSync(process.execPath, [
      "scripts/development/measure-resident-tabs.mjs", "--host", host, "--direct-startup-budget-ms", "2500",
    ], { stdio: ["ignore", outputHandle, errorHandle], timeout: 120_000 });
    closeSync(outputHandle);
    closeSync(errorHandle);
    const stderr = readFileSync(errorFile, "utf8");
    let summary = "no measurement output";
    try {
      const { measurements } = JSON.parse(readFileSync(outputFile, "utf8"));
      summary = Object.entries(measurements)
        .map(([metric, result]) => `${metric}=${result.p95Ms?.toFixed(1)}/${result.budgetMs}${result.passed ? "" : "!"}`)
        .join(" ");
    } catch {
      summary = (stderr.match(/Error: [^\n]*|timed out waiting for [^;\n]*/u)?.[0] ?? summary).slice(0, 300);
    }
    console.log(`measurement ${attempt}/${repeat}: ${measurement.status === 0 ? "pass" : "FAIL"} ${summary}`);
    if (measurement.status !== 0) failures.push(`measurement ${attempt}: ${summary}`);
  }
  stopDownloadedHosts(host);
  if (failures.length > 0) process.exitCode = 1;
}

// Rationale: each measurement leaves its detached resident server running; only processes started
// from the downloaded binary are stopped, so an installed A1 host is never touched.
function stopDownloadedHosts(host) {
  if (process.platform === "win32") {
    const pattern = host.replaceAll("/", "\\").replaceAll("'", "''");
    spawnSync("powershell.exe", [
      "-NoProfile", "-Command",
      `Get-CimInstance Win32_Process -Filter "Name='terminal-host.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains('${pattern}') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`,
    ], { stdio: "ignore", windowsHide: true });
  } else {
    spawnSync("pkill", ["-f", host], { stdio: "ignore" });
  }
}

main();
