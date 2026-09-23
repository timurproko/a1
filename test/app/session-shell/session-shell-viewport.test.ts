import { memoryHistory } from "./prompt-history-fixture.js";
import { PromptHistoryService } from "../../../src/features/prompt-history/index.js";
import { PromptHistoryStore } from "../../../src/features/prompt-history/store.js";
import { resolvePromptHistoryPath } from "../../../src/features/prompt-history/paths.js";
import { holdHistoryLock } from "../../support/history-lock.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { describe, expect, it, onTestFailed, onTestFinished, vi } from "vitest";

const DEQUEUE_HINT = `${process.platform === "darwin" ? "Option" : "Alt"}+Up to edit all queued messages`;
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
import { screenshotPng } from "../../fixtures/image-sources.js";
import { applyPiTheme } from "../../../src/integrations/pi/components/index.js";
import { Session, fixture, nextImmediate } from "./session-shell-fixture.js";

describe("OwnedUiSessionShell viewport and streaming", () => {
  it("quietly recovers combined history contention and a 16,384-update assistant/tool burst with interactive input", async () => {
    const root = await mkdtemp(join(tmpdir(), "combined-history-pressure-"));
    const options = { dataDir: root, profileRoot: join(root, "profile"), limit: 100 };
    const store = new PromptHistoryService(options);
    expect(await store.record({ id: "seed", text: "saved seed", kind: "prompt", timestamp: 0 })).toBe("committed");
    const phases: Array<{ phase: string; pendingDepth: number }> = [];
    const { shell, terminal, engine, adapter } = await fixture([], [], true, undefined, undefined, undefined,
      { onEvent: event => phases.push(event) }, undefined, { store, limit: 100 });
    const notifications = vi.spyOn(shell.root, "addExtensionNotification");
    const stdout = vi.spyOn(process.stdout, "write"); const stderr = vi.spyOn(process.stderr, "write");
    const location = resolvePromptHistoryPath(options.dataDir, options.profileRoot);
    let lock: Awaited<ReturnType<typeof holdHistoryLock>> | undefined;
    try {
      await adapter.flushEvents();
      lock = await holdHistoryLock(location.path);
      await shell.submit("saved during contention");
      await vi.waitFor(() => expect(store.diagnostics().failures.busy).toBeGreaterThan(0), { timeout: 2500 });
      shell.root.editor.setText("draft");
      terminal.input("\u001b[A"); terminal.input("\u001b[A");
      await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("saved during contention"));
      terminal.input("\u001b[B");
      await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("draft"));
      terminal.input("\u001b[F"); await nextImmediate();
      engine.session.isStreaming = true;
      engine.session.emit({ type: "agent_start" });
      const messages = Array.from({ length: 16 }, (_, index) => ({ role: "assistant", timestamp: index + 100, content: [{ type: "text", text: "" }] }));
      const tools = Array.from({ length: 16 }, (_, index) => ({ id: `load-${index}`, text: "" }));
      for (let burst = 0; burst < 8; burst++) {
        for (let offset = 0; offset < 2048; offset++) {
          const index = burst * 2048 + offset;
          if (index % 32 < 16) {
            const message = messages[index % 16]!; message.content[0]!.text += ` ${index}`;
            engine.session.emit({ type: "message_update", message });
          } else {
            const tool = tools[index % 16]!; tool.text += ` ${index}`;
            engine.session.emit({ type: "tool_execution_update", toolCallId: tool.id, toolName: "bash", partialResult: { content: [{ type: "text", text: tool.text }] } });
          }
        }
        terminal.input("x"); terminal.input("\u001b[<35;10;3M");
        await nextImmediate(); shell.runtime.renderNow();
        expect(shell.root.editor.getText()).toBe(`draft${"x".repeat(burst + 1)}`);
      }
      terminal.input("\u001b"); await vi.waitFor(() => expect(engine.session.calls).toContain("abort"));
      for (const message of messages) engine.session.emit({ type: "message_end", message });
      for (const tool of tools) engine.session.emit({ type: "tool_execution_end", toolCallId: tool.id, toolName: "bash", result: { content: [{ type: "text", text: tool.text }] } });
      engine.session.emit({ type: "agent_settled" });
      await adapter.flushEvents(); await nextImmediate(); shell.runtime.renderNow();
      expect(adapter.view().transcript.map(block => block.text).sort()).toEqual([...messages.map(message => message.content[0]!.text), ...tools.map(tool => tool.text)].sort());
      expect(adapter.view().lifecycle).toBe("ready");
      expect(phases.at(-1)?.pendingDepth).toBe(0);
      expect(adapter.deliveryDiagnostics().superseded).toBeGreaterThan(15_000);
      expect(adapter.deliveryDiagnostics()).toMatchObject({ overloads: 0, pending: 0, bytes: 0 });
      expect(adapter.deliveryDiagnostics().peakNodes).toBeLessThanOrEqual(1024);
      expect(adapter.deliveryDiagnostics().peakBytes).toBeLessThanOrEqual(8 * 1024 * 1024);
      await lock.released;
      await vi.waitFor(() => expect(store.diagnostics().pending).toBe(0), { timeout: 10_000 });
      const saved = new PromptHistoryStore(location.path, location.profileId, 100);
      try { expect(saved.snapshot().entries.map(entry => entry.text)).toEqual(["saved during contention", "saved seed"]); }
      finally { saved.close(); }
      expect(store.diagnostics().recoveries).toBeGreaterThan(0);
      expect(store.diagnostics().timers).toBeLessThanOrEqual(3);
      await shell.dispose();
      expect(store.diagnostics()).toMatchObject({ state: "closed", pending: 0, timers: 0 });
      expect(notifications).not.toHaveBeenCalled();
      const output = JSON.stringify([terminal.writes, adapter.view().status, adapter.view().diagnostics, stdout.mock.calls, stderr.mock.calls]);
      expect(output).not.toMatch(/prompt history|backpressure|coalesc|recover(y|ing)|could not finish saving/i);
      expect(stdout).not.toHaveBeenCalled(); expect(stderr).not.toHaveBeenCalled();
    } finally {
      stdout.mockRestore(); stderr.mockRestore();
      await lock?.stop(); await shell.dispose(); await store.close();
      await rm(root, { recursive: true, force: true });
    }
  }, 20_000);

  it.each(["shortcut", "terminal", "right-click"])("renders large text as one chip through %s and records the full prompt", async gesture => {
    const history = memoryHistory();
    const payload = Array.from({ length: 136 }, (_, index) => `line ${index} 日本語 [paste #999 1001 chars]`).join("\n");
    const { shell, terminal, engine } = await fixture([], [], true, undefined, { readText: async () => payload },
      undefined, undefined, undefined, { store: history.store, limit: 100 });
    try {
      terminal.resize(80, 24); shell.root.editor.setText("before "); shell.runtime.renderNow();
      if (gesture === "shortcut") terminal.input("\x16");
      else if (gesture === "terminal") terminal.input(`\x1b[200~${payload}\x1b[201~`);
      else {
        const row = shell.root.render(80).map(stripTerminalSequences).findIndex(line => line.includes("before ")) + 1;
        terminal.input(`\x1b[<2;8;${row}M\x1b[<2;8;${row}m`);
      }
      await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("before [paste #1 +136 lines]"));
      const frame = stripTerminalSequences(shell.root.editor.render(80).join("\n"));
      expect(frame).toContain("[paste #1 +136 lines]"); expect(frame).not.toContain("line 135");
      terminal.input(" after"); await nextImmediate(); terminal.input("\r");
      await vi.waitFor(() => expect(engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual([`prompt:before ${payload} after`]));
      expect(engine.session.promptOptions).toHaveLength(1);
      expect(engine.session.promptOptions[0] ?? {}).not.toHaveProperty("images");
      expect(history.submitted.map(item => item.text)).toEqual([`before ${payload} after`]);
    } finally { await shell.dispose(); }
  });

  it.each(["ordinary", "steer", "follow-up", "compaction", "compaction-follow-up"])("waits for a pending large text %s submission and sends its captured payload once", async mode => {
    let release!: (text: string) => void;
    const read = new Promise<string>(resolve => { release = resolve; });
    const payload = "original payload 👩‍💻\n".repeat(12).trim();
    const { shell, terminal, engine, adapter } = await fixture([], [], true, undefined, { readText: () => read });
    try {
      if (mode.startsWith("compaction")) { engine.session.isCompacting = true; engine.session.emit({ type: "compaction_start", reason: "manual" }); }
      else if (mode !== "ordinary") engine.session.emit({ type: "agent_start" });
      await adapter.flushEvents();
      terminal.input("before "); terminal.input("\x16");
      const draft = shell.root.editor.getText();
      const pending = mode.endsWith("follow-up") ? shell.queueFollowUp() : shell.submit(draft);
      const duplicate = mode.endsWith("follow-up") ? pending : shell.submit(draft);
      shell.root.editor.setText("newer draft");
      expect(engine.session.promptOptions).toHaveLength(0);
      release(payload); expect((await pending).outcome).toBe("completed"); await duplicate;
      if (mode.startsWith("compaction")) {
        // Invariant: the engine queue holds the captured payload once while compaction runs; ending it starts the run.
        expect(engine.session.promptOptions).toHaveLength(0);
        expect(engine.session.queued).toEqual([{ mode: mode.endsWith("follow-up") ? "followUp" : "steer", text: `before ${payload}` }]);
        engine.session.isCompacting = false;
        engine.session.emit({ type: "compaction_end", reason: "manual", result: {}, aborted: false, willRetry: false });
        await adapter.flushEvents(); await nextImmediate();
        expect(engine.session.queued).toEqual([]);
      }
      expect(engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual([`prompt:before ${payload}`]);
      expect(engine.session.promptOptions).toHaveLength(1);
      expect(engine.session.promptOptions[0] ?? {}).not.toHaveProperty("images");
      if (mode !== "ordinary") expect(engine.session.promptOptions[0]).toMatchObject({ streamingBehavior: mode.endsWith("follow-up") ? "followUp" : "steer" });
      expect(shell.root.editor.getText()).toBe("newer draft");
    } finally { await shell.dispose(); }
  });

  it.each(["delete", "cancel", "session", "dispose"])("does not resurrect or dispatch a pending large text paste after %s", async action => {
    let release!: (text: string) => void;
    const read = new Promise<string>(resolve => { release = resolve; });
    const { shell, terminal, engine, adapter } = await fixture([], [], true, undefined, { readText: () => read });
    try {
      terminal.input("\x16"); await nextImmediate();
      let pending: Promise<unknown> | undefined;
      if (action === "delete") { terminal.input("\x01"); terminal.input("\x7f"); }
      if (action === "cancel") { pending = shell.submit(shell.root.editor.getText()); await shell.interrupt(); }
      if (action === "session") { await engine.rebindSession?.(new Session()); await adapter.flushEvents(); }
      if (action === "dispose") await shell.dispose();
      await nextImmediate(); shell.root.editor.setText("newer");
      release("large late payload\n".repeat(136)); await pending; await nextImmediate(); await nextImmediate();
      expect(shell.root.editor.getText()).toBe("newer"); expect(engine.session.promptOptions).toHaveLength(0);
    } finally { await shell.dispose(); }
  });

  it.each(["session", "dispose"])("does not adopt late image bytes after %s teardown", async boundary => {
    let release!: (value: { data: string; mimeType: string }) => void;
    const image = new Promise<{ data: string; mimeType: string }>(resolve => { release = resolve; });
    const { shell, terminal, engine, adapter } = await fixture([], [], true, undefined, { readText: async () => null, readImage: () => image });
    try {
      terminal.input("\x16"); await nextImmediate();
      if (boundary === "session") { await engine.rebindSession?.(new Session()); await adapter.flushEvents(); }
      else await shell.dispose();
      shell.root.editor.setText("newer draft"); await nextImmediate();
      const writes = terminal.writes.length;
      release({ data: screenshotPng(32, 32).toString("base64"), mimeType: "image/png" });
      await nextImmediate(); await nextImmediate();
      expect(shell.root.editor.getText()).toBe("newer draft");
      expect(shell.root.preparePromptSubmission("newer draft").images).toEqual([]);
      if (boundary === "dispose") {
        expect(terminal.active).toBe(false);
        expect(terminal.writes).toHaveLength(writes);
        expect(terminal.writes.join("")).toContain("\u001b[?1049l");
      }
    } finally { release({ data: "", mimeType: "image/png" }); await shell.dispose(); }
  });

  it.each(["waiting", "compaction"])("recovers a large text %s queue without losing or double-expanding its payload", async mode => {
    let release!: (text: string) => void;
    const read = new Promise<string>(resolve => { release = resolve; });
    const payload = "literal [paste #999 1001 chars]\n".repeat(12).trim();
    const { shell, terminal, engine, adapter } = await fixture([], [], true, undefined, { readText: () => read });
    try {
      if (mode === "compaction") { engine.session.isCompacting = true; engine.session.emit({ type: "compaction_start", reason: "manual" }); await adapter.flushEvents(); }
      await engine.session.steer("queued steer");
      terminal.input("\x16"); const draft = shell.root.editor.getText();
      const pending = shell.submit(draft);
      if (mode === "compaction") { release(payload); await pending; }
      await engine.session.followUp("queued follow");
      shell.restoreQueuedInput();
      if (mode === "waiting") { release(payload); await pending; }
      await vi.waitFor(() => expect(shell.root.hasPendingPastes(draft)).toBe(false));
      expect(engine.session.promptOptions).toHaveLength(0);
      const restored = shell.root.preparePromptSubmission(shell.root.editor.getText()).text;
      expect(restored).toBe(mode === "waiting" ? `${payload}\nqueued steer\nqueued follow` : `queued steer\n${payload}\nqueued follow`);
      if (mode === "compaction") {
        engine.session.isCompacting = false;
        engine.session.emit({ type: "compaction_end", reason: "manual", result: {}, aborted: false, willRetry: false });
        await adapter.flushEvents(); await nextImmediate();
        expect(engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual([]);
      }
      await shell.submit(shell.root.editor.getText());
      expect(engine.session.calls.filter(call => call.startsWith("prompt:"))).toEqual([`prompt:${restored}`]);
    } finally { await shell.dispose(); }
  });

  it("wraps ordinary transcript content through the rail overlay column", async () => {
    const word = "x".repeat(60);
    const { terminal, shell } = await fixture([
      { role: "assistant", content: [{ type: "text", text: word }], timestamp: Date.now() },
    ], [], true);
    terminal.resize(60, 12);
    const frame = shell.root.render(60).map(row => stripTerminalSequences(row));
    expect(frame.some(row => row.trim() === "x".repeat(58))).toBe(true);
    expect(frame.every(row => row.trim() !== "x".repeat(57))).toBe(true);
    await shell.dispose();
  });

  it("keeps an overflowing Working status in the scrollable tail while transcript text scrolls", async () => {
    const messages = Array.from({ length: 18 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: [{ type: "text", text: `Status transcript ${index}` }],
      timestamp: Date.now() + index,
    }));
    const { engine, terminal, shell } = await fixture(messages, [], true);
    try {
      terminal.resize(60, 12);
      engine.session.emit({ type: "agent_start" });
      await shell.backend.flushEvents();
      const workingFrame = shell.root.render(60);
      const workingRowIndex = workingFrame.findIndex(row => stripTerminalSequences(row).includes("Working"));
      const workingColumn = stripTerminalSequences(workingFrame[workingRowIndex] ?? "").indexOf("Working") + 1;
      expect(workingRowIndex).toBeGreaterThanOrEqual(0);
      expect(workingRowIndex).toBe(shell.root.viewportFrameDescriptor()!.transcript!.rowEnd - 1);
      const clickWorking = () => {
        shell.root.handleViewportPreInput(`\u001b[<0;${workingColumn};${workingRowIndex + 1}M`);
        shell.root.handleViewportPreInput(`\u001b[<0;${workingColumn};${workingRowIndex + 1}m`);
      };
      clickWorking();
      clickWorking();
      expect(shell.root.render(60)[workingRowIndex]).not.toContain("\u001b[48;2;38;79;120m");
      expect(shell.root.handleViewportPreInput("\u0003")).toMatchObject({ data: "\u0003", consumed: false });

      const writesBeforeWheel = terminal.writes.length;
      terminal.input("\u001b[<64;30;3M");
      shell.runtime.renderNow();
      const wheelWrites = terminal.writes.slice(writesBeforeWheel);
      expect(wheelWrites.length).toBeGreaterThan(0);
      expect(wheelWrites.some(write => write.includes("\u001b[2K"))).toBe(true);
      expect(shell.root.render(60).some(row => stripTerminalSequences(row).includes("Working"))).toBe(false);
      terminal.input("\u001b[1;5F");
      shell.runtime.renderNow();
      expect(shell.root.render(60).some(row => stripTerminalSequences(row).includes("Working"))).toBe(true);
    } finally {
      await shell.dispose();
    }
  });

  it("keeps Pi's queued steering order in the transient tail and scrolls it with Working", async () => {
    const messages = Array.from({ length: 18 }, (_, index) => ({
      role: "assistant",
      content: [{ type: "text", text: `queue-transcript-${index}` }],
      timestamp: Date.now() + index,
    }));
    const { engine, terminal, shell } = await fixture(messages, [], true);
    try {
      terminal.resize(60, 18);
      engine.session.emit({ type: "agent_start" });
      engine.session.emit({ type: "queue_update", steering: ["first", "second"], followUp: [] });
      await shell.backend.flushEvents();

      const rows = shell.root.render(60).map(row => stripTerminalSequences(row));
      const first = rows.findIndex(row => row.includes("Steering: first"));
      const second = rows.findIndex(row => row.includes("Steering: second"));
      const hint = rows.findIndex(row => row.includes(DEQUEUE_HINT));
      const working = rows.findIndex(row => row.includes("Working"));
      const viewportEnd = shell.root.viewportFrameDescriptor()!.transcript!.rowEnd - 1;
      expect(first).toBeGreaterThanOrEqual(0);
      expect(second).toBeGreaterThan(first);
      expect(hint).toBeGreaterThan(second);
      expect(working).toBeGreaterThan(hint);
      expect(working).toBe(viewportEnd);

      for (let index = 0; index < 6; index += 1) terminal.input("\u001b[<64;30;1M");
      const detached = shell.root.render(60).map(row => stripTerminalSequences(row));
      expect(detached.some(row => row.includes("Steering: first"))).toBe(false);
      expect(detached.some(row => row.includes("Steering: second"))).toBe(false);
      expect(detached.some(row => row.includes(DEQUEUE_HINT))).toBe(false);
      expect(detached.some(row => row.includes("Working"))).toBe(false);
      expect(detached.some(row => row.includes("Jump to bottom (Ctrl+End) ↓"))).toBe(true);
      terminal.input("\u001b[1;5F");
      const followed = shell.root.render(60).map(row => stripTerminalSequences(row));
      expect(followed.some(row => row.includes("Steering: first"))).toBe(true);
      expect(followed.some(row => row.includes("Working"))).toBe(true);
    } finally {
      await shell.dispose();
    }
  });

  it("bottom-aligns steering above Working while fitting and keeps true dock rows stable at overflow", async () => {
    const { engine, terminal, shell } = await fixture([
      { role: "assistant", content: [{ type: "text", text: "fitting transcript" }], timestamp: 1 },
    ], [], true);
    try {
      terminal.resize(60, 18);
      const settledRows = shell.root.render(60).map(row => stripTerminalSequences(row));
      const settledTranscriptRow = settledRows.findIndex(row => row.includes("fitting transcript"));
      engine.session.emit({ type: "agent_start" });
      engine.session.emit({ type: "queue_update", steering: ["stable queue"], followUp: [] });
      await shell.backend.flushEvents();

      const positions = () => {
        const rows = shell.root.render(60).map(row => stripTerminalSequences(row));
        const descriptor = shell.root.viewportFrameDescriptor()!;
        return {
          rows,
          queue: rows.findIndex(row => row.includes("Steering: stable queue")),
          hint: rows.findIndex(row => row.includes(DEQUEUE_HINT)),
          working: rows.findIndex(row => row.includes("Working")),
          viewportEnd: descriptor.transcript!.rowEnd - 1,
          dockStart: descriptor.dock!.rowStart - 1,
          alignmentGap: descriptor.transientAlignmentGapRows,
        };
      };
      const fitting = positions();
      expect(fitting.rows.findIndex(row => row.includes("fitting transcript"))).toBe(settledTranscriptRow);
      expect(fitting.queue).toBeGreaterThanOrEqual(0);
      expect(fitting.hint).toBe(fitting.queue + 1);
      expect(fitting.working).toBeGreaterThan(fitting.hint);
      expect(fitting.rows.slice(fitting.hint + 1, fitting.working).every(row => row.trim() === "")).toBe(true);
      expect(fitting.working).toBe(fitting.viewportEnd);
      expect(fitting.working).toBeLessThan(fitting.dockStart);
      expect(fitting.alignmentGap).toBeGreaterThan(0);

      engine.session.emit({
        type: "message_start",
        message: { role: "assistant", content: [{ type: "text", text: "another fitting row" }], timestamp: 2 },
      });
      await shell.backend.flushEvents();
      const grownButFitting = positions();
      expect(grownButFitting.queue).toBe(fitting.queue);
      expect(grownButFitting.hint).toBe(fitting.hint);
      expect(grownButFitting.working).toBe(fitting.working);
      expect(grownButFitting.dockStart).toBe(fitting.dockStart);
      expect(grownButFitting.alignmentGap).toBeLessThan(fitting.alignmentGap);

      for (let index = 0; index < 16; index += 1) {
        engine.session.emit({
          type: "message_start",
          message: { role: "user", content: [{ type: "text", text: `overflow prompt ${index}` }], timestamp: 10 + index },
        });
      }
      await shell.backend.flushEvents();
      const overflowing = positions();
      expect(overflowing.dockStart).toBe(fitting.dockStart);
      expect(overflowing.alignmentGap).toBe(0);
      expect(overflowing.working).toBe(overflowing.viewportEnd);
      expect(overflowing.queue).toBeGreaterThanOrEqual(0);
      expect(overflowing.hint).toBeGreaterThan(overflowing.queue);
      expect(overflowing.rows.filter(row => row.includes("Steering: stable queue"))).toHaveLength(1);
      expect(overflowing.rows.filter(row => row.includes("Working"))).toHaveLength(1);

      engine.session.emit({ type: "queue_update", steering: [], followUp: [] });
      await shell.backend.flushEvents();
      const cleared = positions();
      expect(cleared.queue).toBe(-1);
      expect(cleared.hint).toBe(-1);
      expect(cleared.working).toBe(cleared.viewportEnd);
      expect(cleared.rows.filter(row => row.includes("Working"))).toHaveLength(1);
    } finally {
      await shell.dispose();
    }
  });

  it("keeps the live working tail current through completion, reset, and working replacements", async () => {
    const messages = Array.from({ length: 18 }, (_, index) => ({
      role: "assistant",
      content: [{ type: "text", text: `tail-transcript-${index}` }],
      timestamp: Date.now() + index,
    }));
    const { engine, terminal, shell } = await fixture(messages, [], true);
    try {
      terminal.resize(60, 12);
      engine.session.emit({ type: "agent_start" });
      await shell.backend.flushEvents();
      const plainRows = () => shell.root.render(60).map(row => stripTerminalSequences(row));
      expect(plainRows().some(row => row.includes("Working…"))).toBe(true);
      shell.root.setExtensionWorking("Indexing sources");
      shell.runtime.renderNow();
      expect(plainRows().some(row => row.includes("Indexing sources…"))).toBe(true);
      expect(plainRows().some(row => row.includes("Working…"))).toBe(false);

      terminal.input("\u001b[<64;30;1M");
      shell.runtime.renderNow();
      const detached = plainRows();
      expect(detached.some(row => row.includes("Indexing sources"))).toBe(false);
      expect(detached.some(row => row.includes("Working"))).toBe(false);
      shell.root.setExtensionWorking("Still indexing");
      shell.runtime.renderNow();
      expect(plainRows().some(row => row.includes("Still indexing"))).toBe(false);
      expect(plainRows().some(row => row.includes("Indexing sources"))).toBe(false);
      terminal.input("\u001b[1;5F");
      shell.runtime.renderNow();
      expect(plainRows().some(row => row.includes("Still indexing…"))).toBe(true);

      engine.session.emit({ type: "message_end", message: {
        role: "assistant",
        content: [{ type: "text", text: "tail completion" }],
        timestamp: Date.now(),
      } });
      engine.session.emit({ type: "agent_settled" });
      await shell.backend.flushEvents();
      const completed = plainRows();
      expect(completed.some(row => row.includes("Still indexing"))).toBe(false);
      expect(completed.some(row => row.includes("Working"))).toBe(false);
      expect(engine.session.messages.some((message: unknown) =>
        String((message as { content?: Array<{ text?: unknown }> } | undefined)?.content?.[0]?.text ?? "").includes("Working")
      )).toBe(false);

      shell.root.setExtensionWorking("Indexing sources");
      terminal.input("\u001b[<64;30;1M");
      shell.runtime.renderNow();
      await engine.newSession();
      shell.runtime.renderNow();
      const replaced = plainRows();
      expect(replaced.some(row => row.includes("Indexing sources"))).toBe(false);
      expect(replaced.some(row => row.includes("Working"))).toBe(false);
      expect(replaced.some(row => row.includes("tail completion"))).toBe(false);
    } finally {
      await shell.dispose();
    }
  });

  it("does not apply a queued partial after a full-view final presentation preempts it", async () => {
    const { shell, adapter, engine } = await fixture([], [], true);
    try {
      const message = { role: "assistant", timestamp: 100, content: [{ type: "text", text: "obsolete partial" }] };
      engine.session.emit({ type: "message_update", message });
      const partial = adapter.view().transcript[0]!;
      message.content[0]!.text = "complete final content";
      engine.session.emit({ type: "message_end", message });
      shell.root.update(adapter.view());
      shell.root.applyTranscriptBlock(partial);
      shell.runtime.renderNow();
      expect(stripTerminalSequences(shell.root.render(100).join("\n"))).toContain("complete final content");
      expect(stripTerminalSequences(shell.root.render(100).join("\n"))).not.toContain("obsolete partial");
      await adapter.flushEvents();
    } finally { await shell.dispose(); }
  });

  it("applies a streamed chunk through the named block and keeps the document in order", async () => {
    const { engine, adapter, shell } = await fixture();
    const rowsOf = () => shell.root.render(80).map(row => stripTerminalSequences(row).trimEnd());
    const assistant = (text: string) => ({
      role: "assistant",
      content: [{ type: "text", text }],
      stopReason: "pending",
      timestamp: 5,
    });

    engine.session.emit({ type: "agent_start" });
    engine.session.emit({ type: "message_start", message: { role: "user", content: [{ type: "text", text: "Question" }], timestamp: 1 } });
    engine.session.emit({ type: "message_start", message: assistant("") });
    await adapter.flushEvents();

    engine.session.emit({ type: "message_update", message: assistant("partial"), assistantMessageEvent: { delta: "partial" } });
    await adapter.flushEvents();
    expect(rowsOf().some(row => row.includes("partial"))).toBe(true);

    engine.session.emit({ type: "message_update", message: assistant("partial answer"), assistantMessageEvent: { delta: " answer" } });
    await adapter.flushEvents();
    const streamed = rowsOf();
    const question = streamed.findIndex(row => row.includes("Question"));
    const answer = streamed.findIndex(row => row.includes("partial answer"));
    expect(question).toBeGreaterThan(-1);
    // Invariant: the chunk went through the block it named without disturbing the order around it.
    expect(answer).toBeGreaterThan(question);
    await shell.dispose();
  });

  it("bounds custom-viewport terminal frames for a burst and flushes final content immediately", async () => {
    let now = 0;
    let nextTimer = 1;
    const scheduled = new Map<number, { readonly at: number; readonly callback: () => void }>();
    const scheduler = {
      now: () => now,
      setTimeout: (callback: () => void, delayMs: number) => {
        const timer = nextTimer++;
        scheduled.set(timer, { at: now + delayMs, callback });
        return timer as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimeout: (timer: ReturnType<typeof setTimeout>) => { scheduled.delete(timer as unknown as number); },
    };
    const advancePresentation = (delayMs: number) => {
      now += delayMs;
      for (const [timer, task] of [...scheduled]) {
        if (task.at > now) continue;
        scheduled.delete(timer);
        task.callback();
      }
    };
    const { engine, adapter, terminal, shell } = await fixture(
      [], [], true, undefined, undefined, { scheduler },
    );
    const assistant = (text: string, stopReason = "pending") => ({
      role: "assistant",
      content: [{ type: "text", text }],
      stopReason,
      timestamp: 5,
    });
    const presentedFrames = () => terminal.writes.filter(write => write.includes("\u001b[?2026h")).length;
    shell.runtime.renderNow();
    terminal.writes.length = 0;

    engine.session.emit({ type: "agent_start" });
    engine.session.emit({ type: "message_start", message: assistant("one") });
    await adapter.flushEvents();
    await new Promise(resolve => setTimeout(resolve, 25));
    expect(presentedFrames()).toBe(1);
    terminal.writes.length = 0;

    for (const text of ["one two", "one two three", "one two three four"]) {
      engine.session.emit({
        type: "message_update",
        message: assistant(text),
        assistantMessageEvent: { type: "text_delta", delta: text },
      });
      await adapter.flushEvents();
    }
    expect(presentedFrames()).toBe(0);
    advancePresentation(33);
    await new Promise(resolve => setTimeout(resolve, 25));
    expect(presentedFrames()).toBe(1);
    expect(shell.root.render(80).join("\n")).toContain("one two three four");
    terminal.writes.length = 0;

    engine.session.emit({
      type: "message_update",
      message: assistant("one two three four five"),
      assistantMessageEvent: { type: "text_delta", delta: " five" },
    });
    await adapter.flushEvents();
    expect(presentedFrames()).toBe(0);
    const selectionFrame = shell.root.render(80).map(row => stripTerminalSequences(row));
    const selectionRow = selectionFrame.findIndex(row => row.includes("one two three four five"));
    const selectionColumn = (selectionFrame[selectionRow] ?? "").indexOf("one") + 1;
    terminal.input(`\u001b[<0;${selectionColumn};${selectionRow + 1}M`);
    terminal.input(`\u001b[<32;${selectionColumn + 1};${selectionRow + 1}M`);
    await new Promise(resolve => setTimeout(resolve, 25));
    const selectionFrames = presentedFrames();
    expect(selectionFrames).toBeGreaterThanOrEqual(1);
    expect(shell.root.render(80).join("\n")).toContain("\u001b[48;2;38;79;120m");
    terminal.input(`\u001b[<0;${selectionColumn + 1};${selectionRow + 1}m`);
    terminal.input("x");
    await new Promise(resolve => setTimeout(resolve, 25));
    const immediateFrames = presentedFrames();
    expect(immediateFrames).toBeGreaterThanOrEqual(selectionFrames);
    advancePresentation(33);
    await new Promise(resolve => setTimeout(resolve, 25));
    expect(presentedFrames()).toBeLessThanOrEqual(immediateFrames + 1); // Concurrency: Working animation may tick independently.
    expect(shell.root.render(80).join("\n")).toContain("one two three four five");
    expect(shell.root.editor.getText()).toBe("x");
    terminal.writes.length = 0;

    engine.session.emit({ type: "message_end", message: assistant("one two three four final", "stop") });
    await adapter.flushEvents();
    await new Promise(resolve => setTimeout(resolve, 25));
    const finalFrames = presentedFrames();
    // Concurrency: final content contributes one immediate frame; a due Working animation
    // may contribute one independent status frame after the longer selection interaction.
    expect(finalFrames).toBeGreaterThanOrEqual(1);
    expect(finalFrames).toBeLessThanOrEqual(2);
    expect(terminal.writes.some(write => stripTerminalSequences(write).includes("final"))).toBe(true);
    expect(shell.root.render(80).join("\n")).toContain("final");
    await shell.dispose();
  }, 15_000);

  it("reuses a finalized block's rows until its revision, the width, the theme, or expansion changes", async () => {
    const { engine, adapter, shell } = await fixture();

    engine.session.emit({ type: "agent_start" });
    engine.session.emit({
      type: "message_start",
      message: { role: "assistant", content: [{ type: "text", text: "Settled answer" }], timestamp: 1 },
    });
    engine.session.emit({ type: "agent_end", messages: [], willRetry: false });
    engine.session.emit({ type: "agent_settled" });
    await adapter.flushEvents();

    const rowsOf = (width: number) => shell.root.render(width).map(row => stripTerminalSequences(row).trimEnd());
    const first = rowsOf(80);
    expect(first.some(row => row.includes("Settled answer"))).toBe(true);
    // Performance: a repeat frame at the same width shows the same content from the cached rows.
    expect(rowsOf(80)).toEqual(first);
    // Performance: a different width is a different render rather than a stale hit.
    expect(rowsOf(52).some(row => row.includes("Settled answer"))).toBe(true);
    expect(rowsOf(80)).toEqual(first);

    shell.root.setToolsExpanded(!shell.root.toolsExpanded);
    expect(rowsOf(80).some(row => row.includes("Settled answer"))).toBe(true);

    applyPiTheme("light", false, "truecolor");
    try {
      expect(rowsOf(80).some(row => row.includes("Settled answer"))).toBe(true);
    } finally {
      applyPiTheme("dark", false, "truecolor");
    }
    await shell.dispose();
  });
});
