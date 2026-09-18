import { memoryHistory } from "./prompt-history-fixture.js";
import { type ExtensionUIContext } from "@earendil-works/pi-coding-agent";
import { join } from "node:path";
import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { Editor } from "@earendil-works/pi-tui";
import { describe, expect, it, onTestFailed, onTestFinished, vi } from "vitest";
// Performance: this integration file exercises real cold emitted entries; dedicated tests retain source-loader coverage.
vi.mock("../../../src/app/session-shell/paste-executor.js", async importOriginal => {
  const actual = await importOriginal<typeof import("../../../src/app/session-shell/paste-executor.js")>();
  const { coldPasteHelper } = await import("../../support/cold-clipboard-entries.js");
  return { ...actual, startPasteExecutor: (...args: Parameters<typeof actual.startPasteExecutor>) =>
    actual.startPasteExecutor(args[0], args[1], args[2], coldPasteHelper(args[3])) };
});
vi.mock("node:worker_threads", async importOriginal => {
  const actual = await importOriginal<typeof import("node:worker_threads")>();
  const { coldClipboardWorker } = await import("../../support/cold-clipboard-entries.js");
  return { ...actual, Worker: class extends actual.Worker {
    constructor(entry: string | URL, options?: import("node:worker_threads").WorkerOptions) {
      const selected = coldClipboardWorker(entry, options);
      super(selected.entry, selected.options);
    }
  } };
});
import { fixture, nextImmediate } from "./session-shell-fixture.js";

