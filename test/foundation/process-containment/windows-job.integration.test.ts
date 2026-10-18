import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { ProcessGuardianAddon } from "../../../src/foundation/process-containment/index.js";

const require = createRequire(import.meta.url);
const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

const windowsIt = process.platform === "win32"
  && process.env.RUN_PROCESS_CONTAINMENT_INTEGRATION === "1"
  && process.env.A1_PROCESS_GUARDIAN_PATH ? it : it.skip;

describe("Windows Job Object process guardian addon", () => {
  windowsIt("reports a stable OS process start token and then reports death", async () => {
    const addon = guardianAddon();
    expect(addon.inspectProcessStart(0xffff_ffff)).toBeNull();

    const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore", windowsHide: true });
    if (!child.pid) throw new Error("identity fixture has no PID");
    const pid = child.pid;
    try {
      const identities = Array.from({ length: 4 }, () => addon.inspectProcessStart(pid));
      expect(new Set(identities)).toEqual(new Set([identities[0]]));
      expect(identities[0]).toMatch(/^windows-filetime:\d+$/);

      const exited = once(child, "exit");
      child.kill();
      await exited;
      for (let attempt = 0; attempt < 8; attempt += 1) expect(addon.inspectProcessStart(pid)).toBeNull();
    } finally {
      child.kill("SIGKILL");
    }
  }, 20_000);

  windowsIt("kills root, detached child, and detached grandchild when its Node owner closes", async () => {
    const root = await fixtureRoot("a1-job-containment-");
    const treePath = resolve(root, "tree.json");
    const ownerState = resolve(root, "owner.json");
    const fixture = resolve("test/fixtures/process-containment/tree.mjs");
    const unrelated = spawn(process.execPath, [fixture, "wait"], { detached: true, stdio: "ignore", windowsHide: true });
    unrelated.unref();
    const owner = spawnOwner(ownerState, null, [process.execPath, fixture, "root", treePath]);

    try {
      const tree = await waitForTree(treePath);
      expect([tree.rootPid, tree.childPid, tree.grandchildPid].every(processIsAlive)).toBe(true);
      await forceKill(owner.pid);
      await waitUntil(() => !processIsAlive(tree.rootPid) && !processIsAlive(tree.childPid) && !processIsAlive(tree.grandchildPid), 4_000);
      expect(processIsAlive(unrelated.pid ?? 0)).toBe(true);
    } finally {
      safeKill(owner.pid, "SIGKILL");
      safeKill(unrelated.pid, "SIGKILL");
    }
  }, 20_000);

  windowsIt("prints the armed exit notice after the runtime is force-killed and stays silent after a clean exit", async () => {
    const root = await fixtureRoot("a1-exit-notice-");
    const run = async (script: string, kill: boolean) => {
      const statePath = resolve(root, `${randomUUID()}.owner.json`);
      const noticePath = resolve(root, `${randomUUID()}.exit-notice`);
      const owner = spawnOwner(statePath, noticePath, [process.execPath, "-e", script, noticePath]);
      let output = "";
      owner.stdout?.on("data", chunk => { output += chunk; });
      owner.stderr?.on("data", chunk => { output += chunk; });
      const closed = once(owner, "close");
      if (kill) {
        await waitUntil(async () => (await readFile(noticePath, "utf8").catch(() => "")).length > 0, 10_000);
        const state = JSON.parse(await readFile(statePath, "utf8")) as { runtimePid: number };
        await forceKill(state.runtimePid);
      }
      await closed;
      return { output, noticeRemains: await readFile(noticePath, "utf8").then(() => true, () => false) };
    };

    const killed = await run(
      "require('fs').writeFileSync(process.argv[1], 'a1 was stopped unexpectedly.\\nTo resume this session: a1 --session abc\\n'); setInterval(() => {}, 1000)",
      true,
    );
    expect(killed.output).toContain("a1 was stopped unexpectedly.\r\nTo resume this session: a1 --session abc\r\n");
    expect(killed.noticeRemains).toBe(false);

    const clean = await run(
      "const fs = require('fs'); fs.writeFileSync(process.argv[1], 'armed\\n'); fs.rmSync(process.argv[1])",
      false,
    );
    expect(clean.output).toBe("");
  }, 30_000);

  windowsIt("delivers the exit notice from its Node watcher when the owner is force-killed", async () => {
    const root = await fixtureRoot("a1-exit-notice-owner-");
    const statePath = resolve(root, "owner.json");
    const noticePath = resolve(root, "runtime.exit-notice");
    const runtime = "require('fs').writeFileSync(process.argv[1], 'a1 was stopped unexpectedly.\\n'); setInterval(() => {}, 1000)";
    const owner = spawnOwner(statePath, noticePath, [process.execPath, "-e", runtime, noticePath]);
    let output = "";
    owner.stdout?.on("data", chunk => { output += chunk; });
    owner.stderr?.on("data", chunk => { output += chunk; });
    try {
      await waitUntil(async () => (await readFile(noticePath, "utf8").catch(() => "")).length > 0, 10_000);
      const state = JSON.parse(await readFile(statePath, "utf8")) as { runtimePid: number; watcherPid: number };
      const runtimePid = state.runtimePid;
      expect(processIsAlive(state.watcherPid), `watcher ${state.watcherPid} exited before its owner`).toBe(true);
      await forceKill(owner.pid);
      await waitUntil(() => output.includes("a1 was stopped unexpectedly.\r\n"), 10_000).catch(async error => {
        const noticeRemains = await readFile(noticePath, "utf8").then(() => true, () => false);
        throw new Error(`${error instanceof Error ? error.message : String(error)}; watcher output: ${JSON.stringify(output)}; watcher alive: ${processIsAlive(state.watcherPid)}; runtime alive: ${processIsAlive(runtimePid)}; notice remains: ${noticeRemains}`);
      });
      await waitUntil(() => !processIsAlive(runtimePid), 4_000);
      await expect(readFile(noticePath, "utf8")).rejects.toThrow();
    } finally {
      safeKill(owner.pid, "SIGKILL");
    }
  }, 30_000);
});

function guardianAddon(): ProcessGuardianAddon {
  return require(resolve(process.env.A1_PROCESS_GUARDIAN_PATH ?? "dist/native/win32-x64/process-guardian.node")) as ProcessGuardianAddon;
}

function spawnOwner(statePath: string, noticePath: string | null, command: readonly string[]) {
  const addonPath = resolve(process.env.A1_PROCESS_GUARDIAN_PATH ?? "dist/native/win32-x64/process-guardian.node");
  const owner = resolve("test/fixtures/process-containment/owner.mjs");
  const watcher = resolve("dist/foundation/launch-guardian/exit-watcher.js");
  return spawn(process.execPath, [owner, "--addon", addonPath, "--watcher", watcher, "--state", statePath, ...(noticePath ? ["--notice", noticePath] : []), "--", ...command], {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

async function forceKill(pid: number | undefined): Promise<void> {
  if (!pid) throw new Error("process fixture has no PID");
  await new Promise(resolvePromise => execFile("taskkill", ["/F", "/PID", String(pid)], { windowsHide: true }, resolvePromise));
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
