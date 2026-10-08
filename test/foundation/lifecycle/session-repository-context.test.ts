import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import {
  activateSessionRepositoryContext,
  clearSessionRepositoryContext,
  listSessionRepositoryWorktrees,
  readSessionRepositoryContext,
  registerSessionRepositoryRuntime,
  releaseSessionRepositoryRuntime,
  setSessionRepositoryContext,
} from "../../../src/foundation/lifecycle/session-repository-context.js";
import type { NativeProcessIdentity } from "../../../src/foundation/lifecycle/model.js";

const execFileAsync = promisify(execFile);
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

async function repositoryFixture() {
  const root = await mkdtemp(join(tmpdir(), "a1-session-repository-"));
  roots.push(root);
  const primary = join(root, "primary");
  const worktree = join(root, "delivery");
  const secondWorktree = join(root, "delivery-two");
  const dataDir = join(root, "data");
  await execFileAsync("git", ["init", "-b", "develop", primary]);
  await writeFile(join(primary, "README.md"), "fixture\n");
  await execFileAsync("git", ["-C", primary, "add", "README.md"]);
  await execFileAsync("git", ["-C", primary, "-c", "user.name=A1 Test", "-c", "user.email=a1@example.com", "commit", "-m", "fixture"]);
  await execFileAsync("git", ["-C", primary, "worktree", "add", "-b", "fix/example", worktree]);
  await execFileAsync("git", ["-C", primary, "worktree", "add", "-b", "fix/example-two", secondWorktree]);
  const sessionId = "01a0cac5-4b8c-75b4-86ed-2d6938e13ac2";
  const sessionFile = join(root, "session.jsonl");
  await writeFile(sessionFile, `${JSON.stringify({ type: "session", version: 3, id: sessionId, cwd: primary })}\n`);
  const secondIdentity = { sessionId: "second-session", sessionFile: join(root, "second-session.jsonl") };
  await writeFile(secondIdentity.sessionFile, `${JSON.stringify({ type: "session", version: 3, id: secondIdentity.sessionId, cwd: primary })}\n`);
  const processes = new Map<number, string>([[1001, "fixture:one"], [1002, "fixture:two"], [1003, "fixture:three"]]);
  const inspectProcess = async (pid: number): Promise<NativeProcessIdentity | null> => {
    const startIdentity = processes.get(pid);
    return startIdentity === undefined ? null : { pid, startIdentity };
  };
  return {
    root, primary, worktree, secondWorktree, dataDir, processes, inspectProcess,
    identity: { sessionId, sessionFile }, secondIdentity,
    firstRuntime: { runtimeId: "runtime-one", process: { pid: 1001, startIdentity: "fixture:one" } },
    secondRuntime: { runtimeId: "runtime-two", process: { pid: 1002, startIdentity: "fixture:two" } },
  };
}

function runtimeOptions(
  fixture: Awaited<ReturnType<typeof repositoryFixture>>,
  runtime: { runtimeId: string; process: NativeProcessIdentity },
) {
  return { dataDir: fixture.dataDir, runtimeId: runtime.runtimeId, inspectProcess: fixture.inspectProcess };
}

async function register(
  fixture: Awaited<ReturnType<typeof repositoryFixture>>,
  identity: { sessionId: string; sessionFile: string },
  runtime: { runtimeId: string; process: NativeProcessIdentity },
) {
  await registerSessionRepositoryRuntime(identity, runtime.runtimeId, runtime.process, {
    dataDir: fixture.dataDir,
    inspectProcess: fixture.inspectProcess,
  });
}

