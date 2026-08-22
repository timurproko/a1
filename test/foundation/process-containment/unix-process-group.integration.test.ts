import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

const hasConfiguredGuardian = process.env.A1_RUN_PROCESS_CONTAINMENT_INTEGRATION === "1"
  && Boolean(process.env.A1_PROCESS_GUARDIAN_PATH);
const linuxIt = process.platform === "linux" && hasConfiguredGuardian ? it : it.skip;
const macIt = process.platform === "darwin" && hasConfiguredGuardian ? it : it.skip;

describe("Unix process guardian", () => {
  linuxIt("closes its isolated runtime process group while preserving an unrelated sibling", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-linux-containment-"));
    roots.push(root);
    const statePath = resolve(root, "tree.json");
    const statusPath = resolve(root, "guardian-status.json");
    const helper = process.env.A1_PROCESS_GUARDIAN_PATH ?? resolve("native/process-guardian/target/debug/a1-process-guardian");
    const fixture = resolve("test/fixtures/process-containment/tree.mjs");
    const parentSentinel = spawn(process.execPath, [fixture, "wait"], { stdio: "ignore" });
    const unrelated = spawn(process.execPath, [fixture, "wait"], { detached: true, stdio: "ignore" });
    unrelated.unref();
    if (!parentSentinel.pid) throw new Error("parent sentinel has no PID");
    const guardian = spawn(helper, [
      "--parent-pid", String(parentSentinel.pid),
      "--instance", randomUUID(),
      "--status-file", statusPath,
      "--", process.execPath, fixture, "root-group", statePath,
    ], { stdio: "ignore" });

    try {
      const tree = await waitForTree(statePath);
      parentSentinel.kill("SIGTERM");
      await waitUntil(() => !processIsAlive(parentSentinel.pid ?? 0), 3_000);
      await waitUntil(() => !processIsAlive(tree.rootPid) && !processIsAlive(tree.childPid) && !processIsAlive(tree.grandchildPid), 5_000);
      expect(processIsAlive(unrelated.pid ?? 0)).toBe(true);
    } finally {
      guardian.kill("SIGKILL");
      safeKill(parentSentinel.pid, "SIGKILL");
      safeKill(unrelated.pid, "SIGKILL");
    }
  }, 20_000);

  macIt("fails before runtime startup when exact containment is not certified", async () => {
    const helper = process.env.A1_PROCESS_GUARDIAN_PATH ?? resolve("native/process-guardian/target/debug/a1-process-guardian");
    const marker = resolve(await mkdtemp(resolve(tmpdir(), "a1-mac-containment-")), "started");
    roots.push(resolve(marker, ".."));
    const result = await run(helper, [
      "--parent-pid", String(process.pid), "--instance", randomUUID(), "--status-file", `${marker}.status`, "--",
      process.execPath, "-e", `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'started')`,
    ]);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("CONTAINMENT_UNSUPPORTED");
    await expect(readFile(marker, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });
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

async function run(executable: string, arguments_: readonly string[]): Promise<{ exitCode: number; stderr: string }> {
  return await new Promise(resolvePromise => {
    execFile(executable, [...arguments_], (error, _stdout, stderr) => {
      const exitCode = error && "code" in error && typeof error.code === "number" ? error.code : error ? 1 : 0;
      resolvePromise({ exitCode, stderr });
    });
  });
}
