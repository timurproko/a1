import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { posix, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createWindowsNulCleanupExtension,
  type WindowsNulCleanupOptions,
} from "../../../../src/integrations/pi/engine/windows-filesystem-hygiene.js";

type EntryKind = "file" | "directory" | "symlink" | "inspect-error" | "delete-error";
type EventHandler = (event: unknown, context: { cwd: string }) => unknown;

interface CleanupHarness {
  readonly entries: Map<string, EntryKind>;
  readonly inspections: string[];
  readonly deletions: string[];
  invoke(event: "session_start" | "tool_result", value: unknown, cwd?: string): Promise<unknown>;
}

async function cleanupHarness(initial: Readonly<Record<string, EntryKind>> = {}): Promise<CleanupHarness> {
  const entries = new Map(Object.entries(initial));
  const inspections: string[] = [];
  const deletions: string[] = [];
  const handlers = new Map<string, EventHandler>();
  const fileSystem: NonNullable<WindowsNulCleanupOptions["fileSystem"]> = {
    async lstat(path) {
      inspections.push(path);
      const kind = entries.get(path);
      if (kind === undefined || kind === "inspect-error") throw new Error("not inspectable");
      return {
        isFile: () => kind === "file" || kind === "delete-error",
        isSymbolicLink: () => kind === "symlink",
      };
    },
    async unlink(path) {
      deletions.push(path);
      const kind = entries.get(path);
      if (kind === undefined) throw new Error("already absent");
      if (kind === "delete-error") throw new Error("not deletable");
      entries.delete(path);
    },
  };
  const extension = createWindowsNulCleanupExtension({ platform: "win32", fileSystem, paths: posix });
  if (extension === null || typeof extension === "function") throw new Error("named cleanup extension was not created");
  await extension.factory({
    on: (event: string, handler: unknown) => handlers.set(event, handler as EventHandler),
  } as unknown as ExtensionAPI);
  return {
    entries,
    inspections,
    deletions,
    async invoke(event, value, cwd = "/work") {
      const handler = handlers.get(event);
      if (!handler) throw new Error(`missing ${event} handler`);
      return handler(value, { cwd });
    },
  };
}

function toolResult(toolName: string, input: Record<string, unknown> = {}): unknown {
  return { type: "tool_result", toolCallId: "call", toolName, input, content: [], details: undefined, isError: false };
}

describe("Windows NUL filesystem hygiene", () => {
  it("removes a residual regular file when a session starts", async () => {
    const harness = await cleanupHarness({ "/work/nul": "file" });

    await expect(harness.invoke("session_start", { type: "session_start", reason: "startup" })).resolves.toBeUndefined();

    expect(harness.entries.has("/work/nul")).toBe(false);
    expect(harness.deletions).toEqual(["/work/nul"]);
  });

  it("cleans the active directory after any tool result and deduplicates a mutation target in that directory", async () => {
    const harness = await cleanupHarness({ "/work/nul": "file" });

    await expect(harness.invoke("tool_result", toolResult("write", { path: "result.txt" }))).resolves.toBeUndefined();

    expect(harness.inspections).toEqual(["/work/nul"]);
    expect(harness.deletions).toEqual(["/work/nul"]);
  });

  it.each([
    ["cd nested && echo done", "/work/nested/nul"],
    ["cd \"nested directory\"; echo done", "/work/nested directory/nul"],
    ["cd 'other directory' | echo done", "/work/other directory/nul"],
    ["echo ready && cd /absolute", "/absolute/nul"],
  ])("cleans the simple Bash cd target in %s", async (command, artifact) => {
    const harness = await cleanupHarness({ [artifact]: "file" });

    await harness.invoke("tool_result", toolResult("bash", { command }));

    expect(harness.entries.has(artifact)).toBe(false);
    expect(harness.inspections).toContain(artifact);
  });

  it.each(["write", "edit"])("cleans the parent directory targeted by %s", async toolName => {
    const harness = await cleanupHarness({ "/work/generated/nul": "file" });

    await harness.invoke("tool_result", toolResult(toolName, { path: "generated/output.txt" }));

    expect(harness.entries.has("/work/generated/nul")).toBe(false);
  });

  it.each(["directory", "symlink"] as const)("does not delete a %s named nul", async kind => {
    const harness = await cleanupHarness({ "/work/nul": kind });

    await expect(harness.invoke("tool_result", toolResult("read"))).resolves.toBeUndefined();

    expect(harness.entries.get("/work/nul")).toBe(kind);
    expect(harness.deletions).toEqual([]);
  });

  it.each(["inspect-error", "delete-error"] as const)("isolates a %s from the tool result", async kind => {
    const harness = await cleanupHarness({ "/work/nul": kind });

    await expect(harness.invoke("tool_result", toolResult("read"))).resolves.toBeUndefined();

    expect(harness.entries.get("/work/nul")).toBe(kind);
  });

  it("treats missing files and concurrent not-found deletion races as successful cleanup", async () => {
    const missing = await cleanupHarness();
    await expect(missing.invoke("session_start", { type: "session_start", reason: "startup" })).resolves.toBeUndefined();

    const racing = await cleanupHarness({ "/work/nul": "file" });
    await expect(Promise.all([
      racing.invoke("tool_result", toolResult("read")),
      racing.invoke("tool_result", toolResult("read")),
    ])).resolves.toEqual([undefined, undefined]);
    expect(racing.entries.has("/work/nul")).toBe(false);
  });

  it.runIf(process.platform === "win32")("removes a real Windows nul artifact through the session event", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "a1-windows-nul-cleanup-"));
    const artifact = resolve(root, "nul");
    try {
      await writeFile(artifact, "artifact");
      const handlers = new Map<string, EventHandler>();
      const extension = createWindowsNulCleanupExtension();
      if (extension === null || typeof extension === "function") throw new Error("named cleanup extension was not created");
      await extension.factory({
        on: (event: string, handler: unknown) => handlers.set(event, handler as EventHandler),
      } as unknown as ExtensionAPI);

      await handlers.get("session_start")?.({ type: "session_start", reason: "startup" }, { cwd: root });

      await expect(readFile(artifact)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("does not construct a cleanup extension outside Windows", () => {
    const inspections: string[] = [];
    const extension = createWindowsNulCleanupExtension({
      platform: "linux",
      fileSystem: {
        async lstat(path) {
          inspections.push(path);
          throw new Error("must not run");
        },
        async unlink(path) {
          inspections.push(path);
        },
      },
      paths: posix,
    });

    expect(extension).toBeNull();
    expect(inspections).toEqual([]);
  });
});
