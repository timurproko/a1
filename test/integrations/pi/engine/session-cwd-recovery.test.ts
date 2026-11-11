import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPiEngineAdapter, createPiRuntimeIntegration } from "../../../../src/integrations/pi/engine/index.js";
import { OWNED_UI_EXTENSION_UI_CALLBACKS, type OwnedUiExtensionUiPort } from "../../../../src/contracts/owned-ui/index.js";
import { acquireExisting } from "../../../../src/foundation/session-writer-lock/index.js";

const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true, maxRetries: 5 })));
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "a1-cwd-recovery-"));
  roots.push(root);
  const cwd = join(root, "work");
  const store = join(root, "sessions");
  await Promise.all([mkdir(cwd), mkdir(store)]);
  const source = join(root, "source.jsonl");
  const original = [
    { type: "session", version: 3, id: "original-id", timestamp: "2026-01-01T00:00:00Z", cwd: join(root, "gone") },
    { type: "message", id: "u1", parentId: null, timestamp: "2026-01-01T00:00:01Z", message: { role: "user", content: "Kept history", timestamp: 1 } },
    { type: "thinking_level_change", id: "t1", parentId: "u1", timestamp: "2026-01-01T00:00:02Z", thinkingLevel: "off" },
  ].map(value => JSON.stringify(value)).join("\n") + "\n";
  await writeFile(source, original);
  const runtime = await createPiRuntimeIntegration({ cwd, sessionDir: store, agentDir: join(root, "agent") });
  const adapter = await createPiEngineAdapter({ sessionId: "recovery", cwd, createRuntime: async () => runtime });
  return { root, cwd, store, source, original, runtime, adapter };
}

function ui(select: (title: string, options: string[]) => Promise<string | undefined>) {
  const theme = Object.fromEntries(["fg", "bg", "bold", "italic", "underline", "inverse", "strikethrough", "getFgAnsi", "getBgAnsi", "getColorMode", "getThinkingBorderColor", "getBashModeBorderColor"].map(name => [name, () => ""]));
  return { ...Object.fromEntries(OWNED_UI_EXTENSION_UI_CALLBACKS.map(name => [name, () => {}])), theme, select, notify: vi.fn() } as unknown as OwnedUiExtensionUiPort;
}

