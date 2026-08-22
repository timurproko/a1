import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

const windowsIt = process.platform === "win32"
  && process.env.A1_RUN_PROCESS_CONTAINMENT_INTEGRATION === "1"
  && process.env.A1_PROCESS_GUARDIAN_PATH ? it : it.skip;

describe("Windows Job Object process guardian", () => {
  windowsIt("reports a stable OS process start token and then reports death", async () => {
    const helper = process.env.A1_PROCESS_GUARDIAN_PATH
      ?? resolve("native/process-guardian/target/debug/process-guardian.exe");
    const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore", windowsHide: true });
    if (!child.pid) throw new Error("identity fixture has no PID");
    try {
      const first = await inspect(helper, child.pid);
      const second = await inspect(helper, child.pid);
      expect(first).toEqual(second);
      expect(first.startIdentity).toMatch(/^windows-filetime:\d+$/);
    } finally {
      child.kill();
    }
    await waitUntil(() => !processIsAlive(child.pid ?? 0), 2_000);
    await expect(inspectExit(helper, child.pid)).resolves.toBe(3);
  }, 20_000);

  windowsIt("kills root, detached child, and detached grandchild when its owner closes", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-job-containment-"));
    roots.push(root);
    const statePath = resolve(root, "tree.json");
    const statusPath = resolve(root, "guardian-status.json");
    const helper = process.env.A1_PROCESS_GUARDIAN_PATH
      ?? resolve("native/process-guardian/target/debug/process-guardian.exe");
    const fixture = resolve("test/fixtures/process-containment/tree.mjs");
    const unrelated = spawn(process.execPath, [fixture, "wait"], { detached: true, stdio: "ignore", windowsHide: true });
    unrelated.unref();

    const guardian = spawn(helper, [
      "--parent-pid", String(process.pid),
      "--instance", randomUUID(),
      "--status-file", statusPath,
      "--", process.execPath, fixture, "root", statePath,
    ], { stdio: "ignore", windowsHide: true });

    try {
      const tree = await waitForTree(statePath);
      expect(tree.rootPid).toBeGreaterThan(0);
      expect(tree.childPid).toBeGreaterThan(0);
      expect(tree.grandchildPid).toBeGreaterThan(0);
      expect([tree.rootPid, tree.childPid, tree.grandchildPid].every(processIsAlive)).toBe(true);

      guardian.kill();
      await waitUntil(() => !processIsAlive(tree.rootPid) && !processIsAlive(tree.childPid) && !processIsAlive(tree.grandchildPid), 4_000);
      expect(processIsAlive(unrelated.pid ?? 0)).toBe(true);
    } finally {
      guardian.kill();
      safeKill(unrelated.pid, "SIGKILL");
    }
  }, 20_000);
});

async function waitForTree(path: string): Promise<{ rootPid: number; childPid: number; grandchildPid: number }> {
  let parsed: { rootPid: number; childPid: number; grandchildPid: number } | null = null;
  await waitUntil(async () => {
    try {
      parsed = JSON.parse(await readFile(path, "utf8"));
      return true;
    } catch {
      return false;
    }
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

async function inspect(helper: string, pid: number): Promise<{ pid: number; startIdentity: string }> {
  return await new Promise((resolvePromise, rejectPromise) => {
    execFile(helper, ["--inspect-pid", String(pid)], { windowsHide: true }, (error, stdout, stderr) => {
      if (error) rejectPromise(new Error(stderr || error.message));
      else resolvePromise(JSON.parse(stdout));
    });
  });
}

async function inspectExit(helper: string, pid: number | undefined): Promise<number> {
  return await new Promise(resolvePromise => {
    execFile(helper, ["--inspect-pid", String(pid ?? 0)], { windowsHide: true }, error => {
      resolvePromise(error && "code" in error && typeof error.code === "number" ? error.code : error ? 1 : 0);
    });
  });
}

function processIsAlive(pid: number): boolean {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function safeKill(pid: number | undefined, signal: NodeJS.Signals): void {
  if (!pid) return;
  try {
    process.kill(pid, signal);
  } catch (error) {
    if (!error || typeof error !== "object" || !("code" in error) || error.code !== "ESRCH") throw error;
  }
}