describe("session repository context and live worktree claims", () => {
  it("persists context while keeping concurrent runtime claims exclusive", async () => {
    const fixture = await repositoryFixture();
    const canonicalWorktree = await realpath(fixture.worktree);
    await register(fixture, fixture.identity, fixture.firstRuntime);
    await setSessionRepositoryContext(fixture.identity, fixture.worktree, runtimeOptions(fixture, fixture.firstRuntime));
    await expect(readSessionRepositoryContext(fixture.identity, { dataDir: fixture.dataDir }))
      .resolves.toEqual({ cwd: canonicalWorktree, branch: "fix/example" });

    const firstInventory = await listSessionRepositoryWorktrees(fixture.identity, runtimeOptions(fixture, fixture.firstRuntime));
    expect(firstInventory.find(entry => entry.cwd === canonicalWorktree)?.status).toBe("current");

    await register(fixture, fixture.secondIdentity, fixture.secondRuntime);
    const secondInventory = await listSessionRepositoryWorktrees(fixture.secondIdentity, runtimeOptions(fixture, fixture.secondRuntime));
    expect(secondInventory.find(entry => entry.cwd === canonicalWorktree)?.status).toBe("busy");
    await expect(setSessionRepositoryContext(fixture.secondIdentity, fixture.worktree, runtimeOptions(fixture, fixture.secondRuntime)))
      .rejects.toMatchObject({ code: "worktree-active-in-another-session" });

    await clearSessionRepositoryContext(fixture.identity, runtimeOptions(fixture, fixture.firstRuntime));
    expect((await listSessionRepositoryWorktrees(fixture.secondIdentity, runtimeOptions(fixture, fixture.secondRuntime)))
      .find(entry => entry.cwd === canonicalWorktree)?.status).toBe("available");
    await expect(setSessionRepositoryContext(fixture.secondIdentity, fixture.worktree, runtimeOptions(fixture, fixture.secondRuntime)))
      .resolves.toMatchObject({ branch: "fix/example" });
  });

  it("selects exactly one winner when two live runtimes race for one worktree", async () => {
    const fixture = await repositoryFixture();
    await register(fixture, fixture.identity, fixture.firstRuntime);
    await register(fixture, fixture.secondIdentity, fixture.secondRuntime);
    const outcomes = await Promise.allSettled([
      setSessionRepositoryContext(fixture.identity, fixture.worktree, runtimeOptions(fixture, fixture.firstRuntime)),
      setSessionRepositoryContext(fixture.secondIdentity, fixture.worktree, runtimeOptions(fixture, fixture.secondRuntime)),
    ]);
    expect(outcomes.filter(outcome => outcome.status === "fulfilled")).toHaveLength(1);
    const failure = outcomes.find(outcome => outcome.status === "rejected");
    expect(failure).toMatchObject({ status: "rejected", reason: { code: "worktree-active-in-another-session" } });
  });

  it("preserves the prior association and claim when a stream transfer fails", async () => {
    const fixture = await repositoryFixture();
    const firstPath = await realpath(fixture.worktree);
    const secondPath = await realpath(fixture.secondWorktree);
    await register(fixture, fixture.identity, fixture.firstRuntime);
    await register(fixture, fixture.secondIdentity, fixture.secondRuntime);
    await setSessionRepositoryContext(fixture.identity, fixture.worktree, runtimeOptions(fixture, fixture.firstRuntime));
    await setSessionRepositoryContext(fixture.secondIdentity, fixture.secondWorktree, runtimeOptions(fixture, fixture.secondRuntime));

    await expect(setSessionRepositoryContext(fixture.identity, fixture.secondWorktree, runtimeOptions(fixture, fixture.firstRuntime)))
      .rejects.toMatchObject({ code: "worktree-active-in-another-session" });
    await expect(readSessionRepositoryContext(fixture.identity, { dataDir: fixture.dataDir }))
      .resolves.toEqual({ cwd: firstPath, branch: "fix/example" });
    const inventory = await listSessionRepositoryWorktrees(fixture.identity, runtimeOptions(fixture, fixture.firstRuntime));
    expect(inventory.find(entry => entry.cwd === firstPath)?.status).toBe("current");
    expect(inventory.find(entry => entry.cwd === secondPath)?.status).toBe("busy");

    await expect(setSessionRepositoryContext(fixture.identity, fixture.worktree, runtimeOptions(fixture, fixture.firstRuntime)))
      .resolves.toEqual({ cwd: firstPath, branch: "fix/example" });
  });

  it("ignores heartbeat age while a claim owner remains exactly live", async () => {
    const fixture = await repositoryFixture();
    const canonicalWorktree = await realpath(fixture.worktree);
    await register(fixture, fixture.identity, fixture.firstRuntime);
    await setSessionRepositoryContext(fixture.identity, fixture.worktree, runtimeOptions(fixture, fixture.firstRuntime));
    const claimDirectory = join(fixture.dataDir, "session-worktree-claims", "worktrees");
    const [claimName] = await readdir(claimDirectory);
    expect(claimName).toBeDefined();
    const claimPath = join(claimDirectory, claimName!);
    const claim = JSON.parse(await readFile(claimPath, "utf8")) as Record<string, unknown>;
    await writeFile(claimPath, `${JSON.stringify({ ...claim, updatedAt: "2000-01-01T00:00:00.000Z" })}\n`);

    await register(fixture, fixture.secondIdentity, fixture.secondRuntime);
    expect((await listSessionRepositoryWorktrees(fixture.secondIdentity, runtimeOptions(fixture, fixture.secondRuntime)))
      .find(entry => entry.cwd === canonicalWorktree)?.status).toBe("busy");
  });

  it("reports contended claim state without mutating it", async () => {
    const fixture = await repositoryFixture();
    const canonicalWorktree = await realpath(fixture.worktree);
    await register(fixture, fixture.identity, fixture.firstRuntime);
    const lockPath = join(fixture.dataDir, "session-worktree-claims", "mutation.lock");
    await writeFile(lockPath, "contended\n");

    expect((await listSessionRepositoryWorktrees(fixture.identity, runtimeOptions(fixture, fixture.firstRuntime)))
      .find(entry => entry.cwd === canonicalWorktree)?.status).toBe("unverifiable");
    await expect(readFile(lockPath, "utf8")).resolves.toBe("contended\n");
  });

  it("fails closed for a malformed existing worktree claim", async () => {
    const fixture = await repositoryFixture();
    const canonicalWorktree = await realpath(fixture.worktree);
    await register(fixture, fixture.identity, fixture.firstRuntime);
    await setSessionRepositoryContext(fixture.identity, fixture.worktree, runtimeOptions(fixture, fixture.firstRuntime));
    const claimDirectory = join(fixture.dataDir, "session-worktree-claims", "worktrees");
    const [claimName] = await readdir(claimDirectory);
    expect(claimName).toBeDefined();
    await writeFile(join(claimDirectory, claimName!), "not-json\n");

    await register(fixture, fixture.secondIdentity, fixture.secondRuntime);
    expect((await listSessionRepositoryWorktrees(fixture.secondIdentity, runtimeOptions(fixture, fixture.secondRuntime)))
      .find(entry => entry.cwd === canonicalWorktree)?.status).toBe("unverifiable");
    await expect(setSessionRepositoryContext(fixture.secondIdentity, fixture.worktree, runtimeOptions(fixture, fixture.secondRuntime)))
      .rejects.toMatchObject({ code: "worktree-owner-unverifiable" });
  });

  it("allows replacement only after exact owner death and rejects unverifiable ownership", async () => {
    const fixture = await repositoryFixture();
    const canonicalWorktree = await realpath(fixture.worktree);
    await register(fixture, fixture.identity, fixture.firstRuntime);
    await setSessionRepositoryContext(fixture.identity, fixture.worktree, runtimeOptions(fixture, fixture.firstRuntime));
    await register(fixture, fixture.secondIdentity, fixture.secondRuntime);

    fixture.processes.set(1001, "fixture:reused-pid");
    expect((await listSessionRepositoryWorktrees(fixture.secondIdentity, runtimeOptions(fixture, fixture.secondRuntime)))
      .find(entry => entry.cwd === canonicalWorktree)?.status).toBe("available");
    await setSessionRepositoryContext(fixture.secondIdentity, fixture.worktree, runtimeOptions(fixture, fixture.secondRuntime));

    const thirdRuntime = { runtimeId: "runtime-three", process: { pid: 1003, startIdentity: "fixture:three" } };
    await register(fixture, fixture.identity, thirdRuntime);
    const uncertain = async (pid: number) => {
      if (pid === 1002) throw new Error("inspection unavailable");
      return await fixture.inspectProcess(pid);
    };
    const uncertainOptions = { dataDir: fixture.dataDir, runtimeId: thirdRuntime.runtimeId, inspectProcess: uncertain };
    expect((await listSessionRepositoryWorktrees(fixture.identity, uncertainOptions))
      .find(entry => entry.cwd === canonicalWorktree)?.status).toBe("unverifiable");
    await expect(setSessionRepositoryContext(fixture.identity, fixture.worktree, uncertainOptions))
      .rejects.toMatchObject({ code: "worktree-owner-unverifiable" });
  });

  it("releases live authority while preserving and conditionally restoring durable context", async () => {
    const fixture = await repositoryFixture();
    await register(fixture, fixture.identity, fixture.firstRuntime);
    await setSessionRepositoryContext(fixture.identity, fixture.worktree, runtimeOptions(fixture, fixture.firstRuntime));
    await releaseSessionRepositoryRuntime(fixture.firstRuntime.runtimeId, fixture.firstRuntime.process, { dataDir: fixture.dataDir });

    await expect(activateSessionRepositoryContext(
      fixture.identity,
      fixture.secondRuntime.runtimeId,
      fixture.secondRuntime.process,
      { dataDir: fixture.dataDir, inspectProcess: fixture.inspectProcess },
    )).resolves.toEqual({ cwd: await realpath(fixture.worktree), branch: "fix/example" });

    const thirdRuntime = { runtimeId: "runtime-three", process: { pid: 1003, startIdentity: "fixture:three" } };
    await register(fixture, fixture.secondIdentity, thirdRuntime);
    await setSessionRepositoryContext(fixture.secondIdentity, fixture.secondWorktree, {
      dataDir: fixture.dataDir, runtimeId: thirdRuntime.runtimeId, inspectProcess: fixture.inspectProcess,
    });
    await setSessionRepositoryContext(fixture.secondIdentity, fixture.worktree, {
      dataDir: fixture.dataDir, runtimeId: thirdRuntime.runtimeId, inspectProcess: fixture.inspectProcess,
    }).catch(() => undefined);

    const duplicateRuntime = { pid: 1001, startIdentity: "fixture:reused-pid" };
    await expect(activateSessionRepositoryContext(
      fixture.identity,
      "runtime-duplicate",
      duplicateRuntime,
      { dataDir: fixture.dataDir, inspectProcess: fixture.inspectProcess },
    )).resolves.toBeNull();
  });

  it("rejects runtime-generation collisions while the original process remains live", async () => {
    const fixture = await repositoryFixture();
    await register(fixture, fixture.identity, fixture.firstRuntime);
    await expect(registerSessionRepositoryRuntime(
      fixture.secondIdentity,
      fixture.firstRuntime.runtimeId,
      fixture.secondRuntime.process,
      { dataDir: fixture.dataDir, inspectProcess: fixture.inspectProcess },
    )).rejects.toMatchObject({ code: "session-runtime-conflict" });
  });

  it("rejects foreign, non-root, detached, mismatched, and malformed durable contexts", async () => {
    const fixture = await repositoryFixture();
    await register(fixture, fixture.identity, fixture.firstRuntime);
    const foreign = join(fixture.root, "foreign");
    await execFileAsync("git", ["init", "-b", "feature", foreign]);
    await expect(setSessionRepositoryContext(fixture.identity, foreign, runtimeOptions(fixture, fixture.firstRuntime)))
      .rejects.toThrow(/different Git repository/);
    await expect(setSessionRepositoryContext(fixture.identity, join(fixture.worktree, "subdirectory"), runtimeOptions(fixture, fixture.firstRuntime)))
      .rejects.toThrow();

    await expect(registerSessionRepositoryRuntime(
      { ...fixture.identity, sessionId: "other-session" },
      "other-runtime",
      { pid: 1003, startIdentity: "fixture:three" },
      { dataDir: fixture.dataDir, inspectProcess: fixture.inspectProcess },
    )).rejects.toThrow(/does not match/);

    await setSessionRepositoryContext(fixture.identity, fixture.worktree, runtimeOptions(fixture, fixture.firstRuntime));
    const records = await readdir(join(fixture.dataDir, "session-repositories"));
    expect(records).toHaveLength(1);
    await writeFile(join(fixture.dataDir, "session-repositories", records[0]!), "x".repeat(20_000));
    await expect(readSessionRepositoryContext(fixture.identity, { dataDir: fixture.dataDir })).resolves.toBeNull();

    await execFileAsync("git", ["-C", fixture.secondWorktree, "checkout", "--detach"]);
    await expect(setSessionRepositoryContext(fixture.identity, fixture.secondWorktree, runtimeOptions(fixture, fixture.firstRuntime)))
      .rejects.toThrow();
  });
});
