import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import { attachmentPromptChipHiddenRanges, canonicalPromptChipMatches } from "../../../../src/contracts/owned-ui/index.js";
import { createPiShellEditor, loadHistoryEditor } from "../../../../src/integrations/pi/components/index.js";
import { promptInputPresentation } from "../../../support/prompt-input-presentation.js";

async function fixture(history: boolean) {
  const directory = await mkdtemp(join(tmpdir(), "attachment-presentation-"));
  const editor = createPiShellEditor({
    keybindingProfile: "a1", agentDir: directory, cwd: directory,
    ...(history ? { persistentHistory: true, historyEditor: await loadHistoryEditor() } : {}),
    getColumns: () => 80, getRows: () => 24, requestRender() {}, onSubmit() {},
    editorAtomicRanges: line => canonicalPromptChipMatches(line),
    editorHiddenRanges: attachmentPromptChipHiddenRanges,
    editorDimRanges: line => canonicalPromptChipMatches(line).filter(match => match.text.includes("#def456")),
    expandCopiedEditorText: text => `resolved:${text}`,
    promptPresentation: promptInputPresentation(),
  });
  editor.setFocused?.(true);
  return { editor, dispose: () => rm(directory, { recursive: true, force: true }) };
}

const first = "[📄 C:\\one\\notes.txt]", second = "[📄 C:\\two\\notes.txt]";

describe.each([false, true])("attachment presentation with history=%s", history => {
  it("lays out compact labels atomically without changing semantic text or undo", async () => {
    const test = await fixture(history);
    try {
      const source = `before${first}${second}after`;
      test.editor.setText(source);
      const rows = test.editor.render(24);
      const plain = rows.map(stripTerminalSequences).join("\n");
      expect(plain.match(/\[📄notes\.txt\]/gu)).toHaveLength(2);
      expect(plain).not.toContain("C:");
      expect(rows.every(row => visibleWidth(row) <= 24)).toBe(true);
      expect(test.editor.getText()).toBe(source);
      test.editor.handleInput?.("!");
      expect(test.editor.getText()).toBe(`${source}!`);
      test.editor.handleInput?.("\x1a");
      expect(test.editor.getText()).toBe(source);
    } finally { await test.dispose(); }
  });

  it("maps clicks on duplicate labels to their own full identities and deletes atomically", async () => {
    const test = await fixture(history);
    try {
      test.editor.setText(`left ${first}${second} right`);
      const rows = test.editor.render(80).map(stripTerminalSequences);
      const row = rows.findIndex(line => line.includes("[📄notes.txt][📄notes.txt]"));
      const label = rows[row]!.lastIndexOf("notes.txt");
      const column = visibleWidth(rows[row]!.slice(0, label)) + 2;
      test.editor.handlePointer?.({ kind: "press", button: 0, column, row: row + 1 });
      test.editor.handlePointer?.({ kind: "release", button: 0, column, row: row + 1 });
      expect(test.editor.selectedText?.()).toBe(`resolved:${second}`);
      test.editor.handleInput?.("\x7f");
      expect(test.editor.getText()).toBe(`left ${first} right`);
      test.editor.handleInput?.("\x1a");
      expect(test.editor.getText()).toBe(`left ${first}${second} right`);
    } finally { await test.dispose(); }
  });

  it("maps typing after hidden metadata back to the source boundary", async () => {
    const test = await fixture(history);
    try {
      test.editor.setText(`${first} right`);
      const rows = test.editor.render(80).map(stripTerminalSequences);
      const row = rows.findIndex(line => line.includes("right"));
      const column = visibleWidth(rows[row]!.slice(0, rows[row]!.indexOf("right"))) + 1;
      test.editor.handlePointer?.({ kind: "press", button: 0, column, row: row + 1 });
      test.editor.handlePointer?.({ kind: "release", button: 0, column, row: row + 1 });
      test.editor.handleInput?.("X");
      expect(test.editor.getText()).toBe(`${first} Xright`);
    } finally { await test.dispose(); }
  });

  it("dims only the rejected occurrence even when both compact image labels look identical", async () => {
    const test = await fixture(history);
    try {
      const accepted = "[🖼️ same.png #abc123]", rejected = "[🖼️ same.png #def456]";
      test.editor.setText(`${accepted}${rejected}`);
      test.editor.setFocused?.(false);
      const rows = test.editor.render(80), text = rows.join("\n");
      expect(stripTerminalSequences(text)).toContain("[🖼️same.png][🖼️same.png]");
      const dimStart = text.indexOf("\x1b[2m"), dimEnd = text.indexOf("\x1b[22m", dimStart);
      expect(dimStart).toBeGreaterThan(0);
      expect(dimEnd).toBeGreaterThan(dimStart);
      expect(stripTerminalSequences(text.slice(0, dimStart))).toContain("[🖼️same.png]");
      expect(stripTerminalSequences(text.slice(dimStart, dimEnd))).toBe("[🖼️same.png]");
      expect(test.editor.getText()).toBe(`${accepted}${rejected}`);
    } finally { await test.dispose(); }
  });
});
