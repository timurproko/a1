import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { ProcessGuardianAddon } from "../../../src/foundation/process-containment/index.js";

const require = createRequire(import.meta.url);
const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

const hasConfiguredGuardian = process.env.RUN_PROCESS_CONTAINMENT_INTEGRATION === "1"
  && Boolean(process.env.A1_PROCESS_GUARDIAN_PATH);
const unixIt = (process.platform === "linux" || process.platform === "darwin") && hasConfiguredGuardian ? it : it.skip;
const macIt = process.platform === "darwin" && hasConfiguredGuardian ? it : it.skip;

describe("Unix process guardian addon", () => {
  unixIt("closes its isolated runtime process group through the watcher while preserving an unrelated sibling", async () => {
    const root = await fixtureRoot("a1-unix-containment-");
    const treePath = resolve(root, "tree.json");
    const ownerState = resolve(root, "owner.json");
    const fixture = resolve("test/fixtures/process-containment/tree.mjs");
    const unrelated = spawn(process.execPath, [fixture, "wait"], { detached: true, stdio: "ignore" });
    unrelated.unref();
    const owner = spawnOwner(ownerState, [process.execPath, fixture, "root-group", treePath]);

    try {
      const tree = await waitForTree(treePath);
      owner.kill("SIGKILL");
      await waitUntil(() => !processIsAlive(owner.pid ?? 0), 3_000);
      await waitUntil(() => !processIsAlive(tree.rootPid) && !processIsAlive(tree.childPid) && !processIsAlive(tree.grandchildPid), 5_000);
      expect(processIsAlive(unrelated.pid ?? 0)).toBe(true);
    } finally {
      safeKill(owner.pid, "SIGKILL");
      safeKill(unrelated.pid, "SIGKILL");
    }
  }, 20_000);

  macIt.each([
    { mode: "normal", expectedExit: 0 },
    { mode: "signaled", expectedExit: 143 },
  ])("transfers and restores pseudo-terminal foreground ownership ($mode)", async ({ mode, expectedExit }) => {
    const root = await fixtureRoot("a1-darwin-pty-");
    const marker = resolve(root, "child.json");
    const resultPath = resolve(root, "result.json");
    const statePath = resolve(root, "owner.json");
    const fixture = resolve("test/fixtures/process-containment/darwin-pty.py");
    const execution = await run("python3", [
      fixture,
      guardianPath(),
      process.execPath,
      resolve("test/fixtures/process-containment/owner.mjs"),
      resolve("dist/foundation/launch-guardian/exit-watcher.js"),
      marker,
      resultPath,
      statePath,
      mode,
    ]);
    expect(execution.exitCode, execution.stderr).toBe(0);
    const result = JSON.parse(await readFile(resultPath, "utf8")) as {
      ownerPid: number; initialForeground: number; restoredForeground: number; exitCode: number;
    };
    expect(result.exitCode).toBe(expectedExit);
    expect(result.initialForeground).toBe(result.ownerPid);
    expect([0, result.ownerPid]).toContain(result.restoredForeground);
    const child = JSON.parse(await readFile(marker, "utf8")) as { pid: number; processGroup: number; foregroundGroup: number };
    expect(child.processGroup).toBe(child.pid);
    expect(child.foregroundGroup).toBe(child.processGroup);
    expect(child.processGroup).not.toBe(result.ownerPid);
  }, 20_000);

  macIt("reports a stable native start identity for a live Darwin process", () => {
    const addon = require(guardianPath()) as ProcessGuardianAddon;
    const first = addon.inspectProcessStart(process.pid);
    const second = addon.inspectProcessStart(process.pid);
    expect(first).toBe(second);
    expect(first).toMatch(/^darwin-proc-start:\d+:\d+$/);
  });
});

function guardianPath(): string {
  return resolve(process.env.A1_PROCESS_GUARDIAN_PATH ?? "dist/native/darwin-arm64/process-guardian.node");
}

function spawnOwner(statePath: string, command: readonly string[]) {
  return spawn(process.execPath, [
    resolve("test/fixtures/process-containment/owner.mjs"),
    "--addon", guardianPath(),
    "--watcher", resolve("dist/foundation/launch-guardian/exit-watcher.js"),
    "--state", statePath,
    "--", ...command,
  ], { stdio: "ignore" });
}

async function fixtureRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), prefix));
  roots.push(root);
  return root;
}

async function waitForTree(path: string): Promise<{ rootPid: number; childPid: number; grandchildPid: number }> {
  let parsed: { rootPid: number; childPid: number; grandchildPid: number } | null = null;
  await waitUntil(async () => {
    try { parsed = JSON.parse(await readFile(path, "utf8")); return true; } catch { return false; }
  }, 10_000);
  if (!parsed) throw new Error("process-tree fixture did not report identities");
  return parsed;
}

async function waitUntil(predicate: () => boolean | Promise<boolean>, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise(resolvePromise => setTimeout(resolvePromise, 25));
  }
  throw new Error(`condition remained false for ${timeoutMs}ms`);
}

function processIsAlive(pid: number): boolean {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function safeKill(pid: number | undefined, signal: NodeJS.Signals): void {
  if (!pid) return;
  try { process.kill(pid, signal); } catch (error) {
    if (!error || typeof error !== "object" || !("code" in error) || error.code !== "ESRCH") throw error;
  }
}

async function run(executable: string, arguments_: readonly string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return await new Promise(resolvePromise => {
    const child = spawn(executable, [...arguments_], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("close", code => resolvePromise({ exitCode: code ?? 1, stdout, stderr }));
  });
}
