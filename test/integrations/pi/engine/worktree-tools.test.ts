import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExtensionToolContext } from "../../../../src/integrations/pi/startup-public.js";
import { createSessionWorktreeTools } from "../../../../src/integrations/pi/engine/worktree-tools.js";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true, maxRetries: 5 }))); });

describe("attachment-aware built-in tools", () => {
  it("uses the current cwd per call while preserving absolute paths and native rendering", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-worktree-tools-")); roots.push(root);
    const startup = join(root, "startup"), attached = join(root, "attached");
    await mkdir(startup); await mkdir(attached);
    let cwd = startup;
    const tools = createSessionWorktreeTools(startup, async () => cwd);
    const context = { cwd: startup, sessionManager: { getSessionId: () => "fixture", getSessionFile: () => join(root, "session.jsonl") } } as ExtensionToolContext;
    const call = async (name: string, params: unknown) => tools.find(tool => tool.name === name)!.execute("call", params, undefined, undefined, context);
    expect(tools.every(tool => tool.defaultActive === false)).toBe(true);
    expect(tools.find(tool => tool.name === "read")?.renderCall).toBeTypeOf("function");
    await call("write", { path: "note.txt", content: "startup" });
    cwd = attached;
    await call("write", { path: "note.txt", content: "attached" });
    await call("edit", { path: "note.txt", edits: [{ oldText: "attached", newText: "edited" }] });
    const read = await call("read", { path: "note.txt" });
    expect(read.content).toContainEqual(expect.objectContaining({ type: "text", text: "edited" }));
    const bash = await call("bash", { command: 'printf "worktree-context" > shell.txt' });
    expect(bash.content).toBeDefined();
    expect(await readFile(join(attached, "shell.txt"), "utf8")).toBe("worktree-context");
    await call("write", { path: join(startup, "absolute.txt"), content: "explicit" });
    expect(await readFile(join(startup, "absolute.txt"), "utf8")).toBe("explicit");
    cwd = startup; // Protocol: detach returns subsequent relative calls to the startup root.
    await call("write", { path: "note.txt", content: "detached" });
    expect(await readFile(join(startup, "note.txt"), "utf8")).toBe("detached");
    expect(await readFile(join(attached, "note.txt"), "utf8")).toBe("edited");
  });

  it("exposes only argument-free sequential detach outside strict cwd resolution and never settles cleanup", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-worktree-tools-")); roots.push(root);
    let detached = false;
    const resolve = vi.fn(async () => { if (!detached) throw new Error("startup Git identity invalid"); return root; });
    const settle = vi.fn(async () => "cleanup must not run");
    const detach = vi.fn(async () => { detached = true; return root; });
    const tools = createSessionWorktreeTools(root, resolve, settle, detach);
    const context = {} as ExtensionToolContext;
    const write = tools.find(tool => tool.name === "write")!;
    await expect(write.execute("blocked", { path: "note.txt", content: "bad" }, undefined, undefined, context)).rejects.toThrow("startup Git identity invalid");
    const recovery = tools.find(tool => tool.name === "worktree_detach")!;
    expect(recovery.parameters).toEqual({ type: "object", properties: {}, additionalProperties: false });
    expect(recovery.executionMode).toBe("sequential");
    expect(recovery.defaultActive).not.toBe(false);
    const result = await recovery.execute("recover", {}, undefined, undefined, context);
    expect(result).toMatchObject({ details: { cwd: root }, content: [expect.objectContaining({ text: expect.stringContaining(root) })] });
    expect(detach).toHaveBeenCalledExactlyOnceWith(undefined);
    expect(resolve).toHaveBeenCalledOnce();
    expect(settle).not.toHaveBeenCalled();
    await expect(readFile(join(root, "note.txt"))).rejects.toMatchObject({ code: "ENOENT" });
    await write.execute("after", { path: "note.txt", content: "after explicit recovery" }, undefined, undefined, context);
    expect(await readFile(join(root, "note.txt"), "utf8")).toBe("after explicit recovery");
  });

  it("omits recovery without its owner callback and reports cancellation or failure without success", async () => {
    const resolve = vi.fn(async () => { throw new Error("uncertain attachment"); });
    expect(createSessionWorktreeTools("/unused", resolve).some(tool => tool.name === "worktree_detach")).toBe(false);
    const detach = vi.fn(async () => { throw new Error("owner unavailable"); });
    const recovery = createSessionWorktreeTools("/unused", resolve, undefined, detach).find(tool => tool.name === "worktree_detach")!;
    const controller = new AbortController(); controller.abort();
    await expect(recovery.execute("cancelled", {}, controller.signal, undefined, {} as ExtensionToolContext)).rejects.toThrow();
    expect(detach).not.toHaveBeenCalled();
    await expect(recovery.execute("failed", {}, undefined, undefined, {} as ExtensionToolContext)).rejects.toThrow("owner unavailable");
    expect(resolve).not.toHaveBeenCalled();
  });

  it("does not execute a mutation when attachment verification fails", async () => {
    const root = await mkdtemp(join(tmpdir(), "a1-worktree-tools-")); roots.push(root);
    await writeFile(join(root, "note.txt"), "keep");
    const resolve = vi.fn(async () => { throw new Error("attachment unverifiable"); });
    const tools = createSessionWorktreeTools(root, resolve);
    await expect(tools.find(tool => tool.name === "write")!.execute("call", { path: "note.txt", content: "bad" }, undefined, undefined, {} as ExtensionToolContext)).rejects.toThrow("attachment unverifiable");
    expect(await readFile(join(root, "note.txt"), "utf8")).toBe("keep");
    expect(resolve).toHaveBeenCalledOnce();
  });
});