describe("OwnedUiSessionShell prompt history", () => {
  it("retains the draft and local-only recall through exceptional delivery reconciliation", async () => {
    const history = memoryHistory();
    vi.mocked(history.store.record).mockResolvedValue("skipped");
    const { shell, terminal, adapter, engine } = await fixture([], [], true, undefined, undefined, undefined, undefined, undefined,
      { store: history.store, limit: 100 });
    try {
      await shell.submit("local survivor"); shell.root.editor.setText("draft");
      await adapter.flushEvents();
      const binding = adapter.sessionBindingGeneration;
      for (let index = 0; index < 2048; index++) engine.session.emit({ type: "agent_start" });
      await expect(adapter.flushEvents()).rejects.toThrow("Engine delivery did not complete");
      expect(adapter.sessionBindingGeneration).toBe(binding);
      expect(shell.root.editor.getText()).toBe("draft");
      terminal.input("\u001b[A"); terminal.input("\u001b[A");
      await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("local survivor"));
      terminal.input("\u001b[B");
      await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("draft"));
    } finally { await shell.dispose(); }
  });

  it("keeps every classified history outcome and rejected shutdown out of normal output", async () => {
    const history = memoryHistory();
    const { shell, terminal, adapter } = await fixture([], [], true, undefined, undefined, undefined, undefined, undefined,
      { store: history.store, limit: 100 });
    const notify = vi.spyOn(shell.root, "addExtensionNotification");
    vi.mocked(history.store.record).mockResolvedValue("skipped");
    try {
      await shell.submit("local only");
      for (const code of ["busy", "unavailable", "capacity", "oversized", "schema", "corrupt", "shutdown"] as const) history.fail(code);
      vi.mocked(history.store.close).mockImplementation(async () => { history.fail("shutdown"); throw new Error("private sentinel"); });
      await shell.dispose();
      expect(notify).not.toHaveBeenCalled();
      expect(JSON.stringify([terminal.writes, adapter.view().status, adapter.view().diagnostics])).not.toMatch(/history|private sentinel|recover|capacity|unavailable|shutdown/i);
    } finally { await shell.dispose(); }
  });

  it("captures eligible user input once and never persists replay or workflow navigation", async () => {
    const history = memoryHistory();
    const { shell, engine } = await fixture([{ role: "user", content: "loaded", timestamp: 1 }], [], true,
      undefined, undefined, undefined, undefined, undefined, { store: history.store, limit: 100 });
    try {
      expect(history.store.start).toHaveBeenCalledOnce();
      expect(history.submitted).toHaveLength(0);
      await shell.submit("ordinary");
      await shell.submit("!echo test");
      await shell.submit("/skill:test arg");
      shell.root.editor.setText("follow up"); await shell.queueFollowUp();
      await shell.submit("/session");
      expect(history.submitted.map(item => [item.kind, item.text])).toEqual([
        ["prompt", "ordinary"], ["bash", "!echo test"], ["slash", "/skill:test arg"], ["follow-up", "follow up"],
      ]);
      expect(engine.session.calls).toContain("prompt:ordinary");
    } finally { await shell.dispose(); }
    expect(history.store.close).toHaveBeenCalledOnce();
  });

  it("records streaming and compaction inputs once while excluding generated backend prompts", async () => {
    const history = memoryHistory();
    const { shell, engine, adapter } = await fixture([], [], true, undefined, undefined, undefined, undefined, undefined,
      { store: history.store, limit: 100 });
    try {
      await adapter.execute({ type: "prompt", correlationId: "generated-input", sessionId: adapter.sessionId, text: "generated input" });
      expect(history.submitted).toHaveLength(0);
      engine.session.emit({ type: "agent_start" }); await adapter.flushEvents();
      await shell.submit("streaming steer");
      engine.session.emit({ type: "compaction_start", reason: "manual" }); await adapter.flushEvents();
      await shell.submit("queued steer");
      shell.root.editor.setText("queued follow"); await shell.queueFollowUp();
      expect(history.submitted.map(item => item.kind)).toEqual(["steer", "steer", "follow-up"]);
      engine.session.emit({ type: "compaction_end", reason: "manual", result: {}, aborted: false, willRetry: false });
      await adapter.flushEvents(); await nextImmediate();
      expect(history.submitted).toHaveLength(3);
      const dispatch = vi.spyOn(adapter, "execute").mockRejectedValueOnce(new Error("private provider sentinel"));
      await shell.submit("recover me");
      expect(history.submitted.filter(item => item.text === "recover me")).toHaveLength(1);
      expect(stripTerminalSequences(shell.root.render(80).join("\n"))).not.toContain("private provider sentinel");
      dispatch.mockRestore();
    } finally { await shell.dispose(); }
  });

  it("preserves a typed draft while saved history refreshes and replacement surfaces suspend synchronization", async () => {
    const history = memoryHistory();
    const { shell, terminal, engine } = await fixture([], [], true, undefined, undefined, undefined, undefined, undefined,
      { store: history.store, limit: 100 });
    try {
      shell.root.editor.setText("draft"); history.emit(["newest", "older"]);
      terminal.input("\x1b[A"); terminal.input("\x1b[A");
      await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("newest"));
      expect(stripTerminalSequences(shell.root.editor.render(80)[0]!)).toMatch(/^─── 2\/2 /u);
      history.emit(["remote", "newest", "older"]);
      expect(shell.root.editor.recall?.position()).toEqual({ index: 0, total: 2 });
      terminal.input("\x1b[B");
      await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("draft"));
      const ui = (engine.session.extensionBindings as { uiContext: ExtensionUIContext }).uiContext;
      ui.setEditorComponent(tui => new Editor(tui, {
        borderColor: text => text,
        selectList: { selectedPrefix: text => text, selectedText: text => text, description: text => text, scrollInfo: text => text, noMatch: text => text },
      }));
      expect(shell.root.usesDefaultInputSurface()).toBe(false);
      history.emit(["custom-session update"]);
      expect(shell.root.editor.recall?.position().total).toBe(3);
      ui.setEditorComponent(undefined);
      expect(shell.root.editor.recall?.position().total).toBe(1);
      expect(shell.root.editor.getText()).toBe("draft");
      expect(history.submitted).toHaveLength(0);
    } finally { await shell.dispose(); }
  });

  it("does not initialize history for the pinned comparison editor", async () => {
    const history = memoryHistory();
    const { shell } = await fixture([], [], false, undefined, undefined, undefined, undefined, undefined,
      { store: history.store, limit: 100 });
    try {
      expect(shell.root.editor.recall).toBeUndefined();
      await shell.submit("local only");
      expect(history.store.start).not.toHaveBeenCalled();
      expect(history.submitted).toHaveLength(0);
    } finally { await shell.dispose(); }
  });

  it("populates and updates current-session prompt history with pinned Up/Down draft restoration", async () => {
    const { engine, terminal, shell } = await fixture([
      { role: "user", content: [{ type: "text", text: "loaded older" }], timestamp: 1 },
      { role: "assistant", content: [{ type: "text", text: "answer" }], timestamp: 2 },
      { role: "user", content: [{ type: "text", text: "loaded newer" }], timestamp: 3 },
    ]);

    shell.root.editor.setText("draft");
    terminal.input("\x1b[A");
    expect(shell.root.editor.getText()).toBe("draft");
    terminal.input("\x1b[A");
    expect(shell.root.editor.getText()).toBe("loaded newer");
    terminal.input("\x1b[A");
    expect(shell.root.editor.getText()).toBe("loaded older");
    terminal.input("\x1b[B");
    expect(shell.root.editor.getText()).toBe("loaded newer");
    terminal.input("\x1b[B");
    expect(shell.root.editor.getText()).toBe("draft");

    shell.root.editor.setText("entered now");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(engine.session.calls).toContain("prompt:entered now");
    terminal.input("\x1b[A");
    expect(shell.root.editor.getText()).toBe("entered now");
    await shell.dispose();
  });
});
