import HeadlessXterm from "@xterm/headless";
import { describe, expect, it } from "vitest";
import type { OwnedUiSessionViewModel } from "../../../src/contracts/owned-ui/index.js";
import { OwnedUiSessionShellRoot } from "../../../src/app/session-shell/session-shell-root.js";
import { applyPiTheme, setPiAccentColor } from "../../../src/integrations/pi/components/index.js";
import { PiTuiRuntimeAdapter } from "../../../src/integrations/pi/tui-runtime/adapter.js";
import { DamageAwareTerminalAdapter } from "../../../src/integrations/pi/tui-runtime/damage-aware-terminal.js";
import type { PiTuiTerminalPort } from "../../../src/integrations/pi/tui-runtime/contracts.js";
import { readVisibleHyperlinks, stripAnsi } from "../../../src/ui/components/index.js";

class ContentTerminal implements PiTuiTerminalPort {
  readonly kittyProtocolActive = false;
  readonly writes: string[] = [];
  readonly pending: Promise<void>[] = [];
  readonly screen: HeadlessXterm.Terminal;
  readonly columns: number;
  readonly rows: number;
  constructor(columns: number, rows: number) {
    this.columns = columns;
    this.rows = rows;
    this.screen = new HeadlessXterm.Terminal({ cols: columns, rows, allowProposedApi: true, scrollback: 0 });
  }
  start(): void {}
  stop(): void {}
  async drainInput(): Promise<void> {}
  write(data: string): void {
    this.writes.push(data);
    this.pending.push(new Promise(resolve => this.screen.write(data, resolve)));
  }
  moveBy(): void {}
  hideCursor(): void {}
  showCursor(): void {}
  clearLine(): void {}
  clearFromCursor(): void {}
  clearScreen(): void {}
  setTitle(): void {}
  setProgress(): void {}
  async flush(): Promise<void> { await Promise.all(this.pending.splice(0)); }
}

function contentView(columns: number, rows: number): OwnedUiSessionViewModel {
  return {
    contractVersion: 1, sessionId: "content-geometry", revision: 1, lifecycle: "ready",
    transcript: Array.from({ length: 30 }, (_, index) => ({
      id: `row-${index}`, kind: "assistant", status: "finalized", revision: 1,
      title: null, text: `reply ${index}\n\n${"body ".repeat(index % 6)}`, payload: {},
    })),
    editor: { text: "", queuedSubmissions: [], selection: null, cursorOffset: 0, historyRevision: 0, submitEnabled: true },
    status: { title: "Pi", workingMessage: null, diagnostics: [], badges: [] },
    terminal: { columns, rows, focusedRegion: "editor", hardwareCursor: false },
    activeModel: null, thinkingLevel: "medium", activeCommandIds: [], dialog: null,
    overlay: null, customizations: [], diagnostics: [],
  };
}

function fixture(childRows: number) {
  const terminal = new ContentTerminal(100, childRows);
  const damage = new DamageAwareTerminalAdapter(terminal, { regionalScroll: true, inspectHyperlinks: readVisibleHyperlinks });
  const view = contentView(terminal.columns, terminal.rows);
  let runtime: PiTuiRuntimeAdapter | undefined;
  let composed: readonly string[] = [];
  const root = new OwnedUiSessionShellRoot(view, "D:/synthetic", {
    getColumns: () => terminal.columns, getRows: () => terminal.rows,
    requestRender: force => runtime?.requestRender(force),
    onViewportFrame: () => {
      const descriptor = root.viewportFrameDescriptor();
      if (descriptor !== null) damage.arm(descriptor, { overlayActive: false, selectionActive: false, replacementSurfaceActive: false });
    },
    onSubmit() {}, onInterrupt() {}, onExit() {}, onModelSelect() {}, onThinkingCycle() {},
  }, { quiet: true }, undefined, undefined, "custom-viewport");
  runtime = new PiTuiRuntimeAdapter({
    root: { render: width => { composed = root.render(width); return composed; },
      invalidate: () => root.invalidate(), handleInput: data => root.handleInput(data) },
    terminal: damage, mode: "fullscreen", mouse: false,
  });
  return { terminal, root, view, runtime, composed: () => composed };
}

async function assertCurrentGrid(f: ReturnType<typeof fixture>): Promise<void> {
  f.runtime.renderNow();
  await f.terminal.flush();
  const descriptor = f.root.viewportFrameDescriptor()!;
  expect(descriptor.height).toBe(f.terminal.rows);
  expect(f.terminal.writes.join("")).not.toMatch(/\u001b\]133;[ABC](?:\u0007|\u001b\\)/u);
  const transcript = descriptor.transcript!;
  let controls = 0;
  for (let row = 0; row < f.terminal.rows; row++) {
    const actual = f.terminal.screen.buffer.active.getLine(row)!.translateToString(false);
    expect(actual, `child row ${row}`).toBe(stripAnsi(f.composed()[row] ?? "").padEnd(f.terminal.columns));
    if (/Jump to bottom|new messages? \(Ctrl/u.test(actual)) controls++;
    for (let column = 0; column < f.terminal.columns; column++) {
      if (!/[│┃]/u.test(f.terminal.screen.buffer.active.getLine(row)!.getCell(column)!.getChars())) continue;
      expect(column).toBe(f.terminal.columns - 1);
      expect(row).toBeGreaterThan(transcript.rowStart - 1);
      expect(row).toBeLessThan(transcript.rowEnd - 1);
    }
  }
  expect(controls).toBeLessThanOrEqual(1);
}

function transition(f: ReturnType<typeof fixture>, index: number): void {
  switch (index % 8) {
    case 0: f.root.handleViewportPreInput("\u001b[<64;1;10M"); break;
    case 1: f.root.editor.setText("one\ntwo\nthree"); break;
    case 2: f.root.editor.setText(""); f.root.noteCompletedAssistantMessage(); break;
    case 3: f.root.update({ ...f.view, lifecycle: "busy", status: { ...f.view.status, workingMessage: "Working" } }); break;
    case 4: f.root.handleViewportPreInput("\u001b[<65;1;10M"); break;
    case 5: f.root.update({ ...f.view, lifecycle: "ready" }); break;
    case 6: f.root.applyTranscriptBlock({ ...f.view.transcript[25]!, revision: index + 2, text: "changed content\n\nmore output" }); break;
    case 7: f.root.handleViewportPreInput("\u001b[1;5F"); break;
  }
}

describe("real fullscreen child content geometry", () => {
  it.each([24, 30, 34])("preserves the solo grid at outer height %i with exactly one reserved strip row", async outerRows => {
    setPiAccentColor("purple");
    applyPiTheme("dark", false, "truecolor");
    const f = fixture(outerRows - 1);
    try {
      f.runtime.start();
      await assertCurrentGrid(f);
      for (let index = 0; index < 40; index++) {
        transition(f, index);
        await assertCurrentGrid(f);
      }
    } finally {
      f.runtime.stop();
      f.root.dispose();
      f.terminal.screen.dispose();
    }
  });
});
