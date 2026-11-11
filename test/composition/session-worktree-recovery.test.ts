import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, expect, it, vi } from "vitest";
import { SessionRuntimeRegistry } from "../../src/composition/session-runtime-registry.js";
import { updateSessionRepositoryContext } from "../../src/features/launch/session-context.js";
import { createPiRuntimeIntegration } from "../../src/integrations/pi/engine/runtime-integration.js";
import { RepositoryMetadataPoller } from "../../src/integrations/pi/engine/repository-metadata.js";
import type { ExtensionToolContext } from "../../src/integrations/pi/startup-public.js";
import { PRODUCT_IDENTITY } from "../../src/product-identity.js";

const execute = promisify(execFile), roots: string[] = [];
afterEach(async () => { vi.unstubAllEnvs(); await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true, maxRetries: 5 }))); });

async function attachedSession() {
  const root = await mkdtemp(join(tmpdir(), "a1-attached-recovery-")); roots.push(root);
  const primary = join(root, "primary"), agentDir = join(root, "agent"); await mkdir(agentDir);
  vi.stubEnv(PRODUCT_IDENTITY.environment.dataDir, join(root, "data"));
  await execute("git", ["init", "-b", "develop", primary]);
  await writeFile(join(primary, "README.md"), "source\n");
  await execute("git", ["-C", primary, "add", "."]);
  await execute("git", ["-C", primary, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "commit", "-m", "fixture"]);
  const runtimeId = "sdk-recovery-fixture";
  const inspectProcess = async (pid: number) => ({ pid, startIdentity: "fixture" });
  const registry = new SessionRuntimeRegistry({ runtimeId, inspectProcess });
  const runtime = await createPiRuntimeIntegration({ cwd: primary, agentDir, worktreeCwdReader: registry.toolReaderFor(undefined) });
  const manager = runtime.session.sessionManager;
  const identity = { sessionId: manager.getSessionId(), sessionFile: manager.getSessionFile()! };
  const context = { cwd: primary, sessionManager: manager } as unknown as ExtensionToolContext;
  const write = (path: string, content: string) => runtime.session.getToolDefinition("write")!.execute("call", { path, content }, undefined, undefined, context);
  await registry.readerFor(undefined)(identity.sessionId, identity.sessionFile, new AbortController().signal);
  const entered = await updateSessionRepositoryContext(identity, { action: "enter-worktree", branch: "fix/sdk-task" }, { runtimeId, inspectProcess });
  if (entered.kind !== "linked") throw new Error("missing attachment");
  const bash = (command: string) => runtime.session.getToolDefinition("bash")!.execute("call", { command }, undefined, undefined, context);
  const complete = () => updateSessionRepositoryContext(identity, { action: "complete-worktree" }, { runtimeId, inspectProcess });
  return { primary, registry, runtime, identity, write, bash, complete, entered, dispose: async () => { await runtime.dispose(); await registry.dispose(); } };
}

it("fails one tool call and then runs from primary after the attached checkout loses its Git pointer", async () => {
  const session = await attachedSession();
  try {
    await session.write("task.txt", "attached");
    await rm(join(session.entered.cwd, ".git"));
    await expect(session.write("lost.txt", "must not land in primary")).rejects.toThrow(/no longer a valid Git worktree.*did not run/su);
    await expect(readFile(join(session.primary, "lost.txt"))).rejects.toMatchObject({ code: "ENOENT" });
    await session.write("recovered.txt", "primary");
    expect(await readFile(join(session.primary, "recovered.txt"), "utf8")).toBe("primary");
    expect(await readFile(join(session.entered.cwd, "task.txt"), "utf8")).toBe("attached");
  } finally { await session.dispose(); }
});

it("still reports the lost checkout to the next tool call when footer polling released it first", async () => {
  const session = await attachedSession();
  const metadata = new RepositoryMetadataPoller({
    repositoryContextReader: session.registry.readerFor(undefined),
    gitBranchReader: async () => "develop",
    pullRequestProbe: async () => null,
    repositoryContextPollMs: 60_000,
    pullRequestRefreshMs: 0,
  }, {
    bindingGeneration: () => 1, sessionIdentity: () => session.identity,
    fallbackCwd: () => session.primary, disposed: () => false, changed: () => {},
  });
  try {
    metadata.start();
    await vi.waitFor(() => expect(metadata.branch).toBe("fix/sdk-task"));
    await rm(session.entered.cwd, { recursive: true, force: true, maxRetries: 5 });
    metadata.refresh();
    await vi.waitFor(() => expect(metadata.branch).toBe("develop"));
    expect(metadata.cwd).toBe(session.primary);
    await expect(session.write("lost.txt", "must not land in primary")).rejects.toThrow(/no longer a valid Git worktree/u);
    await session.write("recovered.txt", "primary");
    expect(await readFile(join(session.primary, "recovered.txt"), "utf8")).toBe("primary");
  } finally { await metadata.dispose(); await session.dispose(); }
});

it("appends the settled completion to the shell call that requested it and keeps later tools on primary", async () => {
  const session = await attachedSession();
  try {
    const quiet = await session.bash("echo attached");
    expect(JSON.stringify(quiet.content)).not.toContain("Worktree completion");
    // Rationale: the issuing shell runs the CLI; the request it leaves is the same one this call writes.
    await session.complete();
    const settled = await session.bash("echo done");
    const text = settled.content.map(part => part.type === "text" ? part.text : "").join("\n");
    expect(text).toContain("done");
    expect(text).toMatch(/Worktree completion \(cleanup-unavailable\).*a1\.worktreeCleanup/su);
    expect(text).toContain(`left ${session.entered.cwd} (fix/sdk-task)`);
    await session.write("after.txt", "primary");
    expect(await readFile(join(session.primary, "after.txt"), "utf8")).toBe("primary");
    expect(await readFile(join(session.entered.cwd, "README.md"), "utf8")).toContain("source");
    const later = await session.bash("echo later");
    expect(JSON.stringify(later.content)).not.toContain("Worktree completion");
  } finally { await session.dispose(); }
});
