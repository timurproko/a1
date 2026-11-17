import { mkdtemp, mkdir, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { executeSessionWorktreeControl, registerSessionRepositoryRuntime, requestSessionWorktreeControl, takeSessionWorktreeControl } from "../../../src/foundation/lifecycle/index.js";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true, maxRetries: 5 }))); });
async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), "a1-control-request-"))); roots.push(root);
  const home = join(root, "home"), dataDir = join(root, "data"); await mkdir(home);
  const identity = { sessionId: "control-session", sessionFile: join(root, "session.jsonl") };
  await writeFile(identity.sessionFile, `${JSON.stringify({ type: "session", id: identity.sessionId, cwd: home })}\n`);
  const options = { runtimeId: "control-runtime", dataDir, inspectProcess: async (pid: number) => ({ pid, startIdentity: "fixture" }) };
  await registerSessionRepositoryRuntime(identity, options.runtimeId, { pid: 1001, startIdentity: "fixture" }, options);
  const requestPath = async () => { const dir = join(dataDir, "session-worktree-claims", "controls"); return join(dir, (await readdir(dir))[0]!); };
  return { home, dataDir, identity, options, requestPath };
}

it("queues an exact-session shell request without Git or attachment changes and consumes it once", async () => {
  const f = await fixture();
  const request = { action: "enter-worktree" as const, branch: "fix/task", repo: f.home };
  await requestSessionWorktreeControl(f.identity, request, f.options);
  expect(await takeSessionWorktreeControl(f.identity, f.options)).toEqual(request);
  expect(await takeSessionWorktreeControl(f.identity, f.options)).toBeNull();
  expect(await executeSessionWorktreeControl(f.identity, { action: "worktree-status" }, f.options)).toMatchObject({ health: "detached", cwd: f.home, startupDirectory: f.home, repositoryRoot: null });
});

it("queues local removal without detaching or substituting merged completion", async () => {
  const f = await fixture(), request = { action: "remove-local-worktree" as const };
  await requestSessionWorktreeControl(f.identity, request, f.options);
  expect(await takeSessionWorktreeControl(f.identity, f.options)).toEqual(request);
  await expect(executeSessionWorktreeControl(f.identity, request, f.options)).rejects.toMatchObject({ code: "worktree-not-attached" });
  expect(await takeSessionWorktreeControl(f.identity, f.options)).toBeNull();
});

it("preserves the first request instead of replacing it with a concurrent shell mutation", async () => {
  const f = await fixture();
  await requestSessionWorktreeControl(f.identity, { action: "unlink-worktree" }, f.options);
  await expect(requestSessionWorktreeControl(f.identity, { action: "complete-worktree" }, f.options)).rejects.toMatchObject({ code: "worktree-request-pending" });
  expect(await takeSessionWorktreeControl(f.identity, f.options)).toEqual({ action: "unlink-worktree" });
});

it.each(["expired", "foreign", "malformed"])("discards a %s control record without executing it", async kind => {
  const f = await fixture();
  await requestSessionWorktreeControl(f.identity, { action: "unlink-worktree" }, f.options);
  const path = await f.requestPath(), value = JSON.parse(await readFile(path, "utf8"));
  if (kind === "expired") value.requestedAt = Date.now() - 6 * 60_000;
  if (kind === "foreign") value.sessionId = "another-session";
  if (kind === "malformed") value.request = { action: "enter-worktree", branch: 1 };
  await writeFile(path, JSON.stringify(value));
  await expect(takeSessionWorktreeControl(f.identity, f.options)).rejects.toThrow();
  expect(await takeSessionWorktreeControl(f.identity, f.options)).toBeNull();
});
