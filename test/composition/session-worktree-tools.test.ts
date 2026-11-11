import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, expect, it, vi } from "vitest";
import { SessionRuntimeRegistry } from "../../src/composition/session-runtime-registry.js";
import { updateSessionRepositoryContext } from "../../src/features/launch/session-context.js";
import { createPiRuntimeIntegration } from "../../src/integrations/pi/engine/runtime-integration.js";
import type { ExtensionToolContext } from "../../src/integrations/pi/startup-public.js";
import { PRODUCT_IDENTITY } from "../../src/product-identity.js";

const execute = promisify(execFile), roots: string[] = [];
afterEach(async () => { vi.unstubAllEnvs(); await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true, maxRetries: 5 }))); });

it("connects entry and detach to the real SDK tool cwd without changing the session's startup root", async () => {
  const root = await mkdtemp(join(tmpdir(), "a1-attached-sdk-tools-")); roots.push(root);
  const primary = join(root, "primary"), agentDir = join(root, "agent"); await mkdir(agentDir);
  vi.stubEnv(PRODUCT_IDENTITY.environment.dataDir, join(root, "data"));
  await execute("git", ["init", "-b", "develop", primary]);
  await writeFile(join(primary, "README.md"), "source\n");
  await execute("git", ["-C", primary, "add", "."]);
  await execute("git", ["-C", primary, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "commit", "-m", "fixture"]);
  const runtimeId = "sdk-worktree-fixture";
  const inspectProcess = async (pid: number) => ({ pid, startIdentity: "fixture" });
  const registry = new SessionRuntimeRegistry({ runtimeId, inspectProcess });
  const runtime = await createPiRuntimeIntegration({ cwd: primary, agentDir, worktreeCwdReader: registry.toolReaderFor(undefined) });
  try {
    const manager = runtime.session.sessionManager;
    const identity = { sessionId: manager.getSessionId(), sessionFile: manager.getSessionFile()! };
    const context = { cwd: primary, sessionManager: manager } as unknown as ExtensionToolContext;
    const write = (path: string, content: string) => runtime.session.getToolDefinition("write")!.execute("call", { path, content }, undefined, undefined, context);
    await registry.readerFor(undefined)(identity.sessionId, identity.sessionFile, new AbortController().signal);
    const entered = await updateSessionRepositoryContext(identity, { action: "enter-worktree", branch: "fix/sdk-task" }, { runtimeId, inspectProcess });
    if (entered.kind !== "linked") throw new Error("missing attachment");
    await write("task.txt", "attached");
    expect(await readFile(join(entered.cwd, "task.txt"), "utf8")).toBe("attached");
    await expect(readFile(join(primary, "task.txt"))).rejects.toMatchObject({ code: "ENOENT" });
    expect(runtime.cwd).toBe(primary);
    const claims = join(root, "data", "session-worktree-claims", "worktrees");
    const [claim] = await readdir(claims); await rm(join(claims, claim!));
    await write("recovered.txt", "reactivated");
    expect(await readFile(join(entered.cwd, "recovered.txt"), "utf8")).toBe("reactivated");
    await updateSessionRepositoryContext(identity, { action: "unlink-worktree" }, { runtimeId, inspectProcess });
    await write("detached.txt", "startup");
    expect(await readFile(join(primary, "detached.txt"), "utf8")).toBe("startup");
    expect(await readFile(join(entered.cwd, "task.txt"), "utf8")).toBe("attached");
  } finally { await runtime.dispose(); await registry.dispose(); }
});
