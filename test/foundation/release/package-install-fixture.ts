import crossSpawn from "cross-spawn";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { expect } from "vitest";
import type { ValidationPhaseRecorder } from "../../../scripts/release/validation-phase.mjs";
import { loadValidationCandidate } from "./package-candidate-fixture.js";

export async function installExactCandidate(phases: ValidationPhaseRecorder, label: string) {
  const candidate = await phases.run("load-candidate", () => loadValidationCandidate());
  phases.bindCandidate(candidate.bytes);
  const root = await mkdtemp(resolve(tmpdir(), label));
  const prefix = resolve(root, "prefix");
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  await phases.run("clean-global-install", async () => {
    const installed = await runFixtureCommand(npm, ["install", "--global", "--prefix", prefix, candidate.path, "--ignore-scripts", "--no-audit", "--no-fund", "--prefer-offline"], root);
    expect(installed.status, installed.stderr).toBe(0);
  });
  return { candidate, root, prefix };
}

export async function cleanupExactCandidate(phases: ValidationPhaseRecorder, root: string): Promise<void> {
  if (!root) return;
  await phases.cleanup("fixture-cleanup", () => removeFixtureRoot(root), result => result);
}

export function runFixtureCommand(command: string, arguments_: readonly string[], cwd: string, environment: NodeJS.ProcessEnv = process.env) {
  return new Promise<{ status: number | null; stdout: string; stderr: string }>((resolvePromise, rejectPromise) => {
    const child = crossSpawn(command, [...arguments_], { cwd, env: environment, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", chunk => { stdout += chunk.toString(); });
    child.stderr?.on("data", chunk => { stderr += chunk.toString(); });
    child.once("error", rejectPromise);
    child.once("close", status => resolvePromise({ status, stdout, stderr }));
  });
}

async function removeFixtureRoot(path: string): Promise<"passed" | "deferred"> {
  if (process.platform !== "win32") {
    await rm(path, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 });
    return "passed";
  }
  // Platform: a fresh detached cleanup process avoids retaining this test process's
  // dynamically imported exact-package modules while preserving deferred evidence.
  const cleanup = crossSpawn.sync(process.execPath, [
    "-e",
    "require('node:fs/promises').rm(process.argv[1], { recursive: true, force: true, maxRetries: 2, retryDelay: 100 }).catch(() => { process.exitCode = 1; })",
    path,
  ], { windowsHide: true, stdio: "ignore", timeout: 5_000 });
  if (cleanup.status !== 0 || cleanup.error) {
    process.stderr.write(`Deferred locked Windows fixture cleanup: ${path}\n`);
    return "deferred";
  }
  return "passed";
}
