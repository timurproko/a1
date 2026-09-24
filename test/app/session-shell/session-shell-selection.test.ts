import { SUGGESTION_CONVERSATIONS } from "../../fixtures/prompt-suggestion-conversations.js";
import { SuggestionDiagnosticCapture } from "../../../src/features/prompt-suggestions/index.js";
import { memoryHistory } from "./prompt-history-fixture.js";
import { type ExtensionUIContext } from "@earendil-works/pi-coding-agent";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CURSOR_MARKER, stripTerminalSequences } from "@earendil-works/pi-tui";
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
import { piTheme } from "../../../src/integrations/pi/components/index.js";
import { replayTerminalBackgroundCells, replayTerminalCheckpoints, replayTerminalPaint } from "../../support/rendering/terminal-paint-evidence.js";
import type { OwnedUiPromptSuggestionGeneratorPort, OwnedUiViewportSettings, OwnedUiViewportSettingsPort } from "../../../src/contracts/owned-ui/index.js";
import { fixture, nextImmediate } from "./session-shell-fixture.js";

describe("OwnedUiSessionShell transcript selection and scrolling", () => {
  it("keeps nested settings and post-resize transcript hit regions independent", async () => {
    const { shell, terminal } = await fixture([{ role: "assistant", content: [{ type: "text", text: "alpha beta gamma\n\n".repeat(100) }] }], [], true);
    try {
      terminal.resize(80, 54);
      await shell.submit("/settings");
      terminal.input("per model");
      terminal.input("\r");
      await nextImmediate();
      shell.runtime.renderNow();
      expect(shell.root.render(80).join("\n")).toContain("Per-Model Thinking Level");
      terminal.input("\u001b[<64;2;3M".repeat(4));
      shell.runtime.renderNow();
      const top = shell.root.viewportPresentationEvidence().scrollTop;
      const row = shell.root.render(80).findIndex(line => stripTerminalSequences(line).includes("alpha")) + 1;
      terminal.input(`\u001b[<0;2;${row}M\u001b[<32;7;${row}M`);
      terminal.resize(70, 48);
      terminal.input("\u001b[<32;3;2M\u001b[<0;3;2m");
      expect(shell.root.hasActiveSelection()).toBe(false);
      shell.runtime.renderNow();
      expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(top);
      terminal.input("\u001b");
      await nextImmediate();
      shell.runtime.renderNow();
      expect(shell.root.render(70).join("\n")).not.toContain("Select reasoning depth");
      expect(shell.root.usesDefaultInputSurface()).toBe(false);
      terminal.input("\u001b");
      await nextImmediate();
      shell.runtime.renderNow();
      expect(shell.root.usesDefaultInputSurface()).toBe(true);
      expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(top);
    } finally { await shell.dispose(); }
  });

  it("keeps overlay paint above transcript selection while streaming and blocks full-cover click-through", async () => {
    const { shell, terminal, engine } = await fixture([{ role: "assistant", content: [{ type: "text", text: "alpha beta gamma\n\n".repeat(100) }] }], [], true);
    try {
      terminal.resize(80, 40);
      const received: string[] = [];
      const component = { render: (width: number) => Array.from({ length: 4 }, () => "#".repeat(width)),
        invalidate() {}, handleInput: (data: string) => received.push(data) };
      const overlay = shell.runtime.showOverlay(component, { width: 20, row: 5, col: 10 });
      engine.session.emit({ type: "agent_start" });
      await shell.backend.flushEvents();
      shell.runtime.renderNow();
      terminal.input("\u001b[<64;3;3M");
      shell.runtime.renderNow();
      const top = shell.root.viewportPresentationEvidence().scrollTop;
      const selectedRow = shell.root.render(80).findIndex(row => stripTerminalSequences(row).includes("alpha")) + 1;
      terminal.input(`\u001b[<0;2;${selectedRow}M\u001b[<32;15;8M`);
      engine.session.emit({ type: "message_start", message: { role: "assistant", content: [{ type: "text", text: "new streamed output" }], timestamp: 5 } });
      await shell.backend.flushEvents();
      shell.runtime.renderNow();
      expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(top);
      const replay = await replayTerminalPaint(terminal.writes.map(data => ({ data, atMs: 0 })), { columns: 80, rows: 40, synchronizedUpdates: "honor" });
      expect(replay.final.rows[5]!.slice(10, 30)).toBe("#".repeat(20));
      const backgrounds = await replayTerminalBackgroundCells(terminal.writes.map(data => ({ data, atMs: 0 })), { columns: 80, rows: 40 });
      expect(backgrounds.some(cell => cell.color === 0x264f78)).toBe(true);
      expect(backgrounds.filter(cell => cell.row >= 6 && cell.row <= 9 && cell.column >= 11 && cell.column <= 30)
        .some(cell => cell.color === 0x264f78)).toBe(false);
      expect(received).toEqual([]);
      terminal.input("\u001b[<0;15;8m");
      overlay.hide();
      const full = shell.runtime.showOverlay({ ...component, render: (width: number) => Array.from({ length: 40 }, () => "#".repeat(width)) }, { width: "100%", anchor: "top-left" });
      shell.runtime.renderNow();
      terminal.input("\u001b[<64;3;3M\u001b[<0;2;3M\u001b[<32;7;3M\u001b[<0;7;3m");
      shell.runtime.renderNow();
      expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(top);
      expect(received).toHaveLength(4);
      full.hide();
      shell.runtime.renderNow();
      expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(top);
    } finally { await shell.dispose(); }
  });

  it.each([false, true])("anchors slash autocomplete above the shell input (history=%s)", async persistent => {
    const history = memoryHistory();
    const { shell, terminal } = await fixture([], [], true, undefined, undefined, undefined, undefined, undefined,
      persistent ? { store: history.store, limit: 100 } : undefined);
    try {
      terminal.resize(80, 24);
      const position = () => {
        const rows = shell.root.render(80);
        const prompt = rows.findIndex(row => stripTerminalSequences(row).startsWith("❯ "));
        return { prompt, upper: prompt - 1, lower: prompt + 1,
          cursor: rows.findIndex(row => row.includes(CURSOR_MARKER)), footer: rows.slice(-2) };
      };
      const closed = position();
      terminal.input("/");
      await nextImmediate(); await nextImmediate();
      expect(shell.root.render(80).join("\n")).toContain("settings");
      expect(position()).toEqual(closed);
      terminal.input("mo");
      await nextImmediate(); await nextImmediate();
      expect(position()).toEqual(closed);
      terminal.input("\u001b");
      expect(position()).toEqual(closed);
    } finally { await shell.dispose(); }
  });

  it.each([false, true].flatMap(history => ["empty", "long", "detached", "streaming"].map(state => ({ history, state }))))(
    "paints stable autocomplete checkpoints ($state, history=$history)", async ({ history, state }) => {
      const messages = state === "empty" ? [] : Array.from({ length: 40 }, (_, index) => ({
        role: "assistant", content: [{ type: "text", text: `settled paragraph ${index}` }], timestamp: index + 1,
      }));
      const saved = memoryHistory();
      const { shell, terminal, engine, adapter } = await fixture(messages, [], true, undefined, undefined, undefined, undefined, undefined,
        history ? { store: saved.store, limit: 100 } : undefined);
      try {
        terminal.resize(80, 24);
        shell.root.setExtensionWidget("above", { render: () => ["above widget"], invalidate() {} }, "aboveEditor");
        shell.root.setExtensionWidget("below", { render: () => ["below widget"], invalidate() {} }, "belowEditor");
        if (state === "streaming") { engine.session.emit({ type: "agent_start" }); await adapter.flushEvents(); }
        shell.runtime.renderNow();
        if (state === "detached") terminal.input("\u001b[<64;20;3M");
        const checkpoints: Array<{ writeEnd: number; columns: number; rows: number }> = [];
        const expected: Array<{ rows: string[]; cursorRow: number }> = [];
        const capture = async () => {
          await nextImmediate(); await nextImmediate(); shell.runtime.renderNow();
          const frame = shell.root.render(terminal.columns);
          checkpoints.push({ writeEnd: terminal.writes.length, columns: terminal.columns, rows: terminal.rows });
          expected.push({ rows: frame.map(row => stripTerminalSequences(row).trimEnd()),
            cursorRow: frame.findIndex(row => row.includes(CURSOR_MARKER)) + 1 });
          return expected.at(-1)!;
        };
        const before = await capture();
        const detachedTop = shell.root.viewportPresentationEvidence().scrollTop;
        terminal.input("/");
        await capture();
        expect(shell.root.editor.bodyGeometry!().rowOffset).toBeGreaterThan(0);
        if (state === "detached") {
          expect(shell.root.viewportFrameDescriptor()?.followingEnd).toBe(false);
          expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(detachedTop);
        }
        if (state !== "streaming") {
          const work = shell.root.viewportCompositionEvidence();
          terminal.input("\u001b[B"); await nextImmediate(); await nextImmediate();
          expect(shell.root.viewportCompositionEvidence().full).toBe(work.full);
          expect(shell.root.viewportCompositionEvidence().dockOnly).toBeGreaterThan(work.dockOnly);
        }
        await capture();
        terminal.input("mo"); await capture();
        terminal.input("\u007f"); terminal.input("\u007f"); await capture();
        terminal.input("zzzz-no-match"); await capture();
        expect(shell.root.editor.bodyGeometry!().rowOffset).toBe(0);
        shell.root.editor.setText(""); terminal.input("/"); await capture();
        if (state === "streaming") {
          const message = { role: "assistant", content: [{ type: "text", text: "new streamed reply" }], timestamp: 100 };
          engine.session.emit({ type: "message_start", message });
          engine.session.emit({ type: "message_end", message });
          await adapter.flushEvents(); await capture();
        }
        terminal.input("\u001b"); await capture();
        for (const frame of expected) {
          expect(frame.cursorRow).toBe(before.cursorRow);
          expect(frame.rows.slice(before.cursorRow)).toEqual(before.rows.slice(before.cursorRow));
        }
        terminal.resize(40, 12); await capture();
        terminal.input("\u007f"); terminal.input("/"); await capture();
        terminal.input("\u001b"); await capture();
        const writes = terminal.writes.map((data, atMs) => ({ data, atMs }));
        const painted = await replayTerminalCheckpoints(writes, checkpoints);
        for (const [index, frame] of painted.entries()) {
          expect(frame.rows.map(row => row.trimEnd()), `checkpoint ${index}`).toEqual(expected[index]!.rows);
          expect(frame.cursor.row, `cursor ${index}`).toBe(expected[index]!.cursorRow);
        }
      } finally { await shell.dispose(); }
    });

  it.each([false, true])("routes autocomplete body pointers and restores extension editors (history=%s)", async persistent => {
    const history = memoryHistory();
    const copied: string[] = [];
    const readText = vi.fn(async () => "clipboard text");
    const { shell, terminal, engine } = await fixture([], [], true, undefined, { readText, writeText: async text => { copied.push(text); } },
      undefined, undefined, undefined, persistent ? { store: history.store, limit: 100 } : undefined);
    try {
      terminal.resize(80, 24);
      terminal.input("/"); terminal.input("mo"); await nextImmediate(); await nextImmediate();
      const frame = shell.root.render(80);
      const row = frame.findIndex(line => stripTerminalSequences(line).startsWith("❯ ")) + 1;
      expect(shell.root.editor.bodyGeometry!().rowOffset).toBeGreaterThan(0);
      // Rationale: with the counter merged into the body's top border, there is no
      // longer a plain top line above the menu; the counter border now sits directly
      // above the input prompt as part of the editor's own body geometry.
      const topLineRow = row - 1;
      expect(stripTerminalSequences(frame[topLineRow - 1]!)).toMatch(/^(?:─+|─── \d+\/\d+ ─*)$/u);
      expect(shell.root.editor.getText()).toBe("/mo");
      terminal.input(`\u001b[<0;3;${row}M`);
      terminal.input(`\u001b[<32;6;${row}M`);
      terminal.input(`\u001b[<0;6;${row}m`);
      expect(shell.root.hasActiveSelection()).toBe(true);
      terminal.input("\u0003");
      await vi.waitFor(() => expect(copied).toEqual(["/mo"]));
      const ui = (engine.session.extensionBindings as { uiContext: ExtensionUIContext }).uiContext;
      ui.setEditorComponent(tui => new Editor(tui, {
        borderColor: text => text,
        selectList: { selectedPrefix: text => text, selectedText: text => text, description: text => text, scrollInfo: text => text, noMatch: text => text },
      }));
      expect(shell.root.usesDefaultInputSurface()).toBe(false);
      expect(shell.root.render(80).some(line => stripTerminalSequences(line).startsWith("❯ "))).toBe(false);
      ui.setEditorComponent(undefined);
      shell.root.editor.setText(""); terminal.input("/"); await nextImmediate(); await nextImmediate();
      const restored = shell.root.render(80);
      expect(restored.findIndex(line => stripTerminalSequences(line).startsWith("❯ ")) + 1).toBe(row);
      expect(shell.root.editor.bodyGeometry!().rowOffset).toBeGreaterThan(0);
    } finally { await shell.dispose(); }
  });

  it("does not turn a suppressed drag into selection when content arrives", async () => {
    const { shell, terminal, engine, adapter } = await fixture([], [], true);
    try {
      terminal.input("\u001b[<0;4;2M");
      const message = { role: "assistant", content: [{ type: "text", text: "new selectable content" }], timestamp: 1 };
      engine.session.emit({ type: "message_end", message });
      await adapter.flushEvents();
      shell.runtime.renderNow();
      const start = terminal.writes.length;
      terminal.input("x\u001b[<32;15;3M\u001b[<35;15;3M\u001b[<0;15;3my");
      await nextImmediate();
      shell.runtime.renderNow();
      expect(shell.root.editor.getText()).toBe("xy");
      const output = terminal.writes.slice(start).join("");
      expect(output).not.toContain("Copied!");
      expect(output).not.toContain("\u001b]52;c;");
      expect(shell.root.hasActiveSelection()).toBe(false);
    } finally { await shell.dispose(); }
  });

  it.each(["exit-render", "unbind-error", "unbind-stall"])("restores the terminal despite %s during disposal", async failure => {
    const { shell, terminal, adapter } = await fixture([], [], true);
    if (failure === "exit-render") vi.spyOn(adapter, "currentSessionResumeMetadata").mockImplementation(() => { throw new Error("render failed"); });
    else vi.spyOn(adapter, "unbindExtensionUi").mockImplementation(() => failure === "unbind-stall" ? new Promise(() => {}) : Promise.reject(new Error("unbind failed")));
    await expect(shell.dispose()).rejects.toThrow("disposal failed");
    expect(terminal.active).toBe(false);
    expect(terminal.writes.join("")).toContain("\u001b[?1049l");
    expect(terminal.writes.join("")).toContain("\u001b[?1003l");
    const count = terminal.writes.length;
    await shell.dispose();
    expect(terminal.writes).toHaveLength(count);
  });

  it("paints and copies blank rows in the complete session frame", async () => {
    const { shell, terminal } = await fixture([], [], true);
    try {
      const start = terminal.writes.length;
      terminal.input("\u001b[<0;4;2M");
      terminal.input("\u001b[<32;20;5M");
      shell.runtime.renderNow();
      terminal.input("\u001b[<0;20;5m");
      await vi.waitFor(() => expect(terminal.writes.slice(start).join("")).toContain("\u001b]52;c;CgoK\u0007"));
      shell.runtime.renderNow();
      const output = terminal.writes.slice(start).join("");
      expect(output).toContain("Copied 3 characters to clipboard");
      expect(output).toContain("\u001b[48;2;38;79;120m");
      terminal.input("still usable");
      await nextImmediate();
      expect(shell.root.editor.getText()).toBe("still usable");
    } finally { await shell.dispose(); }
  });

  it.each([false, true])("round-trips the archive fixture through the real adapter/controller/editor (late=%s)", async late => {
    let backend!: OwnedUiPromptSuggestionGeneratorPort;
    let finish!: () => void;
    const directory = await mkdtemp(join(tmpdir(), "suggestion-shell-"));
    const diagnostics = new SuggestionDiagnosticCapture({ enabled: true, destination: join(directory, "diagnostics.json") });
    const target = await fixture(SUGGESTION_CONVERSATIONS.archive.messages, [], true, undefined, undefined, undefined, undefined, {
      generator: { generate: request => backend.generate(request), suggestionReasoningPolicy: () => backend.suggestionReasoningPolicy!() },
      enabled: () => true, onChange: () => () => {}, diagnostics,
    });
    backend = target.adapter;
    target.engine.session.thinkingLevel = "high";
    if (late) target.engine.completeSuggestion = () => new Promise(resolve => { finish = () => resolve({ content: [{ type: "text", text: "archive it" }] }); });
    try {
      const before = JSON.stringify(target.engine.session.agent.state.messages);
      target.engine.session.emit({ type: "agent_start" });
      target.engine.session.emit({ type: "message_end", message: SUGGESTION_CONVERSATIONS.archive.messages.at(-1) });
      await target.adapter.flushEvents();
      await nextImmediate();
      expect(stripTerminalSequences(target.shell.root.editor.render(60).join("\n"))).not.toContain("archive it");
      target.engine.session.emit({ type: "agent_settled" });
      await target.adapter.flushEvents();
      if (late) finish();
      await nextImmediate();
      expect(stripTerminalSequences(target.shell.root.editor.render(60).join("\n"))).toContain("❯ archive it");
      expect(target.shell.root.editor.getText()).toBe("");
      expect(target.engine.services.modelRuntime.completeSimple).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(target.engine.session.agent.state.messages)).toBe(before);
      expect(target.engine.session.thinkingLevel).toBe("high");
      target.shell.root.editor.handleInput?.("\r");
      expect(target.engine.session.calls).not.toContain("prompt:archive it");
      target.shell.root.editor.handleInput?.("\t");
      expect(target.shell.root.editor.getText()).toBe("archive it");
      expect(target.engine.session.calls).not.toContain("prompt:archive it");
      target.shell.root.editor.handleInput?.("\r");
      await nextImmediate();
      expect(target.engine.session.calls.filter(call => call === "prompt:archive it")).toHaveLength(1);
      await diagnostics.flush();
      const snapshot = JSON.parse(await readFile(join(directory, "diagnostics.json"), "utf8"));
      expect(snapshot.records.map((record: { event: string }) => record.event)).toEqual(["started", "displayed"]);
      expect(JSON.stringify(snapshot)).not.toContain("archive it");
    } finally { await target.shell.dispose(); diagnostics.dispose(); await rm(directory, { recursive: true, force: true }); }
  });

  it.each(["disabled", "early-conversation", "no-model", "failed-response", "incomplete-response", "tool-continuation", "draft", "replacement-input"])("reports the actual shell eligibility reason %s", async reason => {
    const diagnostics = new SuggestionDiagnosticCapture({ enabled: true });
    const messages = reason === "early-conversation" ? SUGGESTION_CONVERSATIONS.archive.messages.slice(-1) : SUGGESTION_CONVERSATIONS.archive.messages;
    const generate = vi.fn();
    const target = await fixture(messages, [], true, undefined, undefined, undefined, undefined, {
      generator: { generate }, enabled: () => reason !== "disabled", onChange: () => () => {}, diagnostics,
    }, undefined, engine => { if (reason === "no-model") engine.session.model = undefined; });
    try {
      if (reason === "draft") target.shell.root.editor.setText("my draft");
      if (reason === "replacement-input") target.shell.root.setInputSurface({ render: () => [], invalidate() {} });
      target.engine.session.emit({ type: "agent_start" });
      target.engine.session.emit({ type: "message_end", message: {
        ...messages.at(-1), stopReason: reason === "failed-response" ? "error"
          : reason === "incomplete-response" ? "length" : reason === "tool-continuation" ? "toolUse" : "stop",
      } });
      await target.adapter.flushEvents();
      expect(generate).not.toHaveBeenCalled();
      expect(diagnostics.snapshot()).toMatchObject([{ event: "skipped", reason, request: 0 }]);
    } finally { await target.shell.dispose(); diagnostics.dispose(); }
  });

  it("supports LMB drag, double-click word, triple-click line, and Ctrl+C transcript selection", async () => {
    const messages = [
      { role: "user", content: [{ type: "text", text: "Select this reply" }], timestamp: Date.now() - 1_000 },
      { role: "assistant", content: [{ type: "text", text: "Selectable assistant words" }], timestamp: Date.now() },
    ];
    const { terminal, shell } = await fixture(messages, [], true);
    terminal.resize(60, 12);
    const frame = shell.root.render(60).map(row => stripTerminalSequences(row));
    const rowIndex = frame.findIndex(row => row.includes("Selectable assistant words"));
    expect(rowIndex).toBeGreaterThanOrEqual(0);
    const column = (frame[rowIndex] ?? "").indexOf("assistant") + 1;
    const row = rowIndex + 1;
    const click = () => {
      terminal.input(`\u001b[<0;${column};${row}M`);
      terminal.input(`\u001b[<0;${column};${row}m`);
    };

    click();
    click();
    terminal.input("\u0003");
    await vi.waitFor(() => expect(terminal.writes).toContain(`\u001b]52;c;${Buffer.from("assistant").toString("base64")}\u0007`));

    click();
    const tripleSelected = shell.root.render(60)[rowIndex] ?? "";
    expect(tripleSelected).toContain("\u001b[48;2;38;79;120m");
    expect(tripleSelected).not.toContain("38;2;0;0;0");
    terminal.input("\u0003");
    await vi.waitFor(() => expect(terminal.writes.flatMap(write => {
      const match = /^\u001b\]52;c;([^\u0007]+)\u0007$/u.exec(write);
      return match?.[1] === undefined ? [] : [Buffer.from(match[1], "base64").toString()];
    })).toEqual(["assistant", " Selectable assistant words"]));
  });

  it.each([1, -1])("selects and copies adjacent transcript characters at 192x54 in direction %i", async direction => {
    const messages = [
      { role: "assistant", content: [{ type: "text", text: "One character" }], timestamp: Date.now() },
    ];
    const { terminal, shell } = await fixture(messages, [], true);
    terminal.resize(192, 54);
    const frame = shell.root.render(192).map(row => stripTerminalSequences(row));
    const rowIndex = frame.findIndex(row => row.includes("One character"));
    const column = (frame[rowIndex] ?? "").indexOf("character") + 1;
    const row = rowIndex + 1;

    terminal.input(`\u001b[<0;${column};${row}M`);
    terminal.input(`\u001b[<32;${column + direction};${row}M`);
    terminal.input(`\u001b[<0;${column + direction};${row}m`);
    const selected = shell.root.render(192)[rowIndex] ?? "";
    expect(selected).toContain("\u001b[48;2;38;79;120m");
    terminal.input("\u0003");
    await vi.waitFor(() => expect(terminal.writes).toContain(`\u001b]52;c;${Buffer.from(direction === 1 ? "ch" : " c").toString("base64")}\u0007`));
    await shell.dispose();
  });

  it.each([1, -1])("paints return-to-anchor reversal without deselection at 192x54 (direction=%i)", async direction => {
    const { terminal, shell } = await fixture([
      { role: "assistant", content: [{ type: "text", text: "abcde" }], timestamp: 1 },
    ], [], true);
    try {
      terminal.resize(192, 54);
      shell.runtime.renderNow();
      const frame = shell.root.render(192).map(row => stripTerminalSequences(row));
      const rowIndex = frame.findIndex(row => row.includes("abcde"));
      expect(rowIndex).toBeGreaterThanOrEqual(0);
      const column = frame[rowIndex]!.indexOf("abcde") + 3;
      const row = rowIndex + 1;
      const selectedCells = async () => (await replayTerminalBackgroundCells(
        terminal.writes.map((data, atMs) => ({ data, atMs })),
        { columns: 192, rows: 54 },
      )).filter(cell => cell.mode === "rgb" && cell.color === 0x264f78)
        .map(cell => ({ row: cell.row, column: cell.column }));

      terminal.input(`\u001b[<0;${column};${row}M`);
      shell.runtime.renderNow();
      expect(await selectedCells()).toEqual([]);
      for (const offset of [direction, 0, -direction, 0, 0]) {
        // Protocol: preserve the held selection through no-button motion reports as well.
        terminal.input(`\u001b[<35;${column + offset};${row}M`);
        shell.runtime.renderNow();
        expect(shell.root.hasActiveSelection()).toBe(true);
        expect(await selectedCells()).toEqual(Array.from({ length: Math.abs(offset) + 1 }, (_, index) => ({
          row, column: column + Math.min(0, offset) + index,
        })));
      }
      terminal.input(`\u001b[<0;${column};${row}m`);
      shell.runtime.renderNow();
      expect(await selectedCells()).toEqual([{ row, column }]);
      terminal.input("\u0003");
      shell.runtime.renderNow();
      await nextImmediate();
      expect(terminal.writes).toContain(`\u001b]52;c;${Buffer.from("c").toString("base64")}\u0007`);
      expect(shell.root.hasActiveSelection()).toBe(false);
      expect(await selectedCells()).toEqual([]);
    } finally {
      await shell.dispose();
    }
  });

  it.each([false, true])("paints and copies both multiline block endpoints at 192x54 (reverse=%s)", async reverse => {
    const { terminal, shell } = await fixture([
      { role: "assistant", content: [{ type: "text", text: "```\nabcd\nefgh\n```" }], timestamp: 1 },
    ], [], true);
    try {
      terminal.resize(192, 54);
      shell.runtime.renderNow();
      const frame = shell.root.render(192).map(row => stripTerminalSequences(row));
      const firstRow = frame.findIndex(row => row.trim() === "abcd") + 1;
      const lastRow = frame.findIndex(row => row.trim() === "efgh") + 1;
      expect(firstRow).toBeGreaterThan(0);
      expect(lastRow).toBe(firstRow + 1);
      const firstColumn = frame[firstRow - 1]!.indexOf("abcd") + 1;
      const lastColumn = frame[lastRow - 1]!.indexOf("efgh") + 4;
      const start = reverse ? [lastColumn, lastRow] : [firstColumn, firstRow];
      const end = reverse ? [firstColumn, firstRow] : [lastColumn, lastRow];
      terminal.input(`\u001b[<0;${start[0]};${start[1]}M`);
      terminal.input(`\u001b[<32;${end[0]};${end[1]}M`);
      terminal.input(`\u001b[<0;${end[0]};${end[1]}m`);
      shell.runtime.renderNow();
      const cells = (await replayTerminalBackgroundCells(
        terminal.writes.map((data, atMs) => ({ data, atMs })),
        { columns: 192, rows: 54 },
      )).filter(cell => cell.mode === "rgb" && cell.color === 0x264f78)
        .map(cell => ({ row: cell.row, column: cell.column }));
      expect(cells).toEqual([
        ...Array.from({ length: 192 - firstColumn }, (_, index) => ({ row: firstRow, column: firstColumn + index })),
        ...Array.from({ length: lastColumn }, (_, index) => ({ row: lastRow, column: index + 1 })),
      ]);
      terminal.input("\u0003");
      await nextImmediate();
      const clipboardWrite = terminal.writes.findLast(write => write.startsWith("\u001b]52;c;"));
      expect(clipboardWrite).toBeDefined();
      // Invariant: preserve the code renderer's source-row indentation, but not viewport right padding.
      expect(Buffer.from(clipboardWrite!.slice(7, -1), "base64").toString("utf8")).toBe("abcd\n   efgh");
      expect(shell.root.hasActiveSelection()).toBe(false);
    } finally {
      await shell.dispose();
    }
  });

  it.each([
    ["\u001b[H", "\u001b[F"], ["\u001bOH", "\u001bOF"],
    ["\u001b[1~", "\u001b[4~"], ["\u001b[7~", "\u001b[8~"],
    ["\u001b[1;1H", "\u001b[1;1F"], ["\u001b[1;1:1H", "\u001b[1;1:1F"],
  ])("keeps Home/End and A1 editing aliases in the prompt (%j, %j)", async (home, end) => {
    const { terminal, shell } = await fixture([], [], true);
    try {
      terminal.resize(60, 12);
      shell.root.render(60);
      shell.root.editor.setText("alpha beta");
      terminal.input(home); terminal.input("start ");
      terminal.input(end); terminal.input(" end");
      await nextImmediate();
      expect(shell.root.editor.getText()).toBe("start alpha beta end");
      terminal.input("\u001b[127;5u");
      expect(shell.root.editor.getText()).toBe("start alpha beta ");
      terminal.input(home); terminal.input("\u001b[3;5~");
      expect(shell.root.editor.getText()).toBe(" alpha beta ");
      terminal.input("\u001a");
      expect(shell.root.editor.getText()).toBe("start alpha beta ");
    } finally { await shell.dispose(); }
  });

  it("paints standalone prompt Home/End without requiring subsequent typing", async () => {
    const { terminal, shell } = await fixture([], [], true);
    try {
      terminal.resize(60, 12);
      shell.root.editor.setText("standalone cursor movement");
      shell.runtime.renderNow();
      const atEnd = shell.root.editor.render(60);
      for (const input of ["\u001b[H", "\u001b[F"]) {
        const before = terminal.writes.length;
        terminal.input(input);
        await vi.waitFor(() => expect(terminal.writes.length).toBeGreaterThan(before));
        expect(shell.root.editor.getText()).toBe("standalone cursor movement");
        if (input.endsWith("H")) expect(shell.root.editor.render(60)).not.toEqual(atEnd);
        else expect(shell.root.editor.render(60)).toEqual(atEnd);
      }
    } finally { await shell.dispose(); }
  });

  it.each(["first\nmiddle line\nlast", "one long logical line that wraps across several terminal rows"])("uses logical prompt boundaries without navigating detached content: %s", async draft => {
    const { terminal, shell } = await fixture(Array.from({ length: 20 }, (_, index) => ({
      role: "assistant", content: [{ type: "text", text: `content-${index}` }], timestamp: index + 1,
    })), [], true);
    try {
      terminal.resize(30, 16);
      shell.root.editor.setText(draft);
      shell.root.render(30);
      terminal.input("\u001b[1;5H");
      shell.root.render(30);
      if (draft.includes("\n")) terminal.input("\u001b[A");
      const before = shell.root.viewportFrameDescriptor()!;
      terminal.input("\u001b[H"); terminal.input("!");
      terminal.input("\u001b[F"); terminal.input("?");
      await nextImmediate();
      shell.root.render(30);
      expect(shell.root.editor.getText()).toBe(draft.includes("\n") ? "first\n!middle line?\nlast" : `!${draft}?`);
      expect(shell.root.viewportFrameDescriptor()!.nextDocumentRange.start).toBe(before.nextDocumentRange.start);
      expect(shell.root.viewportFrameDescriptor()!.followingEnd).toBe(false);
    } finally { await shell.dispose(); }
  });

  it.each([
    ["\u001b[1;5H", "\u001b[1;5F"], ["\u001b[7;5~", "\u001b[8;5~"],
    ["\u001b[1;5:1H", "\u001b[1;5:1F"],
  ])("navigates content with Ctrl+Home/End while preserving the draft and cursor (%j, %j)", async (home, end) => {
    for (const length of [0, 1, 20]) {
      const { terminal, shell, engine } = await fixture(Array.from({ length }, (_, index) => ({
        role: "assistant", content: [{ type: "text", text: `content-${index}` }], timestamp: index + 1,
      })), [], true);
      try {
        terminal.resize(60, 12);
        shell.root.editor.setText("keep this draft");
        terminal.input("\u001b[D");
        await nextImmediate();
        shell.root.render(60);
        const cursor = shell.root.editor.render(60);
        for (let press = 0; press < 2; press += 1) {
          terminal.input(home); shell.root.render(60);
          expect(shell.root.viewportFrameDescriptor()!.nextDocumentRange.start).toBe(0);
          expect(shell.root.editor.render(60)).toEqual(cursor);
        }
        if (length === 20) {
          engine.session.emit({ type: "message_start", message: {
            role: "assistant", content: [{ type: "text", text: "new streamed content" }], timestamp: 50,
          } });
          await shell.backend.flushEvents();
          shell.root.render(60);
          expect(shell.root.viewportFrameDescriptor()!.nextDocumentRange.start).toBe(0);
          expect(shell.root.viewportFrameDescriptor()!.followingEnd).toBe(false);
        }
        for (let press = 0; press < 2; press += 1) {
          terminal.input(end); shell.root.render(60);
          expect(shell.root.viewportFrameDescriptor()!.followingEnd).toBe(true);
          expect(shell.root.editor.render(60)).toEqual(cursor);
        }
        terminal.input("!");
        await nextImmediate();
        expect(shell.root.editor.getText()).toBe("keep this draf!t");
      } finally { await shell.dispose(); }
    }
  });

  it.each(["\u001b[1;2H", "\u001b[1;3F", "\u001b[1;6H", "\u001b[1;7F"])("does not confuse additional modifiers with content shortcuts: %j", async data => {
    const { shell } = await fixture([], [], true);
    try { expect(shell.root.handleViewportPreInput(data)).toEqual({ data, consumed: false }); }
    finally { await shell.dispose(); }
  });

  it.each(["replacement", "overlay"])("leaves boundary shortcuts with the active %s", async surfaceKind => {
    const { terminal, shell } = await fixture([], [], true);
    try {
      const received: string[] = [];
      const surface = { render: () => ["active selector/dialog"], invalidate() {}, handleInput: (data: string) => { received.push(data); } };
      if (surfaceKind === "replacement") shell.root.setInputSurface(surface);
      else shell.runtime.showOverlay(surface, { anchor: "top-left", width: 30 });
      const inputs = ["\u001b[H", "\u001b[F", "\u001b[1;5H", "\u001b[1;5F"];
      for (const input of inputs) terminal.input(input);
      expect(received).toEqual(inputs);
    } finally { await shell.dispose(); }
  });

  it("keeps comparison Ctrl+Home/End editor bindings unchanged", async () => {
    const { terminal, shell } = await fixture();
    try {
      shell.root.editor.setText("draft");
      terminal.input("\u001b[1;5H"); terminal.input("start ");
      terminal.input("\u001b[1;5F"); terminal.input(" end");
      expect(shell.root.editor.getText()).toBe("start draft end");
    } finally { await shell.dispose(); }
  });

  it.each([false, true])("shows the effective boundary shortcuts in hotkeys (custom=%s)", async custom => {
    const { terminal, shell } = await fixture([], [], custom);
    try {
      // Rationale: the bare profile appends a Models dialog section, so the viewport must hold the whole table.
      terminal.resize(160, 120);
      shell.root.appendWorkflowResult({ command: "hotkeys", outcome: "completed", message: "" });
      const text = stripTerminalSequences(shell.root.render(160).join("\n"));
      expect(text.includes("Start of content")).toBe(custom);
      expect(text.includes("Start of prompt line")).toBe(custom);
      expect(text).toContain("Ctrl+Home");
    } finally { await shell.dispose(); }
  });

  it("intercepts owned prompt selection, clipboard, undo, redo, and shift selection actions", async () => {
    let clipboardText = "pasted text";
    const { terminal, shell } = await fixture([], [], true, undefined, {
      readText: async () => clipboardText,
      writeText: async text => {
        await Promise.resolve();
        clipboardText = text;
      },
    });
    terminal.resize(60, 12);
    shell.root.editor.setText("alpha beta");
    shell.root.render(60);

    terminal.input("\u0001"); // Protocol: Ctrl+A
    expect(shell.root.render(60).join("\n")).toContain("\u001b[48;2;38;79;120m");
    terminal.input("\u0003"); // Protocol: Ctrl+C
    await nextImmediate();
    expect(terminal.writes).toContain(`\u001b]52;c;${Buffer.from("alpha beta").toString("base64")}\u0007`);
    expect(shell.root.render(60).join("\n")).not.toContain("\u001b[48;2;38;79;120m");

    terminal.input("\u0001"); // Invariant: select again because copying collapses the selection.
    terminal.input("\u0018"); // Protocol: Ctrl+X
    expect(shell.root.editor.getText()).toBe("");
    terminal.input("\u001a"); // Protocol: Ctrl+Z
    expect(shell.root.editor.getText()).toBe("alpha beta");
    terminal.input("\u0019"); // Protocol: Ctrl+Y
    expect(shell.root.editor.getText()).toBe("");

    terminal.input("\u0016"); // Concurrency: Ctrl+V immediately follows copying or cutting.
    await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("alpha beta"));
    terminal.input("\u001a");
    expect(shell.root.editor.getText()).toBe("");
    terminal.input("\u0019");
    expect(shell.root.editor.getText()).toBe("alpha beta");

    clipboardText = "pasted text";
    shell.root.editor.setText("replace me");
    terminal.input("\u0001");
    terminal.input("\u0016");
    await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("pasted text"));
    terminal.input("\u001a");
    expect(shell.root.editor.getText()).toBe("replace me");

    shell.root.editor.setText("right ");
    const rightClickFrame = shell.root.render(60).map(row => stripTerminalSequences(row));
    const rightClickRow = rightClickFrame.findIndex(row => row.includes("right ")) + 1;
    terminal.input(`\u001b[<2;8;${rightClickRow}M`);
    terminal.input(`\u001b[<2;8;${rightClickRow}m`);
    await vi.waitFor(() => expect(shell.root.editor.getText()).toBe("right pasted text"));

    shell.root.editor.setText("abcd");
    terminal.input("\u001b[1;2D"); // Protocol: Shift+Left selects d.
    terminal.input("\u001b[1;2D"); // Protocol: Shift+Left extends selection to cd.
    terminal.input("\u001b[1;2C"); // Protocol: Shift+Right shrinks selection to d.
    terminal.input("\u0003");
    await nextImmediate();
    expect(terminal.writes).toContain(`\u001b]52;c;${Buffer.from("d").toString("base64")}\u0007`);

    terminal.input("X");
    await nextImmediate();
    expect(shell.root.editor.getText()).toBe("abcdX");
    terminal.input("\u001a");
    expect(shell.root.editor.getText()).toBe("abcd");

    await shell.dispose();
  });

  it("selects prompt words on double-click and logical lines on triple-click", async () => {
    const { terminal, shell } = await fixture([], [], true);
    terminal.resize(60, 12);
    shell.root.editor.setText("mouse alpha beta");
    const frame = shell.root.render(60).map(row => stripTerminalSequences(row));
    const row = frame.findIndex(line => line.includes("mouse alpha beta")) + 1;
    const column = (frame[row - 1]?.indexOf("alpha") ?? -1) + 2;
    expect(row).toBeGreaterThan(0);
    expect(column).toBeGreaterThan(1);
    const click = () => {
      terminal.input(`\u001b[<0;${column};${row}M`);
      terminal.input(`\u001b[<0;${column};${row}m`);
    };

    click();
    click();
    terminal.input("\u0003");
    await vi.waitFor(() => expect(terminal.writes).toContain(`\u001b]52;c;${Buffer.from("alpha").toString("base64")}\u0007`));

    click();
    terminal.input("\u0003");
    await vi.waitFor(() => expect(terminal.writes).toContain(`\u001b]52;c;${Buffer.from("mouse alpha beta").toString("base64")}\u0007`));

    await shell.dispose();
  });

  it("uses Ctrl+Home/End for transcript boundaries and Shift+Up/Down between prompts", async () => {
    const messages = ["one", "two", "three"].flatMap((prompt, index) => [
      { role: "user", content: [{ type: "text", text: prompt }], timestamp: Date.now() + index * 2 },
      { role: "assistant", content: [{ type: "text", text: Array.from({ length: 15 }, (_, row) => `reply-${prompt}-${row + 1}`).join("\n") }], timestamp: Date.now() + index * 2 + 1 },
    ]);
    const { terminal, shell } = await fixture(messages, [], true);
    terminal.resize(60, 12);
    shell.root.editor.setText("keep this draft");
    shell.root.setViewportConfig({ scrollbarAppearance: "always", scrollbarStyle: "thin", scrollbarSpeed: "normal" });
    const rows = () => shell.root.render(60).map(row => stripTerminalSequences(row));
    const top = () => rows()[0] ?? "";
    const bottomRows = rows();
    terminal.input("\u001b[1;5H");
    expect(top().trim()).toBe("");
    expect(rows()[1]).toContain("❯ one");

    terminal.input("\u001b[1;2B");
    await nextImmediate();
    expect(top()).toContain("❯ two");
    terminal.input("\u001b[1;2B");
    await nextImmediate();
    expect(top()).toContain("❯ three");
    expect(rows()).not.toEqual(bottomRows);
    terminal.input("\u001b[1;2B");
    await nextImmediate();
    expect(rows()).toEqual(bottomRows);
    expect(shell.root.editor.getText()).toBe("keep this draft");
    terminal.input("\u001b[1;2B");
    await nextImmediate();
    expect(rows()).toEqual(bottomRows);

    terminal.input("\u001b[1;2A");
    await nextImmediate();
    expect(top()).toContain("❯ three");
    expect(rows()).not.toEqual(bottomRows);
    terminal.input("\u001b[1;2A");
    await nextImmediate();
    expect(top()).toContain("❯ two");
    terminal.input("\u001b[1;2A");
    await nextImmediate();
    expect(top().trim()).toBe("");
    expect(rows()[1]).toContain("❯ one");
    terminal.input("\u001b[1;2A");
    await nextImmediate();
    expect(top().trim()).toBe("");
    expect(rows()[1]).toContain("❯ one");

    terminal.input("\u001b[1;5F");
    expect(rows()).toEqual(bottomRows);
    expect(shell.root.editor.getText()).toBe("keep this draft");

    await shell.dispose();
  });

  it("continuously auto-scrolls an active selection held at a viewport edge", async () => {
    const messages = Array.from({ length: 40 }, (_, index) => ({
      role: "assistant",
      content: [{ type: "text", text: `selection-scroll-${index}` }],
      timestamp: Date.now() + index,
    }));
    const { terminal, shell } = await fixture(messages, [], true);
    terminal.resize(60, 12);
    const firstVisible = (): number => {
      const indexes = shell.root.render(60)
        .map(row => /selection-scroll-(\d+)/.exec(stripTerminalSequences(row))?.[1])
        .filter((value): value is string => value !== undefined)
        .map(Number);
      return Math.min(...indexes);
    };
    shell.root.render(60);
    terminal.input("\u001b[<0;5;3M");
    terminal.input("\u001b[<32;5;1M");
    const afterMotion = firstVisible();

    await new Promise(resolve => setTimeout(resolve, 150));
    const whileHeld = firstVisible();
    expect(whileHeld).toBeLessThan(afterMotion);
    const normalDistance = afterMotion - whileHeld;

    terminal.input("\u001b[<0;5;1m");
    await new Promise(resolve => setTimeout(resolve, 130));
    expect(firstVisible()).toBe(whileHeld);
    terminal.input("\u0003");

    // Rationale: leave enough room below for the faster direction to demonstrate its
    // greater distance rather than immediately hitting the document end.
    terminal.input("\u001b[<64;30;3M");
    terminal.input("\u001b[<64;30;3M");
    terminal.input("\u001b[<64;30;3M");
    shell.root.setViewportConfig({ scrollbarAppearance: "always", scrollbarStyle: "thin", scrollbarSpeed: "fast" });
    shell.runtime.renderNow();
    terminal.input("\u001b[<0;5;3M");
    terminal.input("\u001b[<32;5;12M");
    const afterDownMotion = firstVisible();
    await new Promise(resolve => setTimeout(resolve, 150));
    const fastDistance = firstVisible() - afterDownMotion;
    expect(fastDistance).toBeGreaterThan(normalDistance);
    terminal.input("\u001b[<0;5;12m");

    shell.root.setViewportConfig({ scrollbarAppearance: "always", scrollbarStyle: "thin", scrollbarSpeed: "high" });
    terminal.input("\u001b[<0;5;3M");
    terminal.input("\u001b[<32;5;1M");
    const beforeHigh = firstVisible();
    await new Promise(resolve => setTimeout(resolve, 150));
    const highDistance = beforeHigh - firstVisible();
    expect(highDistance).toBeGreaterThanOrEqual(fastDistance);
    terminal.input("\u001b[<0;5;1m");
    await shell.dispose();
  });

  it("selects across status, input, footer, and transcript rows", async () => {
    const { terminal, shell } = await fixture([], [], true);
    terminal.resize(60, 12);
    shell.root.render(60);

    const press = shell.root.handleViewportPreInput("\u001b[<0;20;12M");
    const motion = shell.root.handleViewportPreInput("\u001b[<35;20;2M");
    const release = shell.root.handleViewportPreInput("\u001b[<0;20;2m");
    const copy = shell.root.handleViewportPreInput("\u0003");

    expect(press).toMatchObject({ data: "", consumed: true });
    expect(motion).toMatchObject({ data: "", consumed: true });
    expect(release).toMatchObject({ data: "", consumed: true });
    expect(release.copySelection?.sourceUnits).toBeGreaterThan(0);
    expect(copy).toMatchObject({ data: "", consumed: true });
    await shell.dispose();
  });

  it("continues an active drag through no-button motion reports", async () => {
    const messages = [
      { role: "assistant", content: [{ type: "text", text: "Selectable assistant words" }], timestamp: Date.now() },
    ];
    const { terminal, shell } = await fixture(messages, [], true);
    terminal.resize(60, 12);
    const frame = shell.root.render(60).map(row => stripTerminalSequences(row));
    const rowIndex = frame.findIndex(row => row.includes("Selectable assistant words"));
    const start = (frame[rowIndex] ?? "").indexOf("Selectable") + 1;
    const end = start + "Selectable".length - 1;
    const row = rowIndex + 1;

    terminal.input(`\u001b[<0;${start};${row}M`);
    // Protocol: code 35 is motion with no button bits set.
    terminal.input(`\u001b[<35;${end + 1};${row}M`);
    terminal.input(`\u001b[<0;${end + 1};${row}m`);
    terminal.input("\u0003");

    await vi.waitFor(() => expect(terminal.writes).toContain(`\u001b]52;c;${Buffer.from("Selectable").toString("base64")}\u0007`));
    await shell.dispose();
  });

  it("applies live scrollbar appearance and style without losing detached position", async () => {
    const messages = Array.from({ length: 18 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: [{ type: "text", text: `row ${index}` }],
      timestamp: Date.now() + index,
    }));
    let current: OwnedUiViewportSettings = {
      scrollbarAppearance: "hidden",
      scrollbarStyle: "thin",
      scrollbarSpeed: "normal",
    };
    let notify: ((settings: OwnedUiViewportSettings) => void) | undefined;
    const settings: OwnedUiViewportSettingsPort = {
      snapshot: () => current,
      onChange: listener => { notify = listener; return () => { notify = undefined; }; },
    };
    const { terminal, shell } = await fixture(messages, [], true, settings);
    terminal.resize(60, 12);
    shell.root.render(60);
    terminal.input("\u001b[<64;30;3M");
    const hidden = shell.root.render(60).map(row => stripTerminalSequences(row));
    expect(hidden.some(row => row.includes("Jump to bottom"))).toBe(true);
    expect(hidden.every(row => !row.includes("│") && !row.includes("┃"))).toBe(true);

    current = { scrollbarAppearance: "always", scrollbarStyle: "thick", scrollbarSpeed: "fast" };
    notify?.(current);
    const shownRaw = shell.root.render(60);
    const shown = shownRaw.map(row => stripTerminalSequences(row));
    expect(shown.some(row => row.includes("Jump to bottom"))).toBe(true);
    expect(shown.slice(1, -4).some(row => row.includes("┃"))).toBe(true);
    expect(shownRaw.some(row => row.includes(piTheme().fg("accent", "┃")))).toBe(true);
    await shell.dispose();
  });

  it("keeps wheel and jump-to-bottom controls responsive during streamed event bursts", async () => {
    const messages = Array.from({ length: 20 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: [{ type: "text", text: `responsive-row-${index}` }],
      timestamp: Date.now() + index,
    }));
    const { engine, terminal, shell } = await fixture(messages, [], true);
    terminal.resize(60, 12);
    shell.root.render(60);

    for (let index = 0; index < 20; index += 1) {
      engine.session.emit({
        type: "message_update",
        message: {
          id: "responsive-stream",
          role: "assistant",
          content: [{ type: "text", text: `stream ${index}` }],
          timestamp: Date.now(),
        },
        assistantMessageEvent: { type: "text_delta", delta: String(index) },
      });
    }
    await new Promise<void>(resolve => {
      setImmediate(() => {
        terminal.input("\u001b[<64;30;3M");
        resolve();
      });
    });

    const detached = shell.root.render(60).map(row => stripTerminalSequences(row));
    const jumpRow = detached.findIndex(row => row.includes("Jump to bottom"));
    const jumpColumn = (detached[jumpRow] ?? "").indexOf("Jump to bottom") + 1;
    expect(jumpRow).toBeGreaterThanOrEqual(0);
    terminal.input(`\u001b[<0;${jumpColumn};${jumpRow + 1}M`);
    expect(shell.root.render(60).some(row => stripTerminalSequences(row).includes("Jump to bottom"))).toBe(false);

    await shell.backend.flushEvents();
    await shell.dispose();
  });

  it("moves three, six, and nine transcript rows at normal, fast, and high speed", async () => {
    const messages = Array.from({ length: 24 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: [{ type: "text", text: `speed-row-${index}` }],
      timestamp: Date.now() + index,
    }));
    const { terminal, shell } = await fixture(messages, [], true);
    terminal.resize(60, 12);
    const firstVisibleIndex = (): number => {
      const indexes = shell.root.render(60)
        .map(row => /speed-row-(\d+)/.exec(stripTerminalSequences(row))?.[1])
        .filter((value): value is string => value !== undefined)
        .map(Number);
      return Math.min(...indexes);
    };

    shell.root.setViewportConfig({ scrollbarAppearance: "always", scrollbarStyle: "thin", scrollbarSpeed: "normal" });
    shell.root.render(60);
    terminal.input("\u001b[<64;30;3M");
    const normalTop = firstVisibleIndex();

    terminal.input("\u001b[1;3F");
    shell.root.setViewportConfig({ scrollbarAppearance: "always", scrollbarStyle: "thin", scrollbarSpeed: "fast" });
    shell.root.render(60);
    terminal.input("\u001b[<64;30;3M");
    const fastTop = firstVisibleIndex();

    terminal.input("\u001b[1;3F");
    shell.root.setViewportConfig({ scrollbarAppearance: "always", scrollbarStyle: "thin", scrollbarSpeed: "high" });
    shell.root.render(60);
    terminal.input("\u001b[<64;30;3M");
    const highTop = firstVisibleIndex();

    expect(fastTop).toBeLessThan(normalTop);
    expect(highTop).toBeLessThanOrEqual(fastTop);
    await shell.dispose();
  });
});
