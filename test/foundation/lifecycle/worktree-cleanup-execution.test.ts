import { execFile, spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { access, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { expect, it, vi } from "vitest";
import { assertWorktreeCleanupSnapshot, captureWorktreeCleanupSnapshot } from "../../../src/foundation/lifecycle/worktree-cleanup-snapshot.mjs";
import { executeCleanupCommand, executeUnclaimedWorktreeCleanup, withUnclaimedWorktree } from "../../../src/foundation/lifecycle/worktree-claim-boundary.mjs";

// Performance: the suspension probe deliberately crosses the former ten-second lease with real processes.
vi.setConfig({ testTimeout: 60_000 });
const exec = promisify(execFile), repo = fileURLToPath(new URL("../../../", import.meta.url));
const worker = fileURLToPath(new URL("../../fixtures/worktree-cleanup-process.mjs", import.meta.url));
const exists = (path: string) => access(path).then(() => true, () => false);
async function wait(path: string) {
  const deadline = Date.now() + 20_000;
  while (!await exists(path)) { if (Date.now() > deadline) throw new Error(`fixture did not publish ${path}`); await delay(25); }
}
async function suspend(pid: number, stopped: boolean) {
  if (process.platform !== "win32") { process.kill(pid, stopped ? "SIGSTOP" : "SIGCONT"); return; }
  const method = stopped ? "NtSuspendProcess" : "NtResumeProcess";
  await exec("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command",
    `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class FixtureSuspend { [DllImport("ntdll.dll")] public static extern int ${method}(IntPtr p); }'; if ([FixtureSuspend]::${method}([System.Diagnostics.Process]::GetProcessById(${pid}).Handle) -ne 0) { exit 1 }`]);
}
async function fixture(grandchild = false, tamper = "") {
  const root = await realpath(await mkdtemp(join(tmpdir(), "cleanup-process-boundary-"))), primary = join(root, "primary"), dataDir = join(root, "data");
  const git = async (cwd: string, args: string[]) => exec("git", ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "-C", cwd, ...args]);
  await mkdir(primary); await git(primary, ["init", "-b", "develop"]);
  await writeFile(join(primary, "README.md"), "preserve until approved cleanup\n");
  await git(primary, ["add", "."]); await git(primary, ["commit", "-m", "fixture"]);
  const path = join(primary, ".worktrees", "task"); await git(primary, ["worktree", "add", "-b", "fix/task", path]);
  const session = { sessionId: "competing-process", sessionFile: join(root, "session.jsonl") };
  await writeFile(session.sessionFile, JSON.stringify({ type: "session", version: 3, id: session.sessionId, cwd: primary }) + "\n");
  const data = { primary, path, dataDir, session, snapshot: await captureWorktreeCleanupSnapshot(path),
    ready: join(root, "ready"), release: join(root, "release"), done: join(root, "done"), grandchild, tamper };
  const file = join(root, "input.json"); await writeFile(file, JSON.stringify(data));
  const children: ChildProcess[] = [];
  const start = (mode: string) => {
    const child = spawn(process.execPath, [worker, mode, file], { cwd: repo, stdio: ["ignore", "pipe", "pipe", "ipc"] });
    children.push(child); return child;
  };
  const competitor = start("attach"); await once(competitor, "message");
  const attempt = async () => { const response = once(competitor, "message"); competitor.send("attach"); return (await response)[0]; };
  const dispose = async () => {
    if (await exists(data.ready)) {
      const pid = JSON.parse(await readFile(data.ready, "utf8")).pid as number;
      try { process.kill(pid, "SIGKILL"); } catch {}
    }
    for (const child of children) if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit"); child.kill("SIGKILL"); await exited;
    }
    await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  };
  const key = process.platform === "win32" ? resolve(data.snapshot.path).toLowerCase() : resolve(data.snapshot.path);
  return { ...data, root, file, git, start, attempt, dispose, gate: join(data.snapshot.commonDir, "worktree-claim-gates", `${createHash("sha256").update(key).digest("hex")}.gate`) };
}

