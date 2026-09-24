import HeadlessXterm from "@xterm/headless";
import { join } from "node:path";
import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { getOsc8LinkAtColumn as getPinnedPiTuiLinkAtColumn } from "@earendil-works/pi-tui";
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
import { applyPiTheme, piTheme } from "../../../src/integrations/pi/components/index.js";
import { classifyTerminalPaint, replayTerminalBackgroundCells, replayTerminalCheckpoints, replayTerminalPaint } from "../../support/rendering/terminal-paint-evidence.js";
import { withPiParityColorMode } from "../../support/pi-terminal-capabilities.js";
import { BottomHoverEvidence, classifyBottomHoverFinding, type BottomHoverState } from "../../support/rendering/bottom-hover-evidence.js";
import { withPinnedHyperlinks, fixture, InputImmediateScheduler, nextImmediate } from "./session-shell-fixture.js";

describe("OwnedUiSessionShell prompt bar, links, and hover", () => {
  it("preserves repository path and linked PR metadata while merging extension footer status", async () => {
    const { adapter, shell } = await fixture([], [], true);
    const view = adapter.view();
    shell.root.update({
      ...view,
      status: {
        ...view.status,
        footer: {
          ...view.status.footer!,
          branch: "fix/session-associated-pr-footer",
          repositoryPath: "D:/delivery/session-associated-pr-footer",
          pullRequest: { number: 552, url: "https://github.com/timurproko/a1/pull/552" },
        },
      },
    });
    const footer = shell.root.render(120).map(row => stripTerminalSequences(row))
      .find(row => row.includes("#552"));
    expect(footer).toContain("D:/delivery/session-associated-pr-footer (fix/session-associated-pr-footer) #552");
    await shell.dispose();
  });

  it("renders the bare-A1 prompt bar and one-row-inset rail above an unchanged pinned dock", async () => {
    const messages = Array.from({ length: 18 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      content: [{ type: "text", text: `${index % 2 === 0 ? "Question" : "Answer"} ${index}` }],
      timestamp: new Date(2026, 3, 2, 11, 45 + index).getTime(),
    }));
    const { engine, terminal, shell } = await fixture(messages, [], true);
    terminal.resize(60, 12);
    const initial = shell.root.render(60);
    expect(initial).toHaveLength(12);
    const plainInitial = initial.map(row => stripTerminalSequences(row));
    expect(plainInitial.some(row => /^❯ Question \d+\s+\d{2}:\d{2}\s*$/.test(row))).toBe(true);
    expect(terminal.writes.some(write => write.includes("[?1003h"))).toBe(true);

    terminal.input("\u001b[<64;30;3M");
    const detachedRaw = shell.root.render(60);
    const detached = detachedRaw.map(row => stripTerminalSequences(row));
    expect(detached).toHaveLength(12);
    expect(detachedRaw[0]).toContain(piTheme().fg("dim", "11:57"));
    expect(detached.some(row => row.includes("Jump to bottom (Ctrl+End) ↓"))).toBe(true);
    expect(detached[0]).not.toContain("│");
    expect(detached.slice(1, -4).some(row => row.includes("│"))).toBe(true);
    expect(detachedRaw.some(row => row.includes(piTheme().fg("accent", "│")))).toBe(true);
    expect(detachedRaw.every(row => !row.includes(piTheme().fg("text", "│")))).toBe(true);

    const completedReply = {
      role: "assistant",
      content: [{ type: "text", text: "New reply while detached" }],
      timestamp: Date.now(),
    };
    engine.session.emit({ type: "message_start", message: completedReply });
    engine.session.emit({ type: "message_end", message: completedReply });
    await shell.backend.flushEvents();
    expect(shell.root.render(60).some(row => stripTerminalSequences(row).includes("1 new message (Ctrl+End) ↓"))).toBe(true);

    engine.session.emit({ type: "message_end", message: { role: "tool", content: [{ type: "text", text: "tool result" }] } });
    await shell.backend.flushEvents();
    expect(shell.root.render(60).some(row => stripTerminalSequences(row).includes("1 new message (Ctrl+End) ↓"))).toBe(true);

    // Compatibility: v2 resumes follow at the exact agent_start boundary, which also clears
    // the completed-message count on the next frame.
    engine.session.emit({ type: "agent_start" });
    await shell.backend.flushEvents();
    expect(shell.root.render(60).every(row => !stripTerminalSequences(row).includes("new message (Ctrl+End) ↓"))).toBe(true);
    engine.session.emit({ type: "agent_settled" });
    await shell.backend.flushEvents();

    shell.root.editor.setText("submitted while detached");
    terminal.input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(engine.session.calls).toContain("prompt:submitted while detached");
    expect(shell.root.render(60).some(row => stripTerminalSequences(row).includes("Jump to bottom"))).toBe(false);

    await shell.dispose();
    expect(terminal.writes.some(write => write.includes("[?1003l"))).toBe(true);
  });

  it.each([true, false])("paints the first editor-then-hover frame with hovered=%s", async hovered => {
    await withPiParityColorMode("truecolor", async () => {
      applyPiTheme("dark", false, "truecolor");
      const messages = Array.from({ length: 20 }, (_, index) => ({
        role: "assistant", content: [{ type: "text", text: `hover-row-${index}` }], timestamp: index + 1,
      }));
      const scheduler = new InputImmediateScheduler();
      const { shell, terminal } = await fixture(messages, [], true, undefined, undefined, undefined, { scheduler });
      try {
        terminal.resize(60, 16);
        shell.runtime.renderNow();
        const row = shell.root.viewportFrameDescriptor()!.transcript!.rowEnd;
        terminal.input(`\u001b[<64;${hovered ? 1 : 30};${row}M`);
        // Invariant: setup ends here. No diagnostic render is allowed after the interleaving.
        await nextImmediate();
        const before = terminal.writes.length;
        terminal.input("x");
        terminal.input(`\u001b[<35;${hovered ? 30 : 1};${row}M`);
        await nextImmediate();
        const firstPaint = terminal.writes.findIndex((write, index) => index >= before && write.includes("\u001b[?2026h"));
        expect(firstPaint).toBeGreaterThanOrEqual(before);
        const writes = terminal.writes.slice(0, firstPaint + 1).map((data, atMs) => ({ data, atMs }));
        const cells = await replayTerminalBackgroundCells(writes, { columns: 60, rows: 16 });
        // Provenance: the oracle is the pinned dark truecolor palette, not the production hover predicate.
        expect(cells.find(cell => cell.row === row && cell.column === 30)).toMatchObject({
          mode: "rgb", color: hovered ? 0x3a3a4a : 0x282832,
        });
        const [painted] = await replayTerminalCheckpoints(writes, [{ columns: 60, rows: 16, writeEnd: writes.length }]);
        expect(painted!.rows.slice(row).some(line => line.includes("x"))).toBe(true);
        expect(shell.root.editor.getText()).toBe("x");
        const reuseBefore = shell.root.viewportCompositionEvidence();
        const settledRenders = shell.root.transcriptRenderCount();
        const nextStart = terminal.writes.length;
        terminal.input("y"); scheduler.flush(); await nextImmediate();
        expect(shell.root.viewportCompositionEvidence()).toEqual({ full: reuseBefore.full, dockOnly: reuseBefore.dockOnly + 1 });
        expect(shell.root.transcriptRenderCount()).toBe(settledRenders);
        const dockPaint = classifyTerminalPaint(terminal.writes.slice(nextStart).map((data, atMs) => ({ data, atMs })));
        expect(dockPaint.fullScreenClears).toBe(0);
        expect(dockPaint.addressedRowWrites.every(paintedRow => paintedRow > row)).toBe(true);
        const nextCells = await replayTerminalBackgroundCells(terminal.writes.map((data, atMs) => ({ data, atMs })), { columns: 60, rows: 16 });
        expect(nextCells.find(cell => cell.row === row && cell.column === 30)?.color).toBe(hovered ? 0x3a3a4a : 0x282832);
      } finally { await shell.dispose(); }
    }, { hyperlinks: false });
  });

  it.each([60, 192].flatMap(columns => ["none", "assistant", "tool"].map(stream => ({
    columns, rows: columns === 60 ? 16 : 54, stream,
  }))))("paints scroll-only hover checkpoints at $columns x $rows during $stream output", async ({ columns, rows, stream }) => {
    await withPiParityColorMode("truecolor", async () => {
      applyPiTheme("dark", false, "truecolor");
      const messages = Array.from({ length: 80 }, (_, index) => ({
        role: "assistant", content: [{ type: "text", text: `settled-hover-${index}` }], timestamp: index + 1,
      }));
      const { shell, terminal, engine, adapter } = await fixture(messages, [], true);
      const trace = new BottomHoverEvidence({ enabled: true });
      const checkpoints: Array<{ name: string; end: number; start: number; expected: boolean | null; state: BottomHoverState }> = [];
      const paintedStates = new Map<number, BottomHoverState>();
      const route = shell.root.handleViewportPreInput.bind(shell.root);
      const inputSpy = vi.spyOn(shell.root, "handleViewportPreInput").mockImplementation((data, allowWheel, now) => {
        const routed = route(data, allowWheel, now);
        trace.input(data, routed.consumed, shell.root.viewportPresentationEvidence());
        return routed;
      });
      const writeSpy = vi.spyOn(terminal, "write").mockImplementation(data => {
        terminal.writes.push(data);
        if (!data.includes("\u001b[?2026h")) return;
        const state = shell.root.viewportPresentationEvidence();
        paintedStates.set(terminal.writes.length, state);
        trace.composition(state);
      });
      let captured: string[] = [];
      try {
        terminal.resize(columns, rows);
        shell.runtime.renderNow();
        await nextImmediate();
        vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
        const tick = async (ms = 16) => { await nextImmediate(); await vi.advanceTimersByTimeAsync(ms); };
        const assistant = (text: string, stopReason = "pending") => ({
          role: "assistant", content: [{ type: "text", text }], timestamp: 900, stopReason,
        });
        if (stream !== "none") {
          engine.session.emit({ type: "agent_start" });
          engine.session.emit(stream === "assistant"
            ? { type: "message_start", message: assistant("stream begins") }
            : { type: "tool_execution_start", toolCallId: "hover-tool", toolName: "bash", args: { command: "fixture" } });
          await adapter.flushEvents(); await tick();
        }
        const row = shell.root.viewportFrameDescriptor()!.transcript!.rowEnd;
        const column = Math.floor(columns / 2);
        const mouse = (code: number, x = column) => terminal.input(`\u001b[<${code};${x};${row}M`);
        let chunks = 0;
        const burst = async () => {
          if (stream === "none") return;
          for (let index = 0; index < 3; index++) {
            const text = Array.from({ length: ++chunks }, (_, line) => `stream line ${line}`).join("\n");
            engine.session.emit(stream === "assistant"
              ? { type: "message_update", message: assistant(text), assistantMessageEvent: { type: "text_delta", delta: text } }
              : { type: "tool_execution_update", toolCallId: "hover-tool", toolName: "bash", partialResult: { content: [{ type: "text", text }] } });
            await adapter.flushEvents();
          }
        };
        const checkpoint = async (name: string, expected: boolean | null, action: () => void | Promise<void>) => {
          const start = terminal.writes.length;
          await action(); await tick();
          const firstPaint = terminal.writes.findIndex((data, index) => index >= start && data.includes("\u001b[?2026h"));
          expect(firstPaint, name).toBeGreaterThanOrEqual(start);
          const end = firstPaint + 1;
          const state = paintedStates.get(end)!;
          expect(state.composedRevision, name).toBe(state.currentRevision);
          expect(state.composedPointer, name).toEqual(state.currentPointer);
          checkpoints.push({ name, end, start, expected, state });
        };
        // Invariant: no editor input; streaming bursts precede hover, wheel reports own hide/reveal.
        await checkpoint("wheel-reveal", true, () => mouse(64));
        let top = shell.root.viewportPresentationEvidence().scrollTop;
        await checkpoint("hover-leave-with-stream-pending", false, async () => { await burst(); mouse(35, 1); });
        expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(top);
        await checkpoint("hover-enter-with-stream-pending", true, async () => { await burst(); mouse(35); });
        expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(top);
        for (let cycle = 0; cycle < 2; cycle++) {
          await checkpoint(`stationary-hide-${cycle}`, null, () => {
            const state = shell.root.viewportPresentationEvidence();
            for (let step = 0; step < Math.ceil((state.maxScroll - state.scrollTop) / 3); step++) mouse(65);
          });
          await checkpoint(`stationary-reveal-${cycle}`, true, () => mouse(64));
        }
        if (stream !== "none") {
          // Concurrency: advance status and coalescer timers without sending another pointer report.
          await checkpoint("spinner-and-stream-flush", true, () => tick(85));
          top = shell.root.viewportPresentationEvidence().scrollTop;
          await checkpoint("completion", true, async () => {
            engine.session.emit(stream === "assistant"
              ? { type: "message_end", message: assistant(Array.from({ length: chunks }, (_, line) => `stream line ${line}`).join("\n"), "stop") }
              : { type: "tool_execution_end", toolCallId: "hover-tool", toolName: "bash", result: { content: [{ type: "text", text: Array.from({ length: chunks }, (_, line) => `stream line ${line}`).join("\n") }] }, isError: false });
            await adapter.flushEvents();
          });
          expect(shell.root.viewportPresentationEvidence().scrollTop).toBe(top);
        }
        expect(shell.root.editor.getText()).toBe("");
        captured = [...terminal.writes];
      } finally {
        inputSpy.mockRestore(); writeSpy.mockRestore();
        await shell.dispose(); vi.useRealTimers();
      }
      const writes = captured.map((data, atMs) => ({ data, atMs }));
      for (const point of checkpoints) {
        const prefix = writes.slice(0, point.end);
        const cells = await replayTerminalBackgroundCells(prefix, { columns, rows });
        const target = cells.find(cell => cell.row === point.state.bottom?.row && cell.column === Math.floor(columns / 2));
        if (point.expected === null) expect(point.state.bottom, point.name).toBeNull();
        else expect(target, point.name).toMatchObject({ mode: "rgb", color: point.expected ? 0x3a3a4a : 0x282832 });
        trace.paint(point.state, point.expected === null ? null : target?.color === 0x3a3a4a);
        const damage = classifyTerminalPaint(writes.slice(point.start, point.end));
        if (point.name.startsWith("hover-")) {
          expect(damage.fullScreenClears, point.name).toBe(0);
          // Concurrency: damage from changing transcript/status rows is independent of hover.
          if (stream === "none") expect(damage.addressedRowWrites, point.name).toEqual([point.state.bottom!.row]);
        }
        const [text] = await replayTerminalCheckpoints(prefix, [{ columns, rows, writeEnd: prefix.length }]);
        if (point.expected === null) expect(text!.rows.join("\n")).not.toContain("Jump to bottom");
        else expect(text!.rows.join("\n")).toMatch(/Jump to bottom|new message/);
      }
      // Performance: replay one real hover transaction token-by-token in both synchronization modes.
      // Whole-session backgrounds above use complete-write replay; replaying every ANSI
      // token in every wheel full-frame would add irrelevant per-token timer overhead.
      const transition = checkpoints.find(point => point.name.startsWith("hover-"))!;
      const hoverWrites = writes.slice(transition.start, transition.end);
      const honored = await replayTerminalPaint(hoverWrites, { columns, rows, synchronizedUpdates: "honor" });
      const ignored = await replayTerminalPaint(hoverWrites, { columns, rows, synchronizedUpdates: "ignore" });
      expect(honored.final).toEqual(ignored.final);
      const evidence = trace.snapshot();
      expect(evidence.truncated).toBe(false);
      expect(evidence.events.some(event => event.phase === "input" && event.mouse?.kind === "motion")).toBe(true);
      expect(classifyBottomHoverFinding({ complete: !evidence.truncated, failureObserved: false,
        reportObserved: true, compositionMatches: true, paintMatches: true })).toBe("inconclusive");
    }, { hyperlinks: false });
  }, 20_000);

  it("hovers the first reappearing bottom-control frame beneath a stationary cursor", async () => {
    const messages = Array.from({ length: 20 }, (_, index) => ({
      role: "assistant", content: [{ type: "text", text: `reply ${index}` }], timestamp: Date.now() + index,
    }));
    const { terminal, shell } = await fixture(messages, [], true);
    try {
      terminal.resize(60, 12);
      shell.root.render(60);
      const row = shell.root.viewportFrameDescriptor()!.transcript!.rowEnd;
      const label = " Jump to bottom (Ctrl+End) ↓ ";
      const expectControl = (hovered: boolean) => {
        const frame = shell.root.render(60);
        const control = frame.find(line => stripTerminalSequences(line).includes(label));
        expect(control).toContain(piTheme().bg(hovered ? "selectedBg" : "toolPendingBg", piTheme().fg("text", label)));
      };
      const expectHidden = () => expect(shell.root.render(60).some(line => stripTerminalSequences(line).includes(label))).toBe(false);

      // Invariant: no motion report precedes the first wheel or any of these hide/reveal cycles.
      for (let cycle = 0; cycle < 3; cycle += 1) {
        terminal.input(`\u001b[<64;30;${row}M`);
        expectControl(true);
        expect(shell.root.viewportFrameDescriptor()!.followingEnd).toBe(false);
        terminal.input(`\u001b[<65;30;${row}M`);
        expectHidden();
      }
      terminal.input("\u001b[1;5H");
      await nextImmediate();
      expectControl(true);
      terminal.input(`\u001b[<0;30;${row}M`);
      expectHidden();
      terminal.input(`\u001b[<0;30;${row}m`);
      // Invariant: an unclaimed non-motion report while hidden replaces the remembered position.
      terminal.input(`\u001b[<1;1;${row}M`);
      terminal.input("\u001b[1;5H");
      await nextImmediate();
      expectControl(false);
      terminal.input(`\u001b[<0;1;${row}M`);
      terminal.input(`\u001b[<0;1;${row}m`);
      expectControl(false);
      expect(shell.root.viewportFrameDescriptor()!.followingEnd).toBe(false);

      // Invariant: hover updates must survive the next same-height dock-only presentation.
      terminal.input(`\u001b[<35;30;${row}M`);
      expectControl(true);
      const before = shell.root.viewportCompositionEvidence();
      terminal.input("x");
      await nextImmediate();
      expect(shell.root.viewportCompositionEvidence().dockOnly).toBeGreaterThan(before.dockOnly);
      expectControl(true);
      terminal.input(`\u001b[<35;1;${row}M`);
      expectControl(false);
    } finally {
      await shell.dispose();
    }
  });

  it("reconciles bottom hover with dock movement and terminal resize without new pointer reports", async () => {
    const messages = Array.from({ length: 20 }, (_, index) => ({
      role: "assistant", content: [{ type: "text", text: `reply ${index}` }], timestamp: Date.now() + index,
    }));
    const { terminal, shell } = await fixture(messages, [], true);
    try {
      terminal.resize(60, 16);
      shell.root.render(60);
      const row = shell.root.viewportFrameDescriptor()!.transcript!.rowEnd;
      const label = " Jump to bottom (Ctrl+End) ↓ ";
      const expectControl = (width: number, hovered: boolean) => {
        const frame = shell.root.render(width);
        const control = frame.find(line => stripTerminalSequences(line).includes(label));
        expect(control).toContain(piTheme().bg(hovered ? "selectedBg" : "toolPendingBg", piTheme().fg("text", label)));
      };
      terminal.input(`\u001b[<64;30;${row}M`);
      expectControl(60, true);
      shell.root.editor.setText("one\ntwo\nthree");
      expectControl(60, false);
      shell.root.editor.setText("");
      expectControl(60, true);
      terminal.resize(100, 16);
      expectControl(100, false);
      terminal.resize(60, 16);
      expectControl(60, true);
    } finally {
      await shell.dispose();
    }
  });

  it("keeps the reserved rail cell as one blank after a fitting prompt timestamp", async () => {
    const timestamp = new Date(2026, 3, 2, 14, 48).getTime();
    const { terminal, shell } = await fixture([
      { role: "user", content: [{ type: "text", text: "analyze code base" }], timestamp },
    ], [], true);
    terminal.resize(60, 12);
    const frame = shell.root.render(60).map(row => stripTerminalSequences(row));
    const promptIndex = frame.findIndex(row => row.includes("analyze code base"));
    expect(promptIndex).toBe(1);
    expect(frame[0]?.trim()).toBe("");
    expect(frame[promptIndex]).toMatch(/14:48 $/);
  });

  it("uses terminal-native inactive and hover styling for submitted URL links", async () => {
    await withPinnedHyperlinks(async () => {
      const url = "https://example.com/a/complete/source?with=details";
      const { terminal, shell } = await fixture([
        { role: "user", content: [{ type: "text", text: url }], timestamp: Date.now() },
      ], [], true);
      terminal.resize(100, 12);
      const row = shell.root.render(100).find(line => stripTerminalSequences(line).includes(url)) ?? "";

      expect(row).toContain(`\u001b]8;;${url}\u001b\\`);
      expect(row).toContain(piTheme().fg("mdLink", url));
      expect(row).not.toContain("\u001b[4m");
      await shell.dispose();
    });
  });

  it("uses the same terminal-native cyan styling for assistant-content URL links", async () => {
    await withPinnedHyperlinks(async () => {
      const url = "https://www.theverge.com/reviews";
      const { terminal, shell } = await fixture([
        { role: "assistant", content: [{ type: "text", text: `The corrected link is:\n\n${url}` }], timestamp: Date.now() },
      ], [], true);
      terminal.resize(100, 12);
      const row = shell.root.render(100).find(line => stripTerminalSequences(line).includes(url)) ?? "";

      expect(row).toContain(`\u001b]8;;${url}\u001b\\`);
      expect(row).toContain(piTheme().fg("mdLink", url));
      expect(row).not.toContain("\u001b[4m");
      await shell.dispose();
    });
  });

  it("keeps transcript links dotted and non-interactive while LMB selection is held", async () => {
    await withPinnedHyperlinks(async () => {
      const label = "package.json";
      const target = "file:///D:/work/package.json";
      const { terminal, shell } = await fixture([
        { role: "assistant", content: [{ type: "text", text: `[${label}](${target})` }], timestamp: Date.now() },
      ], [], true);
      terminal.resize(100, 12);
      const initial = shell.root.render(100);
      const rowIndex = initial.findIndex(line => stripTerminalSequences(line).includes(label));
      const plain = stripTerminalSequences(initial[rowIndex] ?? "");
      const start = plain.indexOf(label) + 1;
      const end = start + label.length - 1;
      const row = rowIndex + 1;

      terminal.input(`\u001b[<0;${start};${row}M`);
      const held = shell.root.render(100)[rowIndex] ?? "";
      expect(held).not.toContain(`\u001b]8;;${target}\u001b\\`);
      expect(held).toContain("\u001b[4:4m");
      expect(held).toContain("p\uFE0Eackage.json");
      expect(getPinnedPiTuiLinkAtColumn(held, start - 1)).toBeUndefined();

      terminal.input(`\u001b[<32;${end + 1};${row}M`);
      terminal.input(`\u001b[<0;${end + 1};${row}m`);
      const released = shell.root.render(100)[rowIndex] ?? "";
      expect(released).toContain(`\u001b]8;;${target}\u001b\\`);
      await vi.waitFor(() => expect(terminal.writes).toContain(
        `\u001b]52;c;${Buffer.from(label).toString("base64")}\u0007`,
      ));
      await shell.dispose();
    });
  });

  it("keeps file hyperlinks cyan while web URLs use link blue", async () => {
    // Compatibility: the dark theme's accent and mdLink colors both quantize to ANSI 256 color
    // 109, so use truecolor when asserting which semantic color was selected.
    const themeName = piTheme().name ?? "dark";
    const themeMode = piTheme().getColorMode();
    applyPiTheme(themeName, false, "truecolor");
    try {
      await withPinnedHyperlinks(async () => {
        const label = "src/app/session-shell/session-shell-root.ts";
        const target = "file:///D:/Git/a1/src/app/session-shell/session-shell-root.ts";
        const { terminal, shell } = await fixture([{
          role: "assistant",
          content: [{ type: "text", text: `[${label}](${target})` }],
          timestamp: Date.now(),
        }], [], true);
        terminal.resize(120, 12);
        const row = shell.root.render(120).find(line => stripTerminalSequences(line).includes(label)) ?? "";
        const start = stripTerminalSequences(row).indexOf(label);

        expect(row).toContain(`\u001b]8;;${target}\u001b\\`);
        expect(row).toContain(piTheme().fg("accent", label));
        expect(row).not.toContain(piTheme().fg("mdLink", label));
        expect(getPinnedPiTuiLinkAtColumn(row, start)).toBe(target);
        await shell.dispose();
      });
    } finally {
      applyPiTheme(themeName, false, themeMode);
    }
  });

  it("bounds bare bash-output URLs to stable terminal-native hover cells", async () => {
    const first = "https://github.com/timurproko/a1/actions/runs/33100113637/job/98615286055";
    const second = "https://github.com/timurproko/a1/actions/runs/33100113637/job/98615285949";
    const { terminal, shell } = await fixture([{
      role: "bashExecution",
      command: "gh pr checks 144",
      output: `Fast validation pass ${first}\nProcess containment pass ${second}`,
      exitCode: 0,
      cancelled: false,
      timestamp: Date.now(),
    }], [], true);
    terminal.resize(180, 12);
    const rows = shell.root.render(180);

    for (const url of [first, second]) {
      const row = rows.find(line => stripTerminalSequences(line).includes(url)) ?? "";
      const plain = stripTerminalSequences(row);
      const start = plain.indexOf(url);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(row).toContain(`\u001b]8;;${url}\u001b\\`);
      expect(row).toContain(piTheme().fg("mdLink", url));
      expect(getPinnedPiTuiLinkAtColumn(row, start)).toBe(url);
      expect(getPinnedPiTuiLinkAtColumn(row, start + url.length)).toBeUndefined();
    }

    const firstRowIndex = rows.findIndex(line => stripTerminalSequences(line).includes(first));
    const firstColumn = stripTerminalSequences(rows[firstRowIndex] ?? "").indexOf(first) + 1;
    shell.runtime.renderNow();
    const redrawsBeforeHover = shell.runtime.fullRedraws;
    terminal.input(`\u001b[<35;${firstColumn};${firstRowIndex + 1}M`);
    shell.runtime.renderNow();
    expect(shell.runtime.fullRedraws).toBe(redrawsBeforeHover);
    terminal.input(`\u001b[<35;1;${firstRowIndex + 1}M`);
    shell.runtime.renderNow();
    expect(shell.runtime.fullRedraws).toBe(redrawsBeforeHover);
    expect(shell.damagePresentationDecision()).toMatchObject({ reason: "hyperlink-cleanup", paintedRows: [firstRowIndex + 1] });

    terminal.input(`\u001b[<35;${firstColumn};${firstRowIndex + 1}M`);
    shell.runtime.renderNow();
    const redrawsBeforeShift = shell.runtime.fullRedraws;
    shell.root.appendWorkflowStatus("shift link away ".repeat(300));
    shell.runtime.requestRender();
    shell.runtime.renderNow();
    shell.runtime.renderNow();
    expect(shell.runtime.fullRedraws).toBe(redrawsBeforeShift);
    await shell.dispose();
  });

  it.each(["wheel", "keyboard", "scrollbar"] as const)("preserves a complete same-frame hyperlink cleanup during %s navigation", async navigation => {
    await withPinnedHyperlinks(async () => {
      for (const mode of ["explicit", "auto-detected"] as const) {
        const label = mode === "explicit" ? "hover-label" : "file:///C:/work/ghost-source.ts";
        const source = mode === "explicit" ? `[${label}](https://example.test/target)` : `\`${label}\``;
        const { terminal, shell } = await fixture([{
          role: "assistant", content: [{ type: "text", text: [source, ...Array.from({ length: 140 }, (_, index) => `plain row ${index}`)].join("\n\n") }], timestamp: 1,
        }], [], true);
        try {
          terminal.resize(192, 54);
          shell.root.setViewportConfig({ scrollbarAppearance: "always", scrollbarStyle: "thin", scrollbarSpeed: "normal" });
          shell.runtime.renderNow();
          terminal.input("\u001b[1;5H");
          shell.runtime.renderNow();
          const initial = shell.root.render(192);
          const row = initial.findIndex(line => stripTerminalSequences(line).includes(label));
          expect(row).toBeGreaterThanOrEqual(0);
          const column = stripTerminalSequences(initial[row]!).indexOf(label);
          if (mode === "auto-detected") expect(getPinnedPiTuiLinkAtColumn(initial[row]!, column)).toBeUndefined();
          terminal.input(`\u001b[<35;${column + 2};${row + 1}M`);
          shell.runtime.renderNow();
          const before = terminal.writes.length;
          if (navigation === "wheel") terminal.input("\u001b[<65;5;3M");
          else if (navigation === "keyboard") terminal.input("\u001b[1;5F");
          else {
            const bottom = shell.root.viewportFrameDescriptor()!.transcript!.rowEnd;
            terminal.input(`\u001b[<0;192;${bottom}M\u001b[<0;192;${bottom}m`);
          }
          shell.runtime.renderNow();
          const paints = terminal.writes.slice(before).filter(write => write.includes("\u001b[?2026h"));
          expect(paints.length).toBeGreaterThan(0);
          const damage = classifyTerminalPaint(paints.map((data, atMs) => ({ data, atMs })));
          expect(damage.fullScreenClears).toBe(0);
          expect(damage.synchronizedUpdates.balanced).toBe(true);
          expect(damage.addressedRowWrites).toContain(row + 1);
          const viewportEnd = shell.root.viewportFrameDescriptor()!.transcript!.rowEnd;
          expect(damage.addressedRowWrites.every(painted => painted <= viewportEnd)).toBe(true);
          const expected = shell.root.render(192).map(line => stripTerminalSequences(line).trimEnd());
          const replay = await replayTerminalPaint(terminal.writes.map((data, atMs) => ({ data, atMs })), {
            columns: 192, rows: 54, synchronizedUpdates: "honor",
          });
          expect(replay.final.rows.map(line => line.trimEnd())).toEqual(expected);
          expect(expected.some(line => line.includes(label))).toBe(false);
          expect(paints.at(-1)).not.toContain("https://example.test/target");
        } finally { await shell.dispose(); }
      }
    });
  });

  it("cleans a link covered by a downstream overlay and restores its actual target on close", async () => {
    await withPinnedHyperlinks(async () => {
      const { terminal, shell } = await fixture([{
        role: "assistant", content: [{ type: "text", text: "[hover-label](https://example.test/target)" }], timestamp: 1,
      }], [], true);
      try {
        terminal.resize(192, 54);
        shell.runtime.renderNow();
        const before = terminal.writes.length;
        const overlay = shell.runtime.showOverlay({
          render: width => Array.from({ length: 50 }, () => "covered".padEnd(width)), invalidate() {},
        }, { anchor: "top-left", width: 192 });
        shell.runtime.renderNow();
        const overlayWrites = terminal.writes.slice(before);
        expect(overlayWrites.some(write => write.includes("\u001b[2J"))).toBe(false);
        const cleanup = overlayWrites.find(write => write.includes("covered"));
        expect(cleanup).toBeDefined();
        expect(cleanup).toContain("covered");
        expect(cleanup).not.toContain("https://example.test/target");
        overlay.hide();
        shell.runtime.renderNow();
        expect(terminal.writes.at(-1)).toContain("https://example.test/target");
      } finally { await shell.dispose(); }
    });
  });

  it("coalesces followed streaming into a latest-state cleanup without waiting for mouse motion", async () => {
    const { engine, adapter, terminal, shell } = await fixture([], [], true);
    const assistant = (text: string) => ({ role: "assistant", content: [{ type: "text", text }], stopReason: "pending", timestamp: 5 });
    try {
      terminal.resize(192, 54);
      const first = "https://example.test/streaming";
      engine.session.emit({ type: "message_start", message: assistant(first) });
      await adapter.flushEvents();
      shell.runtime.renderNow();
      const before = terminal.writes.length;
      const tail = Array.from({ length: 90 }, (_, index) => `latest row ${index}`).join("\n\n");
      engine.session.emit({ type: "message_update", message: assistant(`${first}\n\n${tail}`), assistantMessageEvent: { delta: `\n\n${tail}` } });
      await adapter.flushEvents();
      shell.runtime.renderNow();
      const changed = terminal.writes.slice(before);
      expect(changed.some(write => write.includes("\u001b[2J"))).toBe(false);
      expect(changed.some(write => write.includes("latest row 89"))).toBe(true);
      expect(shell.root.render(192).join("\n")).not.toContain(first);
      const settled = terminal.writes.length;
      await nextImmediate();
      expect(terminal.writes.slice(settled).some(write => write.includes(first))).toBe(false);
    } finally { await shell.dispose(); }
  });

  it.each([[20, false], [500, false], [20, true], [500, true]] as const)(
    "keeps dock input bounded with %i settled paragraphs (linked=%s)", async (paragraphs, linked) => {
      const scheduler = new InputImmediateScheduler();
      const content = [...Array.from({ length: paragraphs }, (_, index) => `settled paragraph ${index}`),
        linked ? "https://example.test/visible-tail" : "plain visible tail"].join("\n\n");
      const { terminal, shell } = await fixture([{
        role: "assistant", content: [{ type: "text", text: content }], timestamp: 1,
      }], [], true, undefined, undefined, undefined, { scheduler });
      try {
        terminal.resize(192, 54);
        shell.runtime.renderNow();
        await nextImmediate();
        const compositions = shell.root.viewportCompositionEvidence();
        const blocks = shell.root.transcriptRenderCount();
        const before = terminal.writes.length;
        terminal.input("a"); terminal.input("b"); terminal.input("c");
        scheduler.flush();
        await nextImmediate();
        expect(shell.root.editor.getText()).toBe("abc");
        expect(shell.root.transcriptRenderCount()).toBe(blocks);
        expect(shell.root.viewportCompositionEvidence()).toEqual({ full: compositions.full, dockOnly: compositions.dockOnly + 1 });
        const frames = terminal.writes.slice(before).filter(write => write.includes("\u001b[?2026h"));
        expect(frames.some(write => write.includes("\u001b[2J"))).toBe(false);
        const dockStart = shell.root.viewportFrameDescriptor()!.dock!.rowStart;
        for (const write of frames) {
          const painted = classifyTerminalPaint([{ data: write, atMs: 0 }]).addressedRowWrites;
          expect(painted.every(row => row >= dockStart)).toBe(true);
        }
      } finally { await shell.dispose(); }
    },
  );

  it("preserves semantic link copy and cleanup through selection edge auto-scroll and release", async () => {
    const url = "https://example.test/source";
    const { terminal, shell } = await fixture(Array.from({ length: 40 }, (_, index) => ({
      role: "assistant", content: [{ type: "text", text: `selection row ${index} ${url}` }], timestamp: index + 1,
    })), [], true);
    try {
      terminal.resize(100, 20);
      shell.runtime.renderNow();
      terminal.input("\u001b[<0;5;3M");
      terminal.input("\u001b[<32;5;1M");
      shell.runtime.renderNow();
      const before = shell.root.viewportFrameDescriptor()!.nextDocumentRange.start;
      await new Promise(resolve => setTimeout(resolve, 75));
      shell.runtime.renderNow();
      expect(shell.root.viewportFrameDescriptor()!.nextDocumentRange.start).toBeLessThan(before);
      expect(shell.root.hasActiveSelection()).toBe(true);
      const releaseStart = terminal.writes.length;
      terminal.input("\u001b[<0;5;1m");
      shell.runtime.renderNow();
      const releaseWrites = terminal.writes.slice(releaseStart);
      expect(releaseWrites.some(write => write.includes("\u001b[2J"))).toBe(false);
      const release = releaseWrites.find(write => write.includes(`\u001b]8;;${url}\u001b\\`));
      expect(release).toContain(`\u001b]8;;${url}\u001b\\`);
      expect(release).not.toContain("\uFE0E");
      await vi.waitFor(() => expect(
        terminal.writes.some(write => write.startsWith("\u001b]52;c;")),
      ).toBe(true));
      const copyWrite = terminal.writes.findLast(write => write.startsWith("\u001b]52;c;"));
      expect(copyWrite).toBeDefined();
      const copied = Buffer.from(copyWrite!.slice("\u001b]52;c;".length, -1), "base64").toString("utf8");
      expect(copied).toContain(url);
      expect(copied).toContain("selection row");
      expect(copied).not.toContain("\u001b");
      expect(copied).not.toContain("\uFE0E");
    } finally { await shell.dispose(); }
  });

  it.each([false, true])("keeps production content and gutter paint truthful for a released right-edge selection (included=%s)", async included => {
    const width = 192;
    const contentWidth = width - 1;
    const text = "a".repeat(contentWidth - 1) + "Z";
    const { terminal, shell } = await fixture(Array.from({ length: 30 }, (_, index) => ({
      role: "assistant", content: [{ type: "text", text }], timestamp: index + 1,
    })), [], true);
    let now = Date.now();
    const clock = vi.spyOn(Date, "now").mockImplementation(() => now);
    const screen = new HeadlessXterm.Terminal({ cols: width, rows: 20, allowProposedApi: true, scrollback: 0 });
    let writeOffset = 0;
    try {
      terminal.resize(width, 20);
      shell.root.setOutputPad(0);
      shell.root.setViewportConfig({ scrollbarAppearance: "auto", scrollbarStyle: "thin", scrollbarSpeed: "normal" });
      // Rationale: keep this rail fixture on explicit copy so transient acknowledgement chrome does not change its rows.
      shell.root.setFullscreenCopyOnSelect(false);
      shell.runtime.renderNow();
      const source = shell.root.render(width).map(row => stripTerminalSequences(row));
      const sourceRows = source.flatMap((row, index) => row.trimEnd().endsWith("Z") ? [index] : []);
      expect(sourceRows.length).toBeGreaterThanOrEqual(3);
      const first = sourceRows[0]!;
      const last = sourceRows[2]!;
      expect(source[first]!.slice(0, contentWidth)).toBe(text);
      const endpoint = contentWidth - (included ? 0 : 1);
      const expectedCopy = source.slice(first, last + 1).map((row, index, rows) =>
        row.slice(0, index === rows.length - 1 ? endpoint : contentWidth).trimEnd(),
      ).join("\n");
      terminal.input(`\u001b[<0;1;${first + 1}M\u001b[<32;${endpoint};${last + 1}M\u001b[<0;${endpoint};${last + 1}m`);
      shell.runtime.renderNow();
      const revision = shell.root.viewportFrameDescriptor()!.selectionRevision;
      for (const style of ["thin", "thick"] as const) {
        shell.root.setViewportConfig({ scrollbarAppearance: "auto", scrollbarStyle: style, scrollbarSpeed: "normal" });
        for (const hovered of [false, true, false, true, false]) {
          now += 1000;
          terminal.input(`\u001b[<35;${hovered ? width : 4};${last + 1}M`);
          for (let repeat = 0; repeat < 2; repeat++) {
            shell.runtime.renderNow();
            expect(shell.root.viewportFrameDescriptor()!.selectionRevision).toBe(revision);
            const data = terminal.writes.slice(writeOffset).join("");
            writeOffset = terminal.writes.length;
            if (data) await new Promise<void>(resolve => screen.write(data, resolve));
            for (const row of sourceRows.slice(0, 3)) {
              const contentCell = screen.buffer.active.getLine(row)!.getCell(contentWidth - 1)!;
              const gutterCell = screen.buffer.active.getLine(row)!.getCell(width - 1)!;
              expect(contentCell.isBgRGB() && contentCell.getBgColor() === 0x264f78).toBe(row < last || included);
              expect(contentCell.getChars()).toBe("Z");
              expect(gutterCell.isBgDefault()).toBe(true);
              expect(hovered ? ["│", "┃"] : [" "]).toContain(gutterCell.getChars() || " ");
            }
          }
        }
      }
      terminal.input("\u0003");
      await nextImmediate();
      expect(terminal.writes).toContain(`\u001b]52;c;${Buffer.from(expectedCopy).toString("base64")}\u0007`);
    } finally { screen.dispose(); clock.mockRestore(); await shell.dispose(); }
  });
});
