import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stripTerminalSequences } from "#pi-tui";
import { describe, expect, it } from "vitest";
import { createPiShellEditor, loadHistoryEditor } from "../../../../src/integrations/pi/components/index.js";

const marker = "[📷 screenshot-pending]";

/** Exercise both the pinned editor and the typed history adaptation through the same owned presentation seam. */
async function fixture(history: boolean) {
  const directory = await mkdtemp(join(tmpdir(), "paste-presentation-"));
  let resolve!: (text: string) => void;
  const result = new Promise<string>(done => { resolve = done; });
  let failRender = false;
  const editor = createPiShellEditor({
    keybindingProfile: "a1", agentDir: directory, cwd: directory,
    ...(history ? { persistentHistory: true, historyEditor: await loadHistoryEditor() } : {}),
    getColumns: () => 24, getRows: () => 24, requestRender() {}, onSubmit() {},
    beginClipboardPaste: () => ({ marker, result }),
    editorAtomicRanges: line => [...line.matchAll(/\[📷 [^\]]+\]/gu)].map(match => ({ start: match.index, end: match.index + match[0].length })),
    editorHiddenRanges: line => [...line.matchAll(/\[📷 screenshot-pending\]/gu)].map(match => ({ start: match.index, end: match.index + match[0].length })),
    decorateEditorRow: row => { if (failRender) throw new Error("render failed"); return row; },
    promptPresentation: { prefix: "❯ ", styleSuggestion: text => text, styleSuggestionCaret: text => text },
  });
  editor.setFocused?.(true);
  return {
    editor,
    complete: async (text: string) => { resolve(text); await result; await Promise.resolve(); },
    failRender: (enabled: boolean) => { failRender = enabled; },
    dispose: () => rm(directory, { recursive: true, force: true }),
  };
}

describe.each([false, true])("clipboard presentation with history=%s", history => {
  it("does not change wrapping or caret presentation during an unresolved text read", async () => {
    const test = await fixture(history);
    try {
      test.editor.setText("one line\n👩‍💻 before ");
      const before = test.editor.render(24);
      test.editor.handleInput?.("\x16");
      expect(test.editor.getText()).toContain(marker);
      expect(test.editor.render(24)).toEqual(before);
      test.editor.handleInput?.("after");
      const pending = test.editor.getText();
      expect(test.editor.render(24).join("\n")).not.toContain("screenshot-");
      expect(test.editor.getText()).toBe(pending);
      await test.complete("pasted ");
      expect(test.editor.getText()).toBe("one line\n👩‍💻 before pasted after");
      test.editor.handleInput?.("!");
      expect(test.editor.getText()).toBe("one line\n👩‍💻 before pasted after!");
    } finally { await test.dispose(); }
  });

  it("maps pointer positions after a hidden reservation back to the semantic draft", async () => {
    const test = await fixture(history);
    try {
      test.editor.setText("left ");
      test.editor.handleInput?.("\x16");
      test.editor.handleInput?.("right");
      const rows = test.editor.render(40).map(stripTerminalSequences);
      const row = rows.findIndex(line => line.includes("left right"));
      const column = rows[row]!.indexOf("right") + 1;
      test.editor.handlePointer?.({ kind: "press", button: 0, column, row: row + 1 });
      test.editor.handlePointer?.({ kind: "release", button: 0, column, row: row + 1 });
      test.editor.handleInput?.("X");
      await test.complete("pasted ");
      expect(test.editor.getText()).toBe("left pasted Xright");
    } finally { await test.dispose(); }
  });

  it("restores semantic text, selection, and caret even when projected rendering throws", async () => {
    const test = await fixture(history);
    try {
      test.editor.setText("original");
      test.editor.handleInput?.("\x01");
      test.editor.handleInput?.("\x16");
      const pending = test.editor.getText();
      test.failRender(true);
      expect(() => test.editor.render(24)).toThrow("render failed");
      expect(test.editor.getText()).toBe(pending);
      test.failRender(false);
      await test.complete("replacement");
      expect(test.editor.getText()).toBe("replacement");
      test.editor.handleInput?.("!");
      expect(test.editor.getText()).toBe("replacement!");
      test.editor.handleInput?.("\x1a");
      test.editor.handleInput?.("\x1a");
      expect(test.editor.getText()).toBe("original");
    } finally { await test.dispose(); }
  });
});
