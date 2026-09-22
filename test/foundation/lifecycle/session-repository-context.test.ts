import { execFile } from "node:child_process";
import { mkdtemp, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import {
  clearSessionRepositoryContext,
  readSessionRepositoryContext,
  setSessionRepositoryContext,
} from "../../../src/foundation/lifecycle/session-repository-context.js";

const execFileAsync = promisify(execFile);
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

async function repositoryFixture() {
  const root = await mkdtemp(join(tmpdir(), "a1-session-repository-"));
  roots.push(root);
  const primary = join(root, "primary");
  const worktree = join(root, "delivery");
  const dataDir = join(root, "data");
  await execFileAsync("git", ["init", "-b", "develop", primary]);
  await writeFile(join(primary, "README.md"), "fixture\n");
  await execFileAsync("git", ["-C", primary, "add", "README.md"]);
  await execFileAsync("git", ["-C", primary, "-c", "user.name=A1 Test", "-c", "user.email=a1@example.com", "commit", "-m", "fixture"]);
  await execFileAsync("git", ["-C", primary, "worktree", "add", "-b", "fix/example", worktree]);
  const sessionId = "01a0cac5-4b8c-75b4-86ed-2d6938e13ac2";
  const sessionFile = join(root, "session.jsonl");
  await writeFile(sessionFile, `${JSON.stringify({ type: "session", version: 3, id: sessionId, cwd: primary })}\n`);
  return { root, primary, worktree, dataDir, identity: { sessionId, sessionFile } };
}

describe("session repository context", () => {
  it("persists, restores, and clears one same-repository worktree association", async () => {
    const fixture = await repositoryFixture();
    const canonicalWorktree = await realpath(fixture.worktree);
    await expect(setSessionRepositoryContext(fixture.identity, fixture.worktree, { dataDir: fixture.dataDir }))
      .resolves.toEqual({ cwd: canonicalWorktree, branch: "fix/example" });
    await expect(readSessionRepositoryContext(fixture.identity, { dataDir: fixture.dataDir }))
      .resolves.toEqual({ cwd: canonicalWorktree, branch: "fix/example" });

    const secondIdentity = { sessionId: "second-session", sessionFile: join(fixture.root, "second-session.jsonl") };
    await writeFile(secondIdentity.sessionFile, `${JSON.stringify({ type: "session", version: 3, id: secondIdentity.sessionId, cwd: fixture.primary })}\n`);
    await setSessionRepositoryContext(secondIdentity, fixture.worktree, { dataDir: fixture.dataDir });
    await clearSessionRepositoryContext(fixture.identity, { dataDir: fixture.dataDir });
    await expect(readSessionRepositoryContext(fixture.identity, { dataDir: fixture.dataDir })).resolves.toBeNull();
    await expect(readSessionRepositoryContext(secondIdentity, { dataDir: fixture.dataDir })).resolves.toEqual({ cwd: canonicalWorktree, branch: "fix/example" });
  });

  it("rejects a foreign repository and fails closed after the associated worktree disappears", async () => {
    const fixture = await repositoryFixture();
    const foreign = join(fixture.root, "foreign");
    await execFileAsync("git", ["init", "-b", "feature", foreign]);
    await expect(setSessionRepositoryContext(fixture.identity, foreign, { dataDir: fixture.dataDir }))
      .rejects.toThrow(/different Git repository/);

    await setSessionRepositoryContext(fixture.identity, fixture.worktree, { dataDir: fixture.dataDir });
    await execFileAsync("git", ["-C", fixture.primary, "worktree", "remove", fixture.worktree]);
    await expect(readSessionRepositoryContext(fixture.identity, { dataDir: fixture.dataDir })).resolves.toBeNull();
  });

  it("rejects mismatched identity, malformed state, non-root paths, and detached worktrees", async () => {
    const fixture = await repositoryFixture();
    await expect(setSessionRepositoryContext({ ...fixture.identity, sessionId: "other-session" }, fixture.worktree, { dataDir: fixture.dataDir }))
      .rejects.toThrow(/does not match/);
    await expect(setSessionRepositoryContext(fixture.identity, join(fixture.worktree, "subdirectory"), { dataDir: fixture.dataDir }))
      .rejects.toThrow();

    await setSessionRepositoryContext(fixture.identity, fixture.worktree, { dataDir: fixture.dataDir });
    const records = await readdir(join(fixture.dataDir, "session-repositories"));
    expect(records).toHaveLength(1);
    await writeFile(join(fixture.dataDir, "session-repositories", records[0]!), "x".repeat(20_000));
    await expect(readSessionRepositoryContext(fixture.identity, { dataDir: fixture.dataDir })).resolves.toBeNull();

    await execFileAsync("git", ["-C", fixture.worktree, "checkout", "--detach"]);
    await expect(setSessionRepositoryContext(fixture.identity, fixture.worktree, { dataDir: fixture.dataDir }))
      .rejects.toThrow();
  });
});
