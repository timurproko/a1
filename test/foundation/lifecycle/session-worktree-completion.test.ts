import { execFile, spawn } from "node:child_process";
import { access, mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
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
  readActiveSessionRepositoryContext, registerSessionRepositoryRuntime, setSessionRepositoryContext,
} from "../../../src/foundation/lifecycle/session-repository-context.js";
import {
  describeWorktreeCompletion, requestSessionWorktreeCompletion, settleSessionWorktreeCompletion,
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
      ? template : JSON.stringify({ cleanup: template.split(" ").map(part => part === "{script}" ? script : part) }));
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

describe("worktree completion", () => {
  it("ignores a declaration that exists only in the task checkout being left", async () => {
    const fixture = await attachedFixture();
    await mkdir(join(fixture.worktree, ".a1"));
    await writeFile(join(fixture.worktree, ".a1", "worktree.json"), JSON.stringify({ cleanup: ["node", "-e", "process.exit(0)"] }));
    await execute("git", ["-C", fixture.worktree, "add", ".a1"]);
    await execute("git", ["-C", fixture.worktree, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "commit", "-m", "task-only declaration"]);
    await requestSessionWorktreeCompletion(fixture.identity, {}, fixture.options);
    await expect(settleSessionWorktreeCompletion(fixture.identity, fixture.options)).resolves.toMatchObject({ kind: "cleanup-unavailable" });
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

  it("detaches and reports cleanup unavailable without a configured command or a required selector", async () => {
    const bare = await attachedFixture();
    await requestSessionWorktreeCompletion(bare.identity, {}, bare.options);
    await expect(settleSessionWorktreeCompletion(bare.identity, bare.options)).resolves.toMatchObject({
      kind: "cleanup-unavailable", detail: expect.stringContaining(".a1/worktree.json"),
    });
    expect(await exists(bare.worktree)).toBe(true);
    for (const malformed of ["broken", JSON.stringify({ cleanup: "node cleanup.cjs" }), JSON.stringify({ cleanup: [] })]) {
      const invalid = await attachedFixture(malformed);
      await requestSessionWorktreeCompletion(invalid.identity, {}, invalid.options);
      await expect(settleSessionWorktreeCompletion(invalid.identity, invalid.options)).resolves.toMatchObject({
        kind: "cleanup-unavailable", detail: expect.stringContaining("must hold"),
      });
      expect(await exists(invalid.worktree)).toBe(true);
    }
    const selective = await attachedFixture(`${REMOVE} {pr}`);
    await requestSessionWorktreeCompletion(selective.identity, { change: "example-change" }, selective.options);
    await expect(settleSessionWorktreeCompletion(selective.identity, selective.options)).resolves.toMatchObject({
      kind: "cleanup-unavailable", detail: expect.stringContaining("{pr}"),
    });
    expect(await exists(selective.worktree)).toBe(true);
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

  // Platform: a process started in a directory pins it; other platforms allow the removal and prove nothing here.
  it.skipIf(process.platform !== "win32")("retains a checkout pinned by a process started inside it and leaves the session detached", async () => {
    const fixture = await attachedFixture(REMOVE);
    const holder = spawn(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { cwd: fixture.worktree, stdio: "ignore", windowsHide: true });
    try {
      await new Promise(resolve => setTimeout(resolve, 1_000));
      await requestSessionWorktreeCompletion(fixture.identity, {}, fixture.options);
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
