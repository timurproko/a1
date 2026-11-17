import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { mkdir, mkdtemp, readFile, rm, symlink, utimes, writeFile } from "node:fs/promises";
import lockfile from "proper-lockfile";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readClaimGate, retryClaimGateContention } from "../../../src/foundation/lifecycle/claim-gate-core.mjs";
import { tryAcquireClaimGate } from "../../../src/foundation/lifecycle/claim-gate.js";
import { PID_LIVENESS_IDENTITY, inspectLiveProcess } from "../../../src/foundation/lifecycle/process-liveness.js";

const roots: string[] = [], workers: ChildProcess[] = [];
async function lockDatabase(path: string, mode = "hold") {
  const child = spawn(process.execPath, [fileURLToPath(new URL("../../fixtures/claim-gate-contention-worker.mjs", import.meta.url)), mode, path], { stdio: ["ignore", "ignore", "ignore", "ipc"] });
  workers.push(child); expect((await once(child, "message"))[0]).toEqual({ locked: true });
  return async () => { const closed = once(child, "close"); child.send("commit"); await closed; };
}
afterEach(async () => {
  for (const child of workers.splice(0)) if (child.exitCode === null && child.signalCode === null) { const closed = once(child, "close"); child.kill(); await closed; }
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe("worktree claim gate", () => {
  it("admits one holder at a time and reports contention as null", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-claim-gate-")); roots.push(root);
    const authority = join(root, "mutation.authority");
    const first = tryAcquireClaimGate(authority);
    expect(first).not.toBeNull();
    expect(tryAcquireClaimGate(authority)).toBeNull();
    first!.release();
    first!.release();
    const second = tryAcquireClaimGate(authority);
    expect(second).not.toBeNull();
    second!.release();
  });
});

it.skipIf(process.platform !== "win32" || process.arch !== "x64").each(["hold", "read"])("keeps synchronous release retryable after a real SQLite %s conflict", async mode => {
  const root = await mkdtemp(join(tmpdir(), "claim-gate-release-contention-")); roots.push(root);
  const authority = join(root, "authority"), held = tryAcquireClaimGate(authority)!;
  const commit = await lockDatabase(held.path, mode);
  expect(() => held.release()).toThrow("database is locked");
  await commit();
  expect(readClaimGate(held.path)?.nonce).toBe(held.nonce);
  held.release(); held.release();
  expect(readClaimGate(held.path)).toBeNull();
  const successor = tryAcquireClaimGate(authority)!; expect(successor).not.toBeNull(); successor.release();
}, 30_000);

it.skipIf(process.platform !== "win32")("retries binding and retirement without treating contention as completion", async () => {
  const root = await mkdtemp(join(tmpdir(), "claim-gate-binding-contention-")); roots.push(root);
  const authority = join(root, "authority"), held = tryAcquireClaimGate(authority)!;
  const commit = await lockDatabase(held.path); let bound = false;
  const binding = retryClaimGateContention(() => held.bind("a".repeat(64))).then(() => { bound = true; });
  await delay(50); expect(bound).toBe(false); await commit(); await binding;
  expect(readClaimGate(held.path)?.binding).toBe("a".repeat(64));
  expect(() => held.bind("b".repeat(64))).toThrow("binding is unavailable");
  const unlock = await lockDatabase(held.path); let released = false;
  const retirement = retryClaimGateContention(() => held.release()).then(() => { released = true; });
  await delay(50); expect(released).toBe(false); await unlock(); await retirement;
  expect(readClaimGate(held.path)).toBeNull();
}, 30_000);

it("does not let a legacy lease writer reclaim the new gate even with an old timestamp", async () => {
  const root = await mkdtemp(join(tmpdir(), "claim-gate-legacy-")); roots.push(root);
  const authority = join(root, "mutation.authority"), held = tryAcquireClaimGate(authority)!;
  try {
    const old = new Date(Date.now() - 60_000); await utimes(`${authority}.gate`, old, old);
    expect(() => lockfile.lockSync(authority, { realpath: false, lockfilePath: `${authority}.gate`, stale: 10_000 })).toThrow();
    expect(tryAcquireClaimGate(authority)).toBeNull();
  } finally { held.release(); }
  const next = tryAcquireClaimGate(authority); expect(next).not.toBeNull(); next!.release();
});

it("seals one approval binding per gate generation", async () => {
  const root = await mkdtemp(join(tmpdir(), "claim-gate-binding-")); roots.push(root);
  const authority = join(root, "mutation.authority"), held = tryAcquireClaimGate(authority)!;
  try {
    held.bind("a".repeat(64));
    expect(() => held.bind("b".repeat(64))).toThrow("binding is unavailable");
    expect(readClaimGate(`${authority}.gate`)!.binding).toBe("a".repeat(64));
    expect(tryAcquireClaimGate(authority)).toBeNull();
  } finally { held.release(); }
  const next = tryAcquireClaimGate(authority)!;
  next.bind("b".repeat(64)); next.release();
});

it("retains authority rather than following linked child metadata", async () => {
  const root = await mkdtemp(join(tmpdir(), "claim-gate-link-")); roots.push(root);
  const authority = join(root, "mutation.authority"), external = join(root, "external"), held = tryAcquireClaimGate(authority)!;
  await mkdir(external); await writeFile(join(external, "sentinel"), "retain");
  await symlink(external, `${authority}.gate.children`, process.platform === "win32" ? "junction" : "dir");
  expect(() => held.release()).toThrow(expect.objectContaining({ code: process.platform === "win32" ? "worktree-gate-unverifiable" : "worktree-coordination-boundary" }));
  if (process.platform === "win32" && process.arch === "x64") await expect(retryClaimGateContention(() => held.release())).rejects.toMatchObject({ code: "worktree-gate-unverifiable" });
  expect(tryAcquireClaimGate(authority)).toBeNull(); expect(await readFile(join(external, "sentinel"), "utf8")).toBe("retain");
});

describe("process liveness", () => {
  it("observes this process and rejects pids that cannot exist", async () => {
    await expect(inspectLiveProcess(process.pid)).resolves.toEqual({ pid: process.pid, startIdentity: PID_LIVENESS_IDENTITY });
    await expect(inspectLiveProcess(0)).resolves.toBeNull();
    await expect(inspectLiveProcess(-1)).resolves.toBeNull();
    await expect(inspectLiveProcess(2 ** 31 - 2)).resolves.toBeNull();
  });
});