describe("missing-folder session recovery", () => {
  it.each(["continue", "fork"] as const)("retains writer exclusion and releases it after startup %s recovery", async choice => {
    const { root, cwd, store, source, original, adapter } = await fixture();
    try {
      const runtime = await createPiRuntimeIntegration({
        cwd, agentDir: join(root, "agent"), sessionDir: store,
        sessionSelection: { target: source }, sessionForkPrompt: async () => choice,
      });
      const selectedPath = runtime.session.sessionFile!;
      try {
        expect(runtime.cwd).toBe(cwd);
        expect(runtime.session.sessionId === "original-id").toBe(choice === "continue");
        expect(() => acquireExisting(selectedPath)).toThrow();
        expect(await readFile(source, "utf8")).toBe(original);
      } finally { await runtime.dispose(); }
      const writer = acquireExisting(selectedPath); writer.release();
    } finally { await adapter.dispose(); }
  });
  it("releases the source writer when startup recovery is cancelled", async () => {
    const { root, cwd, store, source, adapter } = await fixture();
    try {
      const before = await readdir(store);
      await expect(createPiRuntimeIntegration({
        cwd, agentDir: join(root, "agent"), sessionDir: store,
        sessionSelection: { target: source }, sessionForkPrompt: async () => "cancel",
      })).rejects.toMatchObject({ exitCode: 0 });
      const writer = acquireExisting(source); writer.release();
      expect(await readdir(store)).toEqual(before);
    } finally { await adapter.dispose(); }
  });

  it.each(["resume", "import"] as const)("keeps %s cancellation copy-free and Continue transient", async command => {
    const { cwd, source, original, runtime, adapter, store } = await fixture();
    try {
      const initialPath = runtime.session.sessionFile;
      const request = { command, argument: source, ...(command === "import" ? { confirmed: true } : {}) };
      const before = await readdir(store);
      expect(await adapter.executeWorkflow(request)).toMatchObject({ outcome: "requires-selection", cwdRecovery: { fallbackCwd: cwd } });
      expect(await readdir(store)).toEqual(before);
      expect(await adapter.executeWorkflow({ ...request, cwdRecoveryChoice: "cancel" })).toMatchObject({ outcome: "cancelled" });
      expect(runtime.session.sessionFile).toBe(initialPath);
      expect(await readdir(store)).toEqual(before);
      expect(await adapter.executeWorkflow({ ...request, cwdRecoveryChoice: "continue", cwdOverride: cwd })).toMatchObject({ outcome: "completed" });
      expect(runtime.cwd).toBe(cwd);
      expect(runtime.session.sessionId).toBe("original-id");
      expect(runtime.session.messages).toMatchObject([{ role: "user", content: "Kept history" }]);
      const stored = await readFile(runtime.session.sessionFile!, "utf8");
      expect(JSON.parse(stored.split("\n")[0]!).cwd).toContain("gone");
      expect(await readFile(source, "utf8")).toBe(original);
      if (command === "import") expect((await readdir(store)).filter(name => name.startsWith("source"))).toEqual(["source.jsonl"]);
    } finally { await adapter.dispose(); }
  });

  it.each(["resume", "import"] as const)("forks %s into a new guarded identity and preserves the original", async command => {
    const { cwd, source, original, runtime, adapter, store } = await fixture();
    try {
      const request = { command, argument: source, ...(command === "import" ? { confirmed: true } : {}) };
      expect(await adapter.executeWorkflow({ ...request, cwdRecoveryChoice: "fork" })).toMatchObject({ outcome: "completed", message: expect.stringContaining("Forked into new session") });
      expect(runtime.session.sessionId).not.toBe("original-id");
      expect(runtime.cwd).toBe(cwd);
      expect(runtime.session.messages).toMatchObject([{ role: "user", content: "Kept history" }]);
      expect(() => acquireExisting(runtime.session.sessionFile!)).toThrow();
      expect(await readFile(source, "utf8")).toBe(original);
      expect((await readdir(store)).some(name => name.startsWith("source"))).toBe(false);
      const forkPath = runtime.session.sessionFile!;
      await runtime.switchSession(forkPath);
      expect(runtime.cwd).toBe(cwd);
    } finally { await adapter.dispose(); }
  });

  it.each(["continue", "fork", "cancel"] as const)("routes extension switching through the same %s recovery policy and keeps withSession", async choice => {
    const { cwd, source, original, runtime, adapter, store } = await fixture();
    try {
      const before = await readdir(store);
      const initialPath = runtime.session.sessionFile;
      const select = vi.fn(async (_title: string, options: string[]) => options[choice === "continue" ? 0 : choice === "fork" ? 1 : 2]);
      await adapter.extensions.bindExtensionUi(ui(select));
      const withSession = vi.fn(async () => {});
      const result = await runtime.session.extensionRunner!.createCommandContext().switchSession(source, { withSession });
      expect(result.cancelled).toBe(choice === "cancel");
      expect(select).toHaveBeenCalledWith(expect.stringContaining("Session cwd does not exist:"), [
        `Continue in ${cwd} (asks again next time)`, `Fork into ${cwd} (new session ID, original kept)`, "Cancel",
      ]);
      expect(withSession).toHaveBeenCalledTimes(choice === "cancel" ? 0 : 1);
      if (choice === "cancel") {
        expect(runtime.session.sessionFile).toBe(initialPath);
        expect(await readdir(store)).toEqual(before);
      } else {
        expect(runtime.cwd).toBe(cwd);
        expect(runtime.session.sessionId === "original-id").toBe(choice === "continue");
      }
      expect(await readFile(source, "utf8")).toBe(original);
    } finally { await adapter.dispose(); }
  });

  it("does not delete an adopted fork if a post-replacement callback fails", async () => {
    const { source, runtime, adapter } = await fixture();
    try {
      const bridge = ui(async (_title, options) => options[1]);
      await adapter.extensions.bindExtensionUi(bridge);
      await expect(runtime.session.extensionRunner!.createCommandContext().switchSession(source, {
        withSession: async () => { throw new Error("callback failed after adoption"); },
      })).rejects.toThrow("callback failed after adoption");
      expect(runtime.session.sessionId).not.toBe("original-id");
      expect(await readFile(runtime.session.sessionFile!, "utf8")).toContain(runtime.session.sessionId);
      expect(() => acquireExisting(runtime.session.sessionFile!)).toThrow();
    } finally { await adapter.dispose(); }
  });

  it.each(["veto", "failure"] as const)("removes an unadopted fork after switch %s", async outcome => {
    const { source, runtime, adapter, store } = await fixture();
    try {
      const before = await readdir(store);
      const switchSession = runtime.switchSession.bind(runtime);
      vi.spyOn(runtime, "switchSession").mockImplementation(async (path, options) => {
        if (path === source) return switchSession(path, options);
        if (outcome === "failure") throw new Error("replacement refused");
        return { cancelled: true };
      });
      expect(await adapter.executeWorkflow({ command: "resume", argument: source, cwdRecoveryChoice: "fork" })).toMatchObject({ outcome: outcome === "veto" ? "cancelled" : "failed" });
      expect(await readdir(store)).toEqual(before);
    } finally { await adapter.dispose(); }
  });
});
