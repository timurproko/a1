import { mkdtemp, rm } from "node:fs/promises";
import { promptInputPresentation } from "../../../support/prompt-input-presentation.js";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { createPiShellEditor, loadHistoryEditor, piTheme, type PiShellEditorOptions } from "../../../../src/integrations/pi/components/index.js";

import { promptRuleText } from "../../../../src/ui/components/index.js";
import { cellStyle } from "../../../support/ansi-cell-style.js";

describe("history editor component boundary", () => {
  it.each(["ordinary prompt", "!echo test"])("uses neutral status grey for history while preserving the input bars for %s", async text => {
    const root = await mkdtemp(join(tmpdir(), "history-label-color-"));
    try {
      const editor = createPiShellEditor({
        keybindingProfile: "a1", persistentHistory: true, historyEditor: await loadHistoryEditor(), agentDir: root, cwd: root,
        getColumns: () => 80, getRows: () => 24, requestRender() {}, onSubmit() {},
        promptPresentation: promptInputPresentation(),
      });
      editor.recall!.replace([text]);
      editor.handleInput?.("\x1b[A");
      for (const level of ["low", "high"] as const) {
        editor.setThinkingLevel(level);
        const rows = editor.render(80);
        const bar = promptRuleText;
        expect(rows[0]).toContain(piTheme().fg("dim", "1/1 "));
        expect(rows[0]).not.toContain("History");
        expect(stripTerminalSequences(rows[0]!).indexOf("1/1")).toBe(4);
        expect(rows[0]).toContain(bar("─── "));
        expect(rows[0]).not.toContain(bar("1/1 "));
        // Rationale: pinned 0.85.1 colors a rule as spans rather than one dash at a time; the owned frame closes the rule with its own span.
        expect(rows[rows.length - 1]).toContain(bar("──"));
        expect(stripTerminalSequences(rows[rows.length - 1]!)).toBe("─".repeat(80));
      }
      editor.handleInput?.("\x1b[B");
      expect(stripTerminalSequences(editor.render(80)[0]!)).toBe("─".repeat(80));
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("centers recalled overflow like the lower cue without changing the pinned comparison", async () => {
    const root = await mkdtemp(join(tmpdir(), "history-overflow-label-"));
    try {
      const options = {
        agentDir: root, cwd: root, getColumns: () => 80, getRows: () => 24,
        requestRender() {}, onSubmit() {},
      };
      const editor = createPiShellEditor({
        ...options, keybindingProfile: "a1", persistentHistory: true, historyEditor: await loadHistoryEditor(),
        promptPresentation: promptInputPresentation(),
      });
      editor.recall!.replace(["line\n".repeat(20).trim()]);
      editor.handleInput?.("\x1b[A");
      editor.render(80);
      for (let index = 0; index < 9; index++) editor.handleInput?.("\x1b[A");
      const rows = editor.render(80);
      const top = rows[0]!;
      const bottom = rows.at(-1)!;
      const topPlain = stripTerminalSequences(top);
      const bottomPlain = stripTerminalSequences(bottom);
      expect(top).toContain(piTheme().fg("dim", "1/1 "));
      expect(topPlain).not.toContain("·");
      expect(topPlain).toBe("─── 1/1 " + "─".repeat(25) + " ↑ 10 more " + "─".repeat(36));
      expect(bottomPlain).toBe("─".repeat(34) + " ↓ 3 more " + "─".repeat(36));
      expect(Math.abs(topPlain.indexOf(" ↑ 10 more ") * 2 + " ↑ 10 more ".length - 78)).toBeLessThanOrEqual(1);
      expect(bottomPlain.indexOf(" ↓ 3 more ") * 2 + " ↓ 3 more ".length).toBe(78);
      expect(cellStyle(top, "↑")).toEqual(cellStyle(bottom, "↓"));
      expect(cellStyle(top, "1")).not.toEqual(cellStyle(top, "↑"));
      const shifted = editor.render(24)[0]!;
      expect(shifted).toContain(piTheme().fg("dim", "1/1 "));
      expect(stripTerminalSequences(shifted)).toBe("─── 1/1  ↑ 10 more ─────");
      const historyOnly = editor.render(20)[0]!;
      expect(historyOnly).toContain(piTheme().fg("dim", "1/1 "));
      expect(stripTerminalSequences(historyOnly)).toBe("─── 1/1 " + "─".repeat(12));
      expect(historyOnly).not.toContain("↑");

      const comparison = createPiShellEditor({ ...options, keybindingProfile: "pi" });
      comparison.setText("line\n".repeat(20).trim());
      comparison.render(80);
      for (let index = 0; index < 9; index++) comparison.handleInput?.("\x1b[A");
      const comparisonRows = comparison.render(80).map(stripTerminalSequences);
      expect(comparisonRows[0]).toBe("─".repeat(34) + " ↑ 10 more " + "─".repeat(35));
      expect(comparisonRows.at(-1)).toBe("─".repeat(35) + " ↓ 3 more " + "─".repeat(35));
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
        promptPresentation: promptInputPresentation(),
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
      expect(owned.render(50)[0]).toContain(piTheme().fg("dim", "1/1 "));
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
