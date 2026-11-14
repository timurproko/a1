import { execFile, spawn } from "node:child_process";
import { access, mkdir, mkdtemp, readdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/foundation/lifecycle/native-claim-gate.js", () => {
  const held = new Set<string>();
  return { tryAcquireClaimGate: (path: string) => {
    if (held.has(path)) return null;
    held.add(path);
    return { release: () => { held.delete(path); } };
  } };
});
import {
  readActiveSessionRepositoryContext, readSessionStartupRoot, registerSessionRepositoryRuntime, setSessionRepositoryContext, sessionWorktreeCompletionPath,
} from "../../../src/foundation/lifecycle/session-repository-context.js";
import {
  describeWorktreeCompletion, requestSessionWorktreeCompletion, requestSessionWorktreeLocalRemoval, settleSessionWorktreeCompletion,
} from "../../../src/foundation/lifecycle/session-worktree-completion.js";

const execute = promisify(execFile);
const roots: string[] = [];
// Performance: every case builds real Git repositories; a loaded runner needs more than the default limit.
vi.setConfig({ testTimeout: 30_000 });
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }))); });
const exists = (path: string) => access(path).then(() => true, () => false);

/** A stand-in repository cleanup: non-force Git removal that prints what it was asked to do. */
const CLEANUP = `
const { execFileSync } = require("node:child_process");
const [primary, worktree, ...rest] = process.argv.slice(2);
if (rest.includes("fail")) { console.log(JSON.stringify({ disposition: "blocked", reason: "fixture-blocker" })); process.exit(1); }
execFileSync("git", ["-C", primary, "worktree", "remove", worktree], { stdio: "pipe" });
console.log(JSON.stringify({ disposition: "removed", cwd: process.cwd(), rest }));
`;

async function attachedFixture(template?: string) {
  const root = await mkdtemp(join(tmpdir(), "a1-worktree-completion-")); roots.push(root);
  const primary = join(root, "primary"), worktree = join(root, "task"), dataDir = join(root, "data"), script = join(root, "cleanup.cjs");
  await writeFile(script, CLEANUP);
  await execute("git", ["init", "-b", "develop", primary]);
  await writeFile(join(primary, "README.md"), "fixture\n");
  await execute("git", ["-C", primary, "add", "."]);
  await execute("git", ["-C", primary, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "commit", "-m", "fixture"]);
  await execute("git", ["-C", primary, "worktree", "add", "-b", "fix/task", worktree]);
  if (template !== undefined) {
    await mkdir(join(primary, ".a1"));
    await writeFile(join(primary, ".a1", "worktree.json"), template.startsWith("{") || template === "broken"
      ? template : JSON.stringify({ cleanup: template.split(" ").map(part => part === "{script}" ? script : part),
        cleanupPreflight: ["node", "-e", "console.log(JSON.stringify({operation:'preservation-preflight',preflight:true,results:[{path:process.argv[1],disposition:'eligible'}]}))", "{worktree}"] }));
    await execute("git", ["-C", primary, "add", ".a1"]);
    await execute("git", ["-C", primary, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "commit", "-m", "declare cleanup"]);
    await execute("git", ["-C", worktree, "merge", "--ff-only", "develop"]);
  }
  const session = async (id: string) => {
    const identity = { sessionId: id, sessionFile: join(root, `${id}.jsonl`) };
    await writeFile(identity.sessionFile, `${JSON.stringify({ type: "session", version: 3, id, cwd: primary })}\n`);
    return identity;
  };
  const inspectProcess = async (pid: number) => ({ pid, startIdentity: `fixture:${pid}` });
  const identity = await session("session-one"), other = await session("session-two");
  const options = { dataDir, runtimeId: "runtime-one", inspectProcess };
  const otherOptions = { dataDir, runtimeId: "runtime-two", inspectProcess };
  await registerSessionRepositoryRuntime(identity, "runtime-one", { pid: 1001, startIdentity: "fixture:1001" }, { dataDir, inspectProcess });
  await registerSessionRepositoryRuntime(other, "runtime-two", { pid: 1002, startIdentity: "fixture:1002" }, { dataDir, inspectProcess });
  await setSessionRepositoryContext(identity, worktree, options);
  return { root, primary, worktree, dataDir, identity, other, options, otherOptions };
}

