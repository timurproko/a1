import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
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
  clearSessionRepositoryContext,
  readActiveSessionRepositoryContext,
  registerSessionRepositoryRuntime,
  releaseInvalidSessionRepositoryContext,
  setSessionRepositoryContext,
} from "../../../src/foundation/lifecycle/session-repository-context.js";

const execute = promisify(execFile);
const roots: string[] = [];
// Performance: every case builds real Git repositories; a loaded runner needs more than the default limit.
vi.setConfig({ testTimeout: 30_000 });
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true, maxRetries: 5 }))); });

async function attachedFixture() {
  const root = await mkdtemp(join(tmpdir(), "a1-attachment-recovery-")); roots.push(root);
  const primary = join(root, "primary"), worktree = join(root, "task"), other = join(root, "other"), dataDir = join(root, "data");
  await execute("git", ["init", "-b", "develop", primary]);
  await writeFile(join(primary, "README.md"), "fixture\n");
  await execute("git", ["-C", primary, "add", "."]);
  await execute("git", ["-C", primary, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "commit", "-m", "fixture"]);
  await execute("git", ["-C", primary, "worktree", "add", "-b", "fix/task", worktree]);
  await execute("git", ["-C", primary, "worktree", "add", "-b", "fix/other", other]);
  const session = async (id: string) => {
    const identity = { sessionId: id, sessionFile: join(root, `${id}.jsonl`) };
    await writeFile(identity.sessionFile, `${JSON.stringify({ type: "session", version: 3, id, cwd: primary })}\n`);
    return identity;
  };
  const inspectProcess = async (pid: number) => ({ pid, startIdentity: `fixture:${pid}` });
  const identity = await session("session-one"), foreign = await session("session-two");
  const options = { dataDir, runtimeId: "runtime-one", inspectProcess };
  const foreignOptions = { dataDir, runtimeId: "runtime-two", inspectProcess };
  await registerSessionRepositoryRuntime(identity, "runtime-one", { pid: 1001, startIdentity: "fixture:1001" }, { dataDir, inspectProcess });
  await registerSessionRepositoryRuntime(foreign, "runtime-two", { pid: 1002, startIdentity: "fixture:1002" }, { dataDir, inspectProcess });
  await setSessionRepositoryContext(identity, worktree, options);
  await setSessionRepositoryContext(foreign, other, foreignOptions);
  const claims = () => readdir(join(dataDir, "session-worktree-claims", "worktrees"));
  return { root, primary, worktree, other, dataDir, identity, foreign, options, foreignOptions, claims };
}

describe("invalid attachment recovery", () => {
  it.each([
    ["a missing directory", async (fixture: Awaited<ReturnType<typeof attachedFixture>>) => { await rm(fixture.worktree, { recursive: true, force: true }); }],
    ["a missing Git pointer", async (fixture: Awaited<ReturnType<typeof attachedFixture>>) => { await rm(join(fixture.worktree, ".git")); }],
    ["a replaced worktree identity", async (fixture: Awaited<ReturnType<typeof attachedFixture>>) => {
      await rm(fixture.worktree, { recursive: true, force: true });
      await execute("git", ["-C", fixture.primary, "worktree", "prune"]);
      await execute("git", ["init", "-b", "fix/task", fixture.worktree]);
    }],
  ])("releases only the session's own association and claim for %s", async (_name, damage) => {
    const fixture = await attachedFixture();
    await damage(fixture);
    await expect(readActiveSessionRepositoryContext(fixture.identity, fixture.options))
      .rejects.toMatchObject({ code: "worktree-attachment-invalid" });
    expect(await fixture.claims()).toHaveLength(2);
    const released = await releaseInvalidSessionRepositoryContext(fixture.identity, fixture.options);
    expect(released?.startupRoot.toLowerCase()).toContain("primary");
    expect(released?.worktreeRoot.toLowerCase()).toContain("task");
    await expect(readActiveSessionRepositoryContext(fixture.identity, fixture.options)).resolves.toBeNull();
    expect(await fixture.claims()).toHaveLength(1);
    await expect(readActiveSessionRepositoryContext(fixture.foreign, fixture.foreignOptions)).resolves.toMatchObject({ branch: "fix/other" });
    expect(await readFile(join(fixture.other, "README.md"), "utf8")).toContain("fixture");
    expect((await execute("git", ["-C", fixture.primary, "branch", "--list", "fix/task"])).stdout).toContain("fix/task");
  });

  it("retains a valid attachment and an attachment whose startup checkout cannot be verified", async () => {
    const fixture = await attachedFixture();
    await expect(releaseInvalidSessionRepositoryContext(fixture.identity, fixture.options)).resolves.toBeNull();
    await expect(readActiveSessionRepositoryContext(fixture.identity, fixture.options)).resolves.toMatchObject({ branch: "fix/task" });
    await rm(fixture.worktree, { recursive: true, force: true });
    await rename(join(fixture.primary, ".git"), join(fixture.primary, ".git-moved"));
    try {
      const failure = await readActiveSessionRepositoryContext(fixture.identity, fixture.options).then(() => null, error => error as { code?: string });
      expect(failure).not.toBeNull();
      expect(failure?.code).not.toBe("worktree-attachment-invalid");
      await expect(releaseInvalidSessionRepositoryContext(fixture.identity, fixture.options)).resolves.toBeNull();
      expect(await fixture.claims()).toHaveLength(2);
    } finally { await rename(join(fixture.primary, ".git-moved"), join(fixture.primary, ".git")); }
  });

  it("detaches from a missing checkout without validating it or deleting anything", async () => {
    const fixture = await attachedFixture();
    await rm(join(fixture.worktree, ".git"));
    await clearSessionRepositoryContext(fixture.identity, fixture.options);
    await expect(readActiveSessionRepositoryContext(fixture.identity, fixture.options)).resolves.toBeNull();
    expect(await readFile(join(fixture.worktree, "README.md"), "utf8")).toContain("fixture");
    expect(await fixture.claims()).toHaveLength(1);
  });
});
