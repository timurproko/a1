import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createPiShellEditor, loadHistoryEditor } from "../../../../src/integrations/pi/components/index.js";
import { PromptHistoryController } from "../../../../src/integrations/pi/session-ui/prompt-history-controller.js";
import type { PromptHistoryPort, PromptHistorySnapshot, PromptHistorySubmission } from "../../../../src/contracts/owned-ui/index.js";
import { PromptHistoryService } from "../../../../src/features/prompt-history/index.js";

async function editor(root: string) {
  return createPiShellEditor({ keybindingProfile: "a1", persistentHistory: true, historyEditor: await loadHistoryEditor(), agentDir: root, cwd: root,
    getColumns: () => 80, getRows: () => 24, requestRender() {}, onSubmit() {},
  });
}

describe("history snapshot lifecycle", () => {
  it("ignores old-generation completions and reseeds the default editor without dispatch", async () => {
    const root = await mkdtemp(join(tmpdir(), "history-controller-"));
    let controller: PromptHistoryController | undefined;
    try {
      const callbacks: Array<(snapshot: PromptHistorySnapshot) => void> = [];
      let resolveWrite: (result: "committed") => void = () => {};
      const store: PromptHistoryPort = {
        start() {}, refresh() {}, close: async () => {}, onFailure: () => () => {},
        onSnapshot: callback => { callbacks.push(callback); return () => {}; },
        record: () => new Promise(resolve => { resolveWrite = resolve; }),
      };
      const input = await editor(root);
      controller = new PromptHistoryController({ editor: input, store, limit: 100, fallback: ["loaded"], active: () => true, render() {} });
      input.setText("draft");
      controller.capture("old input", "prompt", root, "old-session");
      controller.reset(["new fallback"]);
      callbacks[0]!({ revision: 10, limit: 100, entries: [{ text: "stale", submissionId: "stale" }] });
      resolveWrite("committed"); await Promise.resolve();
      input.handleInput?.("\x1b[A"); input.handleInput?.("\x1b[A");
      expect(input.getText()).toBe("new fallback");
      input.handleInput?.("\x1b[B");
      expect(input.getText()).toBe("draft");
      await controller.close();
      callbacks[1]!({ revision: 11, limit: 100, entries: [{ text: "after dispose", submissionId: "late" }] });
      expect(input.getText()).toBe("draft");
    } finally { await controller?.close(); await rm(root, { recursive: true, force: true }); }
  });

  it("restores real committed pasted text into a fresh editor and store", async () => {
    const root = await mkdtemp(join(tmpdir(), "history-restart-"));
    const options = { dataDir: root, profileRoot: join(root, "profile"), limit: 100 };
    const first = new PromptHistoryService(options);
    const text = "synthetic pasted text\n".repeat(15).trim();
    let controller: PromptHistoryController | undefined;
    const second = new PromptHistoryService(options);
    try {
      const candidate: PromptHistorySubmission = { id: "restart", text, timestamp: 1, kind: "prompt" };
      expect(await first.record(candidate)).toBe("committed"); await first.close();
      const input = await editor(root);
      controller = new PromptHistoryController({ editor: input, store: second, limit: 100, fallback: [], active: () => true, render() {} });
      controller.start();
      await vi.waitFor(() => expect(input.recall?.position().total).toBe(1));
      input.handleInput?.("\x1b[A");
      expect(input.getText()).toBe(text);
    } finally { await first.close(); await controller?.close(); await second.close(); await rm(root, { recursive: true, force: true }); }
  });

  it("applies the caller-supplied rehydrate function to every recall entry once and caches the result", async () => {
    const root = await mkdtemp(join(tmpdir(), "history-rehydrate-"));
    let controller: PromptHistoryController | undefined;
    try {
      let snapshotListener: (snapshot: PromptHistorySnapshot) => void = () => {};
      const store: PromptHistoryPort = {
        start() {}, refresh() {}, close: async () => {}, onFailure: () => () => {},
        onSnapshot: callback => { snapshotListener = callback; return () => {}; },
        record: () => Promise.resolve("skipped"),
      };
      const input = await editor(root);
      const rehydrate = vi.fn((value: string) => `HYDRATED(${value})`);
      controller = new PromptHistoryController({ editor: input, store, limit: 100, fallback: ["first", "second"], active: () => true, render() {}, rehydrate });
      // Invariant: constructor calls synchronize which rehydrates both fallback entries once each.
      expect(rehydrate).toHaveBeenCalledTimes(2);
      expect(rehydrate.mock.calls.map(call => call[0]).sort()).toEqual(["first", "second"]);
      rehydrate.mockClear();
      snapshotListener({ revision: 1, limit: 100, entries: [{ text: "alpha", submissionId: "a" }, { text: "beta", submissionId: "b" }] });
      // Invariant: two new snapshot entries rehydrate; fallback served from cache.
      expect(rehydrate).toHaveBeenCalledTimes(2);
      expect(rehydrate.mock.calls.map(call => call[0])).toEqual(["alpha", "beta"]);
      rehydrate.mockClear();
      controller.synchronize();
      // Invariant: repeated synchronize does not re-run rehydrate for entries the cache already knows.
      expect(rehydrate).not.toHaveBeenCalled();
    } finally { await controller?.close(); await rm(root, { recursive: true, force: true }); }
  });
});