it("binds packed refs and detached HEAD without extra Git snapshot children", async () => {
  const f = await fixture();
  try {
    await f.git(f.primary, ["pack-refs", "--all", "--prune"]);
    assertWorktreeCleanupSnapshot(f.snapshot, await captureWorktreeCleanupSnapshot(f.path));
    await f.git(f.path, ["checkout", "--detach"]);
    expect(await captureWorktreeCleanupSnapshot(f.path)).toMatchObject({ head: f.snapshot.head, ref: "HEAD" });
  } finally { await f.dispose(); }
});

it("rejects incomplete child output and releases only after the child closes", async () => {
  const f = await fixture();
  try {
    await expect(executeUnclaimedWorktreeCleanup(f.snapshot, process.execPath, ["-e", "process.stdout.write('x'.repeat(1024));setTimeout(()=>{},1000)"], {
      dataDir: f.dataDir, maxBuffer: 32,
    })).rejects.toMatchObject({ code: "worktree-cleanup-output-limit" });
    expect(await exists(f.gate)).toBe(false); expect(await exists(f.path)).toBe(true);
    expect(await f.attempt()).toMatchObject({ attached: true });
  } finally { await f.dispose(); }
});

it("retains exclusion when a callback fails while its issued child is still validating before spawn", async () => {
  const f = await fixture(); let pending: Promise<string> | undefined;
  try {
    await expect(withUnclaimedWorktree(f.snapshot, { dataDir: f.dataDir }, async () => {
      pending = executeCleanupCommand(process.execPath, [worker, "cleanup", f.file], { cwd: f.primary, protectTarget: true });
      throw new Error("callback failed after issuing cleanup");
    })).rejects.toMatchObject({ code: "worktree-cleanup-child-unverifiable" });
    await wait(f.ready);
    expect(await f.attempt()).toMatchObject({ attached: false, code: "worktree-claim-busy" });
    expect(await exists(f.path)).toBe(true);
    await writeFile(f.release, "continue"); await pending; await wait(f.done);
    expect(await exists(f.gate)).toBe(true);
  } finally { await writeFile(f.release, "fixture teardown").catch(() => {}); await pending?.catch(() => {}); await f.dispose(); }
});

it("excludes a competing session at the production journal-save/remove boundary", async () => {
  const f = await fixture();
  try {
    const remote = join(f.root, "remote.git");
    await f.git(f.primary, ["clone", "--bare", f.primary, remote]);
    await f.git(f.primary, ["remote", "add", "origin", "https://github.com/timurproko/a1.git"]);
    await f.git(f.primary, ["config", `url.${remote.replaceAll("\\", "/")}.insteadOf`, "https://github.com/timurproko/a1.git"]);
    const cleanup = f.start("repository");
    expect((await once(cleanup, "message"))[0]).toMatchObject({ atRemove: true });
    expect(await f.attempt()).toMatchObject({ attached: false, code: "worktree-claim-busy" });
    const finished = once(cleanup, "message"); cleanup.send("continue");
    expect((await finished)[0].report.results[0]).toMatchObject({ disposition: "removed" });
    expect(await exists(f.path)).toBe(false);
  } finally { await f.dispose(); }
});

for (const mutation of ["recreated", "published-head", "rebound-frame"] as const) it(`rejects ${mutation} resources at the destructive descendant, after command launch`, async () => {
  const f = await fixture(false, mutation === "rebound-frame" ? "snapshot" : "");
  try {
    const holder = f.start("holder"); await wait(f.ready);
    if (mutation === "recreated") {
      await f.git(f.primary, ["worktree", "remove", f.path]);
      await f.git(f.primary, ["worktree", "add", f.path, "fix/task"]);
      expect((await f.git(f.path, ["rev-parse", "HEAD"])).stdout.trim()).toBe(f.snapshot.head);
    } else {
      const remote = join(f.root, "remote.git");
      await f.git(f.primary, ["clone", "--bare", f.primary, remote]);
      await f.git(f.primary, ["remote", "add", "origin", remote]);
      await writeFile(join(f.path, "README.md"), "new independently published work\n");
      await f.git(f.path, ["add", "."]); await f.git(f.path, ["commit", "-m", "new user work"]);
      await f.git(f.path, ["push", "origin", "fix/task"]);
      const current = (await f.git(f.path, ["rev-parse", "HEAD"])).stdout.trim();
      expect(current).not.toBe(f.snapshot.head);
      expect((await f.git(f.primary, ["ls-remote", "origin", "refs/heads/fix/task"])).stdout).toContain(current);
    }
    const before = await readFile(join(f.path, "README.md"));
    const finished = once(holder, "message"); await writeFile(f.release, "continue");
    const result = (await finished)[0];
    expect(result.finished).toBe(false);
    expect(result.stderr).toContain(mutation === "rebound-frame" ? "worktree-cleanup-reservation" : "worktree-cleanup-snapshot-changed");
    expect(await readFile(join(f.path, "README.md"))).toEqual(before); expect(await exists(f.done)).toBe(false);
  } finally { await f.dispose(); }
});

