import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PRODUCT_IDENTITY } from "../../src/product-identity.js";
import { SessionRuntimeRegistry } from "../../src/composition/session-runtime-registry.js";
import {
  readActiveSessionRepositoryContext, registerSessionRepositoryRuntime, setSessionRepositoryContext,
} from "../../src/foundation/lifecycle/session-repository-context.js";
import { createSessionWorktreeTools } from "../../src/integrations/pi/engine/worktree-tools.js";

const execute = promisify(execFile);
const roots: string[] = [];
const registries: SessionRuntimeRegistry[] = [];
vi.setConfig({ testTimeout: 30_000 });
afterEach(async () => {
  await Promise.all(registries.splice(0).map(registry => registry.dispose()));
  vi.unstubAllEnvs();
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true, maxRetries: 5 })));
});

async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), "a1-explicit-detach-"))); roots.push(root);
  const primary = join(root, "primary"), task = join(root, "task"), foreignTask = join(root, "other"), home = join(root, "home"), dataDir = join(root, "data");
  await mkdir(home);
  vi.stubEnv(PRODUCT_IDENTITY.environment.dataDir, dataDir);
  const git = async (...args: string[]) => (await execute("git", args, { cwd: root, encoding: "utf8" })).stdout.trim();
  await git("init", "-b", "develop", primary);
  await git("-C", primary, "config", "core.autocrlf", "false");
  await writeFile(join(primary, "note.txt"), "task data\n");
  await git("-C", primary, "add", ".");
  await git("-C", primary, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-m", "fixture");
  await git("-C", primary, "worktree", "add", "-b", "fix/task", task);
  await git("-C", primary, "worktree", "add", "-b", "fix/other", foreignTask);
  await writeFile(join(home, "note.txt"), "original home\n");
  const session = async (sessionId: string) => {
    const identity = { sessionId, sessionFile: join(root, `${sessionId}.jsonl`) };
    await writeFile(identity.sessionFile, JSON.stringify({ type: "session", id: sessionId, cwd: primary }) + "\n");
    return identity;
  };
  const identity = await session("session-one"), foreign = await session("session-two");
  const inspectProcess = async (pid: number) => ({ pid, startIdentity: "fixture" });
  const options = { dataDir, runtimeId: "runtime-one", inspectProcess };
  const foreignOptions = { ...options, runtimeId: "runtime-two" };
  await registerSessionRepositoryRuntime(identity, options.runtimeId, { pid: process.pid, startIdentity: "fixture" }, options);
  await registerSessionRepositoryRuntime(foreign, foreignOptions.runtimeId, { pid: 1002, startIdentity: "fixture" }, foreignOptions);
  await setSessionRepositoryContext(identity, task, options);
  await setSessionRepositoryContext(foreign, foreignTask, foreignOptions);
  const registry = new SessionRuntimeRegistry({ runtimeId: options.runtimeId, inspectProcess }); registries.push(registry);
  const reader = registry.toolReaderFor(undefined);
  const tools = createSessionWorktreeTools(primary,
    signal => reader(identity.sessionId, identity.sessionFile, signal ?? new AbortController().signal), undefined,
    signal => reader.detach(identity.sessionId, identity.sessionFile, signal ?? new AbortController().signal));
  const call = (name: string, params: unknown = {}, signal?: AbortSignal) => tools.find(tool => tool.name === name)!.execute("fixture", params, signal, undefined, {} as never);
  const directory = join(dataDir, "session-repositories");
  const records = await Promise.all((await readdir(directory)).map(async name => ({ path: join(directory, name), value: JSON.parse(await readFile(join(directory, name), "utf8")) })));
  const ownRecord = records.find(record => record.value.sessionId === identity.sessionId)!;
  const poisonStartup = async () => {
    await writeFile(identity.sessionFile, JSON.stringify({ type: "session", id: identity.sessionId, cwd: home }) + "\n");
    await writeFile(ownRecord.path, JSON.stringify({ ...ownRecord.value, startupRoot: task }) + "\n");
  };
  const foreignClaim = async () => {
    const directory = join(dataDir, "session-worktree-claims", "worktrees");
    const entries = await Promise.all((await readdir(directory)).map(async name => await readFile(join(directory, name), "utf8")));
    return entries.find(text => JSON.parse(text).runtimeId === foreignOptions.runtimeId);
  };
  return { primary, task, foreignTask, home, identity, foreign, options, foreignOptions, call, reader, poisonStartup, ownRecord, foreignClaim };
}

describe("owner-verified explicit worktree recovery", () => {
  it("recovers the reported poisoned startup state after all ordinary tools fail, without silently redirecting writes", async () => {
    const f = await fixture();
    const signal = new AbortController().signal;
    expect(await f.reader(f.identity.sessionId, f.identity.sessionFile, signal)).toBe(f.task);
    const foreignClaim = await f.foreignClaim();
    await f.poisonStartup();
    const header = await readFile(f.identity.sessionFile, "utf8");
    await expect(f.call("write", { path: "note.txt", content: "must not execute" })).rejects.toThrow("not a git repository");
    await expect(f.call("bash", { command: "a1 worktree detach" })).rejects.toThrow("not a git repository");
    await expect(f.call("read", { path: join(f.home, "note.txt") })).rejects.toThrow("not a git repository");
    expect(await readFile(join(f.home, "note.txt"), "utf8")).toBe("original home\n");
    expect(await readFile(join(f.task, "note.txt"), "utf8")).toBe("task data\n");
    expect(await f.call("worktree_detach")).toMatchObject({ details: { cwd: f.home } });
    await expect(readFile(f.ownRecord.path)).rejects.toMatchObject({ code: "ENOENT" });
    expect(await f.foreignClaim()).toBe(foreignClaim);
    await expect(readActiveSessionRepositoryContext(f.foreign, f.foreignOptions)).resolves.toMatchObject({ cwd: f.foreignTask });
    expect((await f.call("read", { path: "note.txt" })).content).toContainEqual(expect.objectContaining({ text: "original home\n" }));
    await f.call("write", { path: "after.txt", content: "explicitly detached" });
    expect(await readFile(join(f.home, "after.txt"), "utf8")).toBe("explicitly detached");
    expect(await readFile(f.identity.sessionFile, "utf8")).toBe(header);
    expect(await readFile(join(f.task, "note.txt"), "utf8")).toBe("task data\n");
  });

  it("detaches poisoned state before activation while preserving another runtime's claim", async () => {
    const f = await fixture();
    await f.poisonStartup();
    const before = await f.foreignClaim();
    expect(await f.call("worktree_detach")).toMatchObject({ details: { cwd: f.home } });
    expect(await f.foreignClaim()).toBe(before);
    expect(await f.reader(f.identity.sessionId, f.identity.sessionFile, new AbortController().signal)).toBe(f.home);
    expect(await readFile(join(f.task, "note.txt"), "utf8")).toBe("task data\n");
  });

  it("clears an unreadable association explicitly and leaves cancelled recovery unchanged", async () => {
    const f = await fixture();
    await writeFile(f.ownRecord.path, "invalid association");
    const controller = new AbortController(); controller.abort();
    await expect(f.call("worktree_detach", {}, controller.signal)).rejects.toThrow();
    expect(await readFile(f.ownRecord.path, "utf8")).toBe("invalid association");
    const before = await f.foreignClaim();
    expect(await f.call("worktree_detach")).toMatchObject({ details: { cwd: f.primary } });
    expect(await f.foreignClaim()).toBe(before);
    await expect(readActiveSessionRepositoryContext(f.foreign, f.foreignOptions)).resolves.toMatchObject({ cwd: f.foreignTask });
  });
});
