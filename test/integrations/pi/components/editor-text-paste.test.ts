import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { promptInputPresentation } from "../../../support/prompt-input-presentation.js";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { StdinBuffer, stripTerminalSequences, visibleWidth } from "#pi-tui";
import { describe, expect, it, vi } from "vitest";
import { createPiShellEditor, loadHistoryEditor, type PiShellClipboardContent, type PiShellEditorPort } from "../../../../src/integrations/pi/components/index.js";
import { PromptChipStore } from "../../../../src/integrations/pi/session-ui/prompt-chips.js";

const payload = Array.from({ length: 136 }, (_, i) => `line ${i} 日本語`).join("\n");
const framed = (text: string) => `\x1b[200~${text}\x1b[201~`;
const tagPattern = /\[paste #\d+ (?:\+\d+ lines|\d+ chars)\]/gu;

async function fixture(history: boolean, fallback = false) {
  const directory = await mkdtemp(join(tmpdir(), "text-paste-editor-"));
  await writeFile(join(directory, "keybindings.json"), JSON.stringify({ "tui.editor.historyPrevious": "ctrl+p", "tui.editor.historyNext": "ctrl+n" }));
  const chips = new PromptChipStore();
  const copied: string[] = [], submitted: string[] = [];
  let read: () => Promise<PiShellClipboardContent | null> = async () => ({ kind: "text", text: payload });
  let editor!: PiShellEditorPort;
  editor = createPiShellEditor({
    keybindingProfile: "a1", agentDir: directory, cwd: directory,
    ...(history ? { persistentHistory: true, historyEditor: await loadHistoryEditor() } : {}),
    getColumns: () => 80, getRows: () => 24, requestRender() {},
    onSubmit: text => submitted.push(chips.prepareSubmission(text).text),
    onCopyText: text => copied.push(text), readClipboardContent: () => read(),
    ...(fallback ? {} : { beginClipboardPaste: () => chips.beginPaste(editor.getText(), () => read(), () => {}) }),
    transformPastedContent: content => chips.transformPastedContent(content),
    editorAtomicRanges: line => chips.atomicRanges(line), editorHiddenRanges: line => chips.hiddenRanges(line),
    expandCopiedEditorText: text => chips.expandCopiedText(text),
    promptPresentation: promptInputPresentation(),
  });
  editor.setFocused?.(true);
  editor.render(80);
  return { editor, chips, copied, submitted,
    input: (data: string) => editor.handleInput?.(data),
    read: (value: () => Promise<PiShellClipboardContent | null>) => { read = value; },
    text: () => chips.prepareSubmission(editor.getText()).text,
    dispose: async () => { editor.cancelPendingPastes?.(); await chips.dispose(); await rm(directory, { recursive: true, force: true }); },
  };
}

describe.each([false, true])("large text chips with history=%s", history => {
  it.each(["shortcut", "right-click port", "fallback", "terminal"])("collapses the %s route and submits complete text", async route => {
    const test = await fixture(history, route === "fallback");
    try {
      test.editor.setText("replace me"); test.input("\x01");
      if (route === "terminal") test.input(framed(payload));
      else if (route === "right-click port") test.editor.pasteClipboard?.();
      else test.input("\x16");
      await vi.waitFor(() => expect(test.editor.getText()).toBe("[paste #1 +136 lines]"));
      expect(stripTerminalSequences(test.editor.render(80).join("\n"))).toContain("[paste #1 +136 lines]");
      expect(test.submitted).toEqual([]);
      test.input("\r"); expect(test.submitted).toEqual([payload]);
    } finally { await test.dispose(); }
  });

  it("resolves each asynchronous paste at its reserved selection/caret without moving later text", async () => {
    const test = await fixture(history);
    let first!: (value: PiShellClipboardContent) => void, second!: (value: PiShellClipboardContent) => void;
    const reads = [new Promise<PiShellClipboardContent>(resolve => { first = resolve; }), new Promise<PiShellClipboardContent>(resolve => { second = resolve; })];
    test.read(() => reads.shift()!);
    try {
      test.editor.setText("replace"); test.input("\x01"); test.input("\x16");
      test.input(" middle "); test.input("\x16"); test.input(" tail");
      expect(stripTerminalSequences(test.editor.render(80).join("\n"))).not.toContain("screenshot-");
      second({ kind: "text", text: "b".repeat(1001) });
      await vi.waitFor(() => expect(test.editor.getText().match(tagPattern)).toHaveLength(1));
      first({ kind: "text", text: payload });
      await vi.waitFor(() => expect(test.editor.getText().match(tagPattern)).toHaveLength(2));
      expect(test.text()).toBe(payload + " middle " + "b".repeat(1001) + " tail");
      test.input("!"); expect(test.text()).toBe(payload + " middle " + "b".repeat(1001) + " tail!");
      test.input("\x1a"); test.input("\x19");
      expect(test.text()).toBe(payload + " middle " + "b".repeat(1001) + " tail!");
    } finally { await test.dispose(); }
  });

  it("owns fragmented bodies and preserves input surrounding multiple terminal frames", async () => {
    const test = await fixture(history);
    try {
      test.input("before \x1b[200~" + payload.slice(0, 15));
      test.input(payload.slice(15) + "\x1b[20");
      expect(test.editor.getText()).toBe("before "); expect(test.submitted).toEqual([]);
      test.input("1~ middle " + framed("b".repeat(1001)) + " after");
      expect(test.editor.getText().match(tagPattern)).toHaveLength(2);
      expect(test.text()).toBe("before " + payload + " middle " + "b".repeat(1001) + " after");
      test.input("\x16");
      await vi.waitFor(() => expect(test.editor.getText().match(tagPattern)).toHaveLength(3));
      expect(test.text()).toBe("before " + payload + " middle " + "b".repeat(1001) + " after" + payload);
    } finally { await test.dispose(); }
  });

  it("uses the terminal framing boundary for arbitrary splits in opening and closing delimiters", async () => {
    const test = await fixture(history);
    // Compatibility: use the same public framing API and paste rewrapping as pinned ProcessTerminal.
    const stdin = new StdinBuffer();
    stdin.on("data", test.input); stdin.on("paste", text => test.input(framed(text)));
    try {
      for (let split = 1; split < 6; split++) {
        test.editor.setText("");
        const open = "\x1b[200~", close = "\x1b[201~";
        stdin.process(open.slice(0, split)); stdin.process(open.slice(split));
        stdin.process(payload.slice(0, 19)); stdin.process(payload.slice(19));
        stdin.process(close.slice(0, split)); stdin.process(close.slice(split) + " tail");
        expect(test.editor.getText().match(tagPattern)).toHaveLength(1);
        expect(test.text()).toBe(payload + " tail"); expect(test.submitted).toEqual([]);
      }
    } finally { stdin.destroy(); await test.dispose(); }
  });

  it("traverses, selects, copies, cuts, deletes, and restores chips atomically", async () => {
    const test = await fixture(history);
    try {
      test.input("left "); test.input(framed(payload));
      const draft = test.editor.getText();
      test.input("\x1b[D"); test.input("X"); expect(test.editor.getText()).toBe("left X" + draft.slice(5));
      test.input("\x1b[C"); test.input("!"); expect(test.text()).toBe("left X" + payload + "!");
      test.input("\x7f"); test.input("\x7f"); expect(test.editor.getText()).toBe("left X");
      test.input("\x1a"); expect(test.text()).toBe("left X" + payload);
      test.input("\x1b[1;2D"); test.input("\x03"); expect(test.copied.at(-1)).toBe(payload);
      test.input("\x1b[1;2D"); test.input("\x18"); expect(test.copied.at(-1)).toBe(payload);
      expect(test.editor.getText()).toBe("left X");
      test.input("\x1a"); expect(test.text()).toBe("left X" + payload);
      test.input("\x19"); expect(test.editor.getText()).toBe("left X");
      // Invariant: undo restores the cut's selection-start caret, already at the chip boundary.
      test.input("\x1a"); test.input("\x1b[3~"); expect(test.editor.getText()).toBe("left X");
      test.input("\x1a"); test.input(framed("b".repeat(1001)));
      expect(test.text()).toContain(payload); expect(test.text()).toContain("b".repeat(1001));
    } finally { await test.dispose(); }
  });

  it("keeps narrow rows and pointer-selected chips semantic while literal markers stay editable", async () => {
    const test = await fixture(history);
    try {
      test.input("👩‍💻 "); test.input(framed(payload)); test.input(" tail");
      for (const width of [8, 12, 20, 40, 80]) {
        const rows = test.editor.render(width);
        expect(rows.every(row => visibleWidth(row) <= width)).toBe(true);
        expect(test.text()).toBe("👩‍💻 " + payload + " tail");
      }
      const rows = test.editor.render(80).map(stripTerminalSequences);
      const row = rows.findIndex(line => line.includes("[paste #1"));
      const column = rows[row]!.indexOf("[paste #1") - "👩‍💻".length + visibleWidth("👩‍💻") + 3;
      test.editor.handlePointer?.({ kind: "press", button: 0, row: row + 1, column });
      test.editor.handlePointer?.({ kind: "release", button: 0, row: row + 1, column });
      test.input("\x03"); expect(test.copied.at(-1)).toBe(payload);
      test.editor.setText("[paste #999 1001 chars]"); test.input("\x1b[D"); test.input("X");
      expect(test.editor.getText()).toBe("[paste #999 1001 charsX]");
    } finally { await test.dispose(); }
  });

  it("restores chip backing and cursor when returning from history", async () => {
    const test = await fixture(history);
    try {
      test.editor.addToHistory("older"); test.input("prefix "); test.input(framed(payload));
      const draft = test.editor.getText(); test.input("\x1b[D");
      test.input("\x10"); expect(test.editor.getText()).toBe("older");
      test.input("\x0e"); expect(test.editor.getText()).toBe(draft);
      test.input("X"); expect(test.text()).toBe("prefix X" + payload);
      test.input("\r"); expect(test.submitted).toEqual(["prefix X" + payload]);
    } finally { await test.dispose(); }
  });
});