it("rejects a delegated claim-namespace change while preserving the original target", async () => {
  const f = await fixture(false, "namespace");
  try {
    const holder = f.start("holder"); await wait(f.ready);
    const finished = once(holder, "message"); await writeFile(f.release, "continue");
    const result = (await finished)[0];
    expect(result.finished).toBe(false); expect(result.stderr).toContain("worktree-cleanup-reservation");
    expect(await readFile(join(f.path, "README.md"), "utf8")).toContain("preserve");
    expect(await exists(f.done)).toBe(false);
  } finally { await f.dispose(); }
});

it("excludes a real attachment while the holder is suspended beyond the former lease", async () => {
  const f = await fixture(); let holder: ChildProcess | undefined, stopped = false;
  try {
    holder = f.start("holder"); await wait(f.ready);
    await suspend(holder.pid!, true); stopped = true;
    await delay(11_000);
    expect(await f.attempt()).toMatchObject({ attached: false, code: "worktree-claim-busy" });
    expect(await readFile(join(f.path, "README.md"), "utf8")).toContain("preserve");
    await suspend(holder.pid!, false); stopped = false;
    const finished = once(holder, "message"); await writeFile(f.release, "continue");
    expect((await finished)[0]).toMatchObject({ finished: true });
    await wait(f.done); expect(await exists(f.path)).toBe(false); expect(await exists(f.gate)).toBe(false);
  } finally { if (stopped && holder?.pid) await suspend(holder.pid, false); await f.dispose(); }
});

it("retains exclusion after holder death while its cleanup child survives", async () => {
  const f = await fixture();
  try {
    const holder = f.start("holder"); await wait(f.ready);
    const child = JSON.parse(await readFile(f.ready, "utf8")).pid as number;
    const died = once(holder, "exit"); holder.kill("SIGKILL"); await died;
    expect(() => process.kill(child, 0)).not.toThrow();
    expect(await f.attempt()).toMatchObject({ attached: false, code: "worktree-claim-busy" });
    expect(await exists(f.path)).toBe(true); expect(await exists(f.gate)).toBe(true);
    await writeFile(f.release, "continue"); await wait(f.done);
    expect(await exists(f.path)).toBe(false);
    expect(await exists(f.gate)).toBe(true); // Security: dead parents cannot certify child completion or reclaim the gate.
  } finally { await f.dispose(); }
});

it("does not release when a cleanup child dies but its tracked destructive descendant survives", async () => {
  const f = await fixture(true);
  try {
    const holder = f.start("holder"); await wait(f.ready);
    const descendant = JSON.parse(await readFile(f.ready, "utf8")) as { pid: number; parent: number };
    const finished = once(holder, "message"); process.kill(descendant.parent, "SIGKILL");
    expect((await finished)[0]).toMatchObject({ finished: false, code: "worktree-cleanup-child-unverifiable" });
    expect(() => process.kill(descendant.pid, 0)).not.toThrow();
    expect(await f.attempt()).toMatchObject({ attached: false, code: "worktree-claim-busy" });
    expect(await exists(f.path)).toBe(true);
    await writeFile(f.release, "continue"); await wait(f.done);
    expect(await exists(f.gate)).toBe(true);
  } finally { await f.dispose(); }
});
