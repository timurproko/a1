import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { createPiShellEditor, loadHistoryEditor, piTheme, type PiShellEditorOptions } from "../../../../src/integrations/pi/components/index.js";

describe("history editor component boundary", () => {
  it.each(["ordinary prompt", "!echo test"])("uses neutral status grey for history while preserving the input bars for %s", async text => {
    const root = await mkdtemp(join(tmpdir(), "history-label-color-"));
    try {
      const editor = createPiShellEditor({
        keybindingProfile: "a1", persistentHistory: true, historyEditor: await loadHistoryEditor(), agentDir: root, cwd: root,
        getColumns: () => 80, getRows: () => 24, requestRender() {}, onSubmit() {},
        promptPresentation: { prefix: "❯ ", styleSuggestion: value => value, styleSuggestionCaret: value => value },
      });
      editor.recall!.replace([text]);
      editor.handleInput?.("\x1b[A");
      for (const level of ["low", "high"] as const) {
        editor.setThinkingLevel(level);
        const rows = editor.render(80);
        const bar = text.startsWith("!") ? piTheme().getBashModeBorderColor() : piTheme().getThinkingBorderColor(level);
        expect(rows[0]).toContain(piTheme().fg("dim", "History 1/1 "));
        expect(rows[0]).toContain(bar("─── "));
        expect(rows[0]).not.toContain(bar("History 1/1 "));
        expect(rows[rows.length - 1]).toContain(bar("─"));
      }
      editor.handleInput?.("\x1b[B");
      expect(editor.render(80)[0]).not.toContain("History");
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("preserves owned selection, paste, prefix, and public actions through typed collaborators", async () => {
    const root = await mkdtemp(join(tmpdir(), "history-editor-"));
    try {
      const actions: string[][] = [[], []];
      const options = (index: number): PiShellEditorOptions => ({
        keybindingProfile: "a1", agentDir: root, cwd: root,
        getColumns: () => 50, getRows: () => 24, requestRender() {},
        onSubmit: text => actions[index]!.push(`submit:${text}`), onCopyText: text => actions[index]!.push(`copy:${text}`),
        onInterrupt: () => actions[index]!.push("interrupt"),
        promptPresentation: { prefix: "❯ ", styleSuggestion: text => text, styleSuggestionCaret: text => text },
      });
      const pinned = createPiShellEditor(options(0));
      const owned = createPiShellEditor({ ...options(1), persistentHistory: true, historyEditor: await loadHistoryEditor() });
      expect(pinned.recall).toBeUndefined(); expect(owned.recall).toBeDefined();
      expect(pinned.historyReplacement).toBeUndefined();
      expect(owned.historyReplacement).toMatchObject({ id: "persistent-prompt-history", kind: "replacement", slot: "editor" });
      for (const editor of [pinned, owned]) { editor.setFocused?.(true); editor.render(50); }
      for (const input of ["alpha beta", "\x1b[D", "\x1b[1;2D", "\x03", "\x01", "\x18", "\x1a", "\x1b[200~pasted\ntext\x1b[201~", "\x1b[1;5D", "\r", "\x1b"]) {
        pinned.activateKeybindings(); pinned.handleInput?.(input);
        owned.activateKeybindings(); owned.handleInput?.(input);
        expect(owned.getText()).toBe(pinned.getText());
        expect(owned.render(50)).toEqual(pinned.render(50));
        expect(actions[1]).toEqual(actions[0]);
      }
      owned.recall!.replace(["saved"]); owned.setText(""); owned.handleInput?.("\x1b[A");
      expect(owned.getText()).toBe("saved");
      expect(owned.render(50)[0]).toContain("History 1/1");
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
