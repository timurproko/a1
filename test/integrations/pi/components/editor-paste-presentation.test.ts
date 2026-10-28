import { mkdtemp, rm } from "node:fs/promises";
import { promptInputPresentation } from "../../../support/prompt-input-presentation.js";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import { createPiShellEditor, loadHistoryEditor } from "../../../../src/integrations/pi/components/index.js";

const marker = "[📷 screenshot-pending]";

/** Exercise both the pinned editor and the typed history adaptation through the same owned presentation seam. */
async function fixture(history: boolean) {
  const directory = await mkdtemp(join(tmpdir(), "paste-presentation-"));
  let resolve!: (text: string) => void;
  const result = new Promise<string>(done => { resolve = done; });
  let failRender = false;
  let current = true;
  const editor = createPiShellEditor({
    keybindingProfile: "a1", agentDir: directory, cwd: directory,
    ...(history ? { persistentHistory: true, historyEditor: await loadHistoryEditor() } : {}),
    getColumns: () => 24, getRows: () => 24, requestRender() {}, onSubmit() {},
    beginClipboardPaste: () => ({ marker, result, isCurrent: () => current }),
    editorAtomicRanges: line => [...line.matchAll(/\[📷 [^\]]+\]/gu)].map(match => ({ start: match.index, end: match.index + match[0].length })),
    editorHiddenRanges: line => [...line.matchAll(/\[📷 screenshot-pending\]/gu)].map(match => ({ start: match.index, end: match.index + match[0].length })),
    decorateEditorRow: row => { if (failRender) throw new Error("render failed"); return row; },
    promptPresentation: promptInputPresentation(),
  });
  editor.setFocused?.(true);
  return {
    editor,
    complete: async (text: string) => { resolve(text); await result; await Promise.resolve(); },
    failRender: (enabled: boolean) => { failRender = enabled; },
    cancel: () => { current = false; },
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

  it("replaces a pointer-selected word without an intermediate blank or lost highlight", async () => {
    const test = await fixture(history);
    try {
      test.editor.setText("goiq middle goiq");
      const rows = test.editor.render(24).map(stripTerminalSequences);
      const row = rows.findIndex(line => line.includes("middle"));
      const column = rows[row]!.indexOf("middle") + 2;
      for (let click = 0; click < 2; click += 1) {
        test.editor.handlePointer?.({ kind: "press", button: 0, column, row: row + 1 });
        test.editor.handlePointer?.({ kind: "release", button: 0, column, row: row + 1 });
      }
      expect(test.editor.selectedText?.()).toBe("middle");
      const selected = test.editor.render(24);
      test.editor.handleInput?.("\x16");
      expect(test.editor.getText()).toContain(marker);
      expect(test.editor.render(24)).toEqual(selected);
      await test.complete("new");
      expect(test.editor.getText()).toBe("goiq new goiq");
      expect(test.editor.render(24).map(stripTerminalSequences).join("\n")).toContain("goiq new goiq");
    } finally { await test.dispose(); }
  });

  it("keeps a multiline selection painted until the replacement commits or restores", async () => {
    const test = await fixture(history);
    try {
      test.editor.setText("first line\nsecond line");
      test.editor.handleInput?.("\x01");
      const selected = test.editor.render(24);
      test.editor.handleInput?.("\x16");
      const reserved = test.editor.getText();
      expect(reserved).toContain(marker);
      expect(test.editor.render(24)).toEqual(selected);
      expect(test.editor.getText()).toBe(reserved);
      test.failRender(true);
      expect(() => test.editor.render(24)).toThrow("render failed");
      expect(test.editor.getText()).toBe(reserved);
      test.failRender(false);
      expect(test.editor.render(24)).toEqual(selected);
      await test.complete("replacement");
      expect(test.editor.getText()).toBe("replacement");
      expect(test.editor.render(24)).not.toEqual(selected);
      test.editor.handleInput?.("\x1a");
      expect(test.editor.getText()).toBe("first line\nsecond line");
    } finally { await test.dispose(); }
  });

  it("restores selected text when a pending paste becomes stale", async () => {
    const test = await fixture(history);
    try {
      test.editor.setText("before");
      test.editor.handleInput?.("\x01");
      const selected = test.editor.render(24);
      test.editor.handleInput?.("\x16");
      expect(test.editor.render(24)).toEqual(selected);
      test.cancel();
      await test.complete("discarded");
      expect(test.editor.getText()).toBe("before");
    } finally { await test.dispose(); }
  });

  it("does not replay a pending selection over subsequent input or a failed paste", async () => {
    const test = await fixture(history);
    try {
      test.editor.setText("before");
      test.editor.handleInput?.("\x01");
      const selected = test.editor.render(24);
      test.editor.handleInput?.("\x16");
      expect(test.editor.render(24)).toEqual(selected);
      test.editor.handleInput?.("!");
      expect(test.editor.render(24)).not.toEqual(selected);
      await test.complete("");
      expect(test.editor.getText()).toBe("before!");
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