const REMOVE = "node {script} {primary} {worktree}";

function localRemovalTemplate(disposition = "eligible"): string {
  const preflight = `console.log(JSON.stringify({operation: 'remove-local', preflight: true, results: [{path: process.argv[1], disposition: '${disposition}', reason: 'fixture-preservation-blocker'}]})); ${disposition === "eligible" ? "" : "process.exit(1);"}`;
  const remove = "require('node:child_process').execFileSync('git', ['-C', process.argv[1], 'worktree', 'remove', process.argv[2]], {stdio: 'pipe'}); console.log(JSON.stringify({disposition: 'removed'}));";
  return JSON.stringify({ localRemoval: { preflight: ["node", "-e", preflight, "{worktree}"], execute: ["node", "-e", remove, "{primary}", "{worktree}"] } });
}

describe("worktree completion", () => {
  it("ignores a declaration that exists only in the task checkout being left", async () => {
    const fixture = await attachedFixture();
    await mkdir(join(fixture.worktree, ".a1"));
    await writeFile(join(fixture.worktree, ".a1", "worktree.json"), JSON.stringify({ cleanup: ["node", "-e", "process.exit(0)"] }));
    await execute("git", ["-C", fixture.worktree, "add", ".a1"]);
    await execute("git", ["-C", fixture.worktree, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "commit", "-m", "task-only declaration"]);
    await expect(requestSessionWorktreeCompletion(fixture.identity, {}, fixture.options)).rejects.toMatchObject({ code: "worktree-completion-unavailable" });
    await expect(settleSessionWorktreeCompletion(fixture.identity, fixture.options)).resolves.toBeNull();
    await expect(readActiveSessionRepositoryContext(fixture.identity, fixture.options)).resolves.toMatchObject({ branch: "fix/task" });
    expect(await exists(fixture.worktree)).toBe(true);
  });

  it("detaches before the configured cleanup runs from primary and settles the request once", async () => {
    const fixture = await attachedFixture(`${REMOVE} {branch} {change} {pr}`);
    const request = await requestSessionWorktreeCompletion(fixture.identity, { change: "example-change", pr: 12 }, fixture.options);
    expect(request.branch).toBe("fix/task");
    await expect(readActiveSessionRepositoryContext(fixture.identity, fixture.options)).resolves.toBeNull();
    expect(await readdir(join(fixture.dataDir, "session-worktree-claims", "worktrees"))).toHaveLength(0);
    expect(await exists(fixture.worktree)).toBe(true);
    const result = await settleSessionWorktreeCompletion(fixture.identity, fixture.options);
    expect(result).toMatchObject({ kind: "cleanup-finished", branch: "fix/task" });
    const report = JSON.parse(result!.detail) as { disposition: string; cwd: string; rest: string[] };
    expect(report.disposition).toBe("removed");
    expect(report.cwd.toLowerCase()).toBe(result!.startupRoot.toLowerCase());
    expect(report.rest).toEqual(["fix/task", "example-change", "12"]);
    expect(await exists(fixture.worktree)).toBe(false);
    expect(describeWorktreeCompletion(result!)).toMatch(/cleanup-finished.*authoritative/su);
    await expect(settleSessionWorktreeCompletion(fixture.identity, fixture.options)).resolves.toBeNull();
  });

  it("stays attached when the checkout holds unpublished content, is locked, or nothing is attached", async () => {
    const fixture = await attachedFixture(REMOVE);
    await writeFile(join(fixture.worktree, "draft.txt"), "unpublished");
    await expect(requestSessionWorktreeCompletion(fixture.identity, {}, fixture.options))
      .rejects.toMatchObject({ code: "worktree-content", message: expect.stringContaining("draft.txt") });
    await rm(join(fixture.worktree, "draft.txt"));
    await execute("git", ["-C", fixture.primary, "worktree", "lock", fixture.worktree]);
    await expect(requestSessionWorktreeCompletion(fixture.identity, {}, fixture.options)).rejects.toMatchObject({ code: "worktree-git-locked" });
    await expect(readActiveSessionRepositoryContext(fixture.identity, fixture.options)).resolves.toMatchObject({ branch: "fix/task" });
    await expect(settleSessionWorktreeCompletion(fixture.identity, fixture.options)).resolves.toBeNull();
    await expect(requestSessionWorktreeCompletion(fixture.other, {}, fixture.otherOptions)).rejects.toMatchObject({ code: "worktree-not-attached" });
    await expect(requestSessionWorktreeCompletion(fixture.identity, { change: "Not A Change" }, fixture.options))
      .rejects.toMatchObject({ code: "worktree-completion-selector" });
    expect(await exists(fixture.worktree)).toBe(true);
  });

  it("retains attachment without a compatible preflight/command or required selector", async () => {
    const bare = await attachedFixture();
    await expect(requestSessionWorktreeCompletion(bare.identity, {}, bare.options)).rejects.toMatchObject({ code: "worktree-completion-unavailable" });
    await expect(settleSessionWorktreeCompletion(bare.identity, bare.options)).resolves.toBeNull();
    await expect(readActiveSessionRepositoryContext(bare.identity, bare.options)).resolves.toMatchObject({ branch: "fix/task" });
    expect(await exists(bare.worktree)).toBe(true);
    for (const malformed of ["broken", JSON.stringify({ cleanup: "node cleanup.cjs" }), JSON.stringify({ cleanup: [] })]) {
      const invalid = await attachedFixture(malformed);
      await expect(requestSessionWorktreeCompletion(invalid.identity, {}, invalid.options)).rejects.toMatchObject({ code: "worktree-completion-unavailable" });
      await expect(settleSessionWorktreeCompletion(invalid.identity, invalid.options)).resolves.toBeNull();
      await expect(readActiveSessionRepositoryContext(invalid.identity, invalid.options)).resolves.toMatchObject({ branch: "fix/task" });
      expect(await exists(invalid.worktree)).toBe(true);
    }
    const selective = await attachedFixture(`${REMOVE} {pr}`);
    await expect(requestSessionWorktreeCompletion(selective.identity, { change: "example-change" }, selective.options)).rejects.toMatchObject({
      code: "worktree-completion-unavailable", message: expect.stringContaining("{pr}"),
    });
    await expect(readActiveSessionRepositoryContext(selective.identity, selective.options)).resolves.toMatchObject({ branch: "fix/task" });
    await expect(settleSessionWorktreeCompletion(selective.identity, selective.options)).resolves.toBeNull();
    expect(await exists(selective.worktree)).toBe(true);
  });

  it("runs merged preservation preflight while attached and retains the attachment on its blocker", async () => {
    const fixture = await attachedFixture(REMOVE);
    const run = vi.fn(async () => {
      expect(await readActiveSessionRepositoryContext(fixture.identity, fixture.options)).toMatchObject({ branch: "fix/task" });
      return JSON.stringify({ operation: "preservation-preflight", preflight: true, results: [{ path: fixture.worktree, disposition: "blocked", reason: "unknown-ignored-content" }] });
    });
    await expect(requestSessionWorktreeCompletion(fixture.identity, {}, { ...fixture.options, run })).rejects.toMatchObject({
      code: "worktree-completion-preflight", message: expect.stringContaining("unknown-ignored-content"),
    });
    expect(run).toHaveBeenCalledTimes(1);
    expect(await readActiveSessionRepositoryContext(fixture.identity, fixture.options)).toMatchObject({ branch: "fix/task" });
    expect(await settleSessionWorktreeCompletion(fixture.identity, fixture.options)).toBeNull();
    expect(await exists(fixture.worktree)).toBe(true);
  });

  it("reads legacy pending records without executing cleanup lacking a preflight binding", async () => {
    const fixture = await attachedFixture(REMOVE);
    await requestSessionWorktreeCompletion(fixture.identity, {}, fixture.options);
    const path = sessionWorktreeCompletionPath(fixture.identity, fixture.options);
    const record = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
    delete record.adapterDigest; await writeFile(path, JSON.stringify(record));
    const run = vi.fn();
    expect(await settleSessionWorktreeCompletion(fixture.identity, { ...fixture.options, run })).toMatchObject({ kind: "cleanup-unavailable" });
    expect(run).not.toHaveBeenCalled(); expect(await exists(fixture.worktree)).toBe(true);
  });

  it("reports a failed cleanup with the command's output and never as removal", async () => {
    const fixture = await attachedFixture(`${REMOVE} fail`);
    await requestSessionWorktreeCompletion(fixture.identity, {}, fixture.options);
    const result = await settleSessionWorktreeCompletion(fixture.identity, fixture.options);
    expect(result).toMatchObject({ kind: "cleanup-failed", detail: expect.stringContaining("fixture-blocker") });
    expect(describeWorktreeCompletion(result!)).not.toMatch(/removed|authoritative/u);
    expect(await exists(fixture.worktree)).toBe(true);
    await expect(readActiveSessionRepositoryContext(fixture.identity, fixture.options)).resolves.toBeNull();
  });

  it("skips cleanup when another live session attached the checkout or the request expired", async () => {
    const claimed = await attachedFixture(REMOVE);
    await requestSessionWorktreeCompletion(claimed.identity, {}, claimed.options);
    await setSessionRepositoryContext(claimed.other, claimed.worktree, claimed.otherOptions);
    await expect(settleSessionWorktreeCompletion(claimed.identity, claimed.options)).resolves.toMatchObject({
      kind: "cleanup-skipped", detail: expect.stringContaining("attached the checkout again"),
    });
    expect(await exists(claimed.worktree)).toBe(true);
    await expect(readActiveSessionRepositoryContext(claimed.other, claimed.otherOptions)).resolves.toMatchObject({ branch: "fix/task" });
    const expired = await attachedFixture(REMOVE);
    await requestSessionWorktreeCompletion(expired.identity, {}, expired.options);
    await expect(settleSessionWorktreeCompletion(expired.identity, { ...expired.options, now: () => Date.now() + 6 * 60_000 }))
      .resolves.toMatchObject({ kind: "cleanup-skipped", detail: expect.stringContaining("expired") });
    expect(await exists(expired.worktree)).toBe(true);
    await expect(settleSessionWorktreeCompletion(expired.identity, expired.options)).resolves.toBeNull();
  });

  it("C40: missing exact local-removal support keeps attachment without substituting merged completion", async () => {
    const fixture = await attachedFixture(REMOVE), run = vi.fn();
    await expect(requestSessionWorktreeLocalRemoval(fixture.identity, { ...fixture.options, run })).rejects.toMatchObject({ code: "worktree-local-removal-unavailable" });
    expect(run).not.toHaveBeenCalled();
    expect(await exists(fixture.worktree)).toBe(true);
    expect(await readActiveSessionRepositoryContext(fixture.identity, fixture.options)).toMatchObject({ branch: "fix/task" });
    expect(await settleSessionWorktreeCompletion(fixture.identity, { ...fixture.options, run })).toBeNull();
  });

  it("retains attachment and reports the actual local-removal preflight blocker", async () => {
    const fixture = await attachedFixture(localRemovalTemplate("blocked"));
    await expect(requestSessionWorktreeLocalRemoval(fixture.identity, fixture.options)).rejects.toMatchObject({
      code: "worktree-local-removal-preflight", message: expect.stringContaining("fixture-preservation-blocker"),
    });
    expect(await readActiveSessionRepositoryContext(fixture.identity, fixture.options)).toMatchObject({ branch: "fix/task" });
    expect(await exists(fixture.worktree)).toBe(true);
  });

  it("runs local-removal preflight before detach and the exact adapter only at settlement", async () => {
    const fixture = await attachedFixture(localRemovalTemplate());
    const request = await requestSessionWorktreeLocalRemoval(fixture.identity, fixture.options);
    expect(request.operation).toBe("remove-local");
    expect(await readActiveSessionRepositoryContext(fixture.identity, fixture.options)).toBeNull();
    expect(await exists(fixture.worktree)).toBe(true);
    const result = await settleSessionWorktreeCompletion(fixture.identity, fixture.options);
    expect(result).toMatchObject({ operation: "remove-local", kind: "cleanup-finished" });
    expect(await exists(fixture.worktree)).toBe(false);
    expect(describeWorktreeCompletion(result!)).toContain("local removal");
    expect(await settleSessionWorktreeCompletion(fixture.identity, fixture.options)).toBeNull();
  });

  it("C39: ownership appearing after detach retains both target and unrelated checkout outside a usable session", async () => {
    const fixture = await attachedFixture(localRemovalTemplate());
    const unrelated = join(fixture.root, "unrelated");
    await execute("git", ["-C", fixture.primary, "worktree", "add", "-b", "fix/unrelated", unrelated]);
    await requestSessionWorktreeLocalRemoval(fixture.identity, fixture.options);
    await setSessionRepositoryContext(fixture.other, fixture.worktree, fixture.otherOptions);
    const run = vi.fn();
    expect(await settleSessionWorktreeCompletion(fixture.identity, { ...fixture.options, run })).toMatchObject({ kind: "cleanup-skipped" });
    expect(run).not.toHaveBeenCalled();
    expect(await exists(fixture.worktree)).toBe(true); expect(await exists(unrelated)).toBe(true);
    expect(await readActiveSessionRepositoryContext(fixture.identity, fixture.options)).toBeNull();
    expect((await readSessionStartupRoot(fixture.identity)).toLowerCase()).toBe((await realpath(fixture.primary)).toLowerCase());
  });

  it("does not execute a changed local-removal adapter after leaving the checkout", async () => {
    const fixture = await attachedFixture(localRemovalTemplate());
    await requestSessionWorktreeLocalRemoval(fixture.identity, fixture.options);
    await writeFile(join(fixture.primary, ".a1", "worktree.json"), localRemovalTemplate("blocked"));
    const run = vi.fn();
    expect(await settleSessionWorktreeCompletion(fixture.identity, { ...fixture.options, run })).toMatchObject({ kind: "cleanup-unavailable" });
    expect(run).not.toHaveBeenCalled(); expect(await exists(fixture.worktree)).toBe(true);
  });

  // Platform: a process started in a directory pins it; other platforms allow the removal and prove nothing here.
  it.skipIf(process.platform !== "win32")("retains a checkout pinned by a process started inside it and leaves the session detached", async () => {
    const fixture = await attachedFixture(REMOVE);
    await requestSessionWorktreeCompletion(fixture.identity, {}, fixture.options);
    const holder = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { cwd: fixture.worktree, stdio: "ignore", windowsHide: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 1_000));
      const result = await settleSessionWorktreeCompletion(fixture.identity, fixture.options);
      expect(result?.kind).toBe("cleanup-failed");
      expect(await exists(fixture.worktree)).toBe(true);
      await expect(readActiveSessionRepositoryContext(fixture.identity, fixture.options)).resolves.toBeNull();
    } finally {
      const exited = new Promise(resolve => holder.once("exit", resolve));
      holder.kill();
      await exited;
    }
  });
});
