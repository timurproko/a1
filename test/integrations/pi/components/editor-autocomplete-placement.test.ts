import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CURSOR_MARKER, stripTerminalSequences, visibleWidth, type AutocompleteProvider } from "#pi-tui";
import { describe, expect, it } from "vitest";
import { createPiShellEditor, loadHistoryEditor, type PiShellEditorOptions } from "../../../../src/integrations/pi/components/index.js";

const settle = async () => { for (let i = 0; i < 3; i++) await new Promise<void>(resolve => setImmediate(resolve)); };
const items = Array.from({ length: 12 }, (_, index) => ({ value: `/choice-${index}`, label: `choice-${index}`, description: `Description ${index}` }));
const provider: AutocompleteProvider = {
  triggerCharacters: ["@"],
  getSuggestions: async () => ({ prefix: "@", items }),
  applyCompletion: (lines, cursorLine, _cursorCol, item) => ({ lines: [...lines.slice(0, cursorLine), item.value], cursorLine, cursorCol: item.value.length }),
};

async function fixture(history: boolean, extra: Partial<PiShellEditorOptions> = {}, customKeys = false) {
  const root = await mkdtemp(join(tmpdir(), "autocomplete-placement-"));
  if (customKeys) await writeFile(join(root, "keybindings.json"), JSON.stringify({ "tui.select.down": "ctrl+j", "tui.select.up": "ctrl+k" }));
  const submitted: string[] = [];
  const copied: string[] = [];
  let height = 24;
  const editor = createPiShellEditor({
    keybindingProfile: "a1", persistentHistory: history,
    ...(history ? { historyEditor: await loadHistoryEditor() } : {}),
    agentDir: root, cwd: root, getColumns: () => 80, getRows: () => height,
    requestRender() {}, onSubmit: text => submitted.push(text), onCopyText: text => copied.push(text),
    paintEditorSelection: (row, from, to) => `${row.slice(0, from)}\u001b[44m${row.slice(from, to)}\u001b[49m${row.slice(to)}`,
    promptPresentation: { prefix: "❯ ", styleSuggestion: text => text, styleSuggestionCaret: text => text },
    ...extra,
  });
  editor.setFocused?.(true);
  return { editor, root, submitted, copied, height: (rows: number) => { height = rows; },
    dispose: async () => { editor.setAutocompleteCommands([]); await rm(root, { recursive: true, force: true }); } };
}

function parts(editor: ReturnType<typeof createPiShellEditor>, width: number) {
  const rows = editor.render(width);
  const body = editor.bodyGeometry!();
  expect(body.rowOffset).toBeGreaterThanOrEqual(0);
  expect(rows.length).toBe(body.rowOffset + body.rowCount);
  return { rows, menu: rows.slice(0, body.rowOffset), body: rows.slice(body.rowOffset), geometry: body };
}

describe.each([false, true])("above-prompt autocomplete (history=%s)", history => {
  it("keeps the bottom-aligned input steady through menu changes", async () => {
    const { editor, dispose } = await fixture(history);
    try {
      const coordinates = () => {
        const rows = [...editor.render(80), "footer"];
        const start = 24 - rows.length;
        const prompt = rows.findIndex(row => stripTerminalSequences(row).startsWith("❯ "));
        return { upper: start + prompt - 1, prompt: start + prompt,
          caret: start + rows.findIndex(row => row.includes(CURSOR_MARKER)), lower: start + prompt + 1,
          footer: start + rows.indexOf("footer") };
      };
      const closed = coordinates();
      editor.handleInput?.("/");
      await settle();
      expect(editor.render(80).join("\n")).toContain("settings");
      expect(coordinates()).toEqual(closed);
      editor.handleInput?.("mo");
      await settle();
      expect(coordinates()).toEqual(closed);
      editor.handleInput?.("\u001b");
      expect(coordinates()).toEqual(closed);
      expect(editor.render(80)).toHaveLength(3);
    } finally { await dispose(); }
  });

  it.each([0, 2])("keeps wrapped, Unicode, atomic, and scrolled body rows intact with padding %i", async padding => {
    const { editor, height, dispose } = await fixture(history, {
      editorAtomicRanges: line => [...line.matchAll(/\[chip[^\]]*\]/gu)].map(match => ({ start: match.index, end: match.index + match[0].length })),
    });
    try {
      editor.setPaddingX(padding);
      for (const draft of ["", "one two three four five six seven eight ", "日本語 é 👩‍💻 ", "left [chip a long atomic label] right ", "row\n".repeat(14)]) {
        editor.addAutocompleteProvider(() => provider);
        editor.setText(draft);
        editor.handleInput?.("@");
        await expect.poll(() => parts(editor, 40).menu.length).toBeGreaterThan(0);
        const frames = [];
        for (const [width, rows] of [[12, 10], [24, 24], [80, 54]]) {
          height(rows!);
          const frame = parts(editor, width!);
          frames.push({ width: width!, height: rows!, body: frame.body });
          const plain = frame.body.map(stripTerminalSequences);
          expect(plain[0]).toMatch(/^─/);
          expect(plain.at(-1)).toMatch(/^─/);
          expect(plain[1]).toMatch(/^❯ /);
          expect(frame.body.filter(row => row.includes(CURSOR_MARKER))).toHaveLength(1);
          for (const row of frame.rows) expect(visibleWidth(row)).toBeLessThanOrEqual(width!);
        }
        editor.handleInput?.("\u001b");
        for (const frame of frames) {
          height(frame.height);
          expect(parts(editor, frame.width).body).toEqual(frame.body);
          expect(editor.bodyGeometry!().rowOffset).toBe(0);
        }
      }
    } finally { await dispose(); }
  });

  it("moves argument, path, resource, and extension lists without changing sizing or navigation", async () => {
    const { editor, root, height, dispose } = await fixture(history);
    const reference = await fixture(false, { keybindingProfile: "pi" });
    try {
      await writeFile(join(root, "file-one.txt"), "one");
      await writeFile(join(root, "file-two.txt"), "two");
      const commands = [{ name: "deploy", argumentOptions: [{ id: "dev", label: "dev" }, { id: "prod", label: "prod" }] },
        { name: "skill:review", description: "Review" }, { name: "skill:report", description: "Report" }];
      for (const input of ["/deploy ", "./file-", "/skill:r", "/"]) {
        editor.setAutocompleteCommands(commands);
        editor.setText("");
        for (const character of input) editor.handleInput?.(character);
        if (input.startsWith(".")) editor.handleInput?.("\t");
        await expect.poll(() => parts(editor, 80).menu.length, { message: input }).toBeGreaterThan(0);
        expect(parts(editor, 80).body).toHaveLength(3);
        editor.handleInput?.("\u001b");
      }
      for (const limit of [3, 5, 12, 20]) {
        for (const target of [editor, reference.editor]) {
          target.setAutocompleteMaxVisible(limit);
          target.addAutocompleteProvider(() => provider);
          target.setText(""); target.handleInput?.("@");
        }
        await expect.poll(() => parts(editor, 80).menu.length).toBeGreaterThan(0);
        await settle();
        for (let selected = 0; selected < 14; selected++) {
          for (const width of [12, 40, 80]) {
            height(8);
            const actual = parts(editor, width);
            const expected = reference.editor.render(width - 2).slice(3).map(row => `  ${row}`);
            expect(actual.menu).toEqual(expected);
          }
          for (const target of [editor, reference.editor]) {
            target.activateKeybindings(); target.handleInput?.("\u001b[B");
          }
        }
        // Compatibility: keep the existing active-list setting semantics as well as future-list sizing.
        editor.setAutocompleteMaxVisible(8); reference.editor.setAutocompleteMaxVisible(8);
        expect(parts(editor, 80).menu).toEqual(reference.editor.render(78).slice(3).map(row => `  ${row}`));
        for (const target of [editor, reference.editor]) target.handleInput?.("\t");
        expect(editor.getText()).toBe(reference.editor.getText());
      }
    } finally { await dispose(); await reference.dispose(); }
  });

  it("keeps body-relative pointer selection, copy, custom keys, Tab, and Enter intact", async () => {
    const { editor, copied, submitted, dispose } = await fixture(history, {}, true);
    try {
      editor.addAutocompleteProvider(() => provider);
      editor.setText("abc "); editor.handleInput?.("@");
      await expect.poll(() => parts(editor, 80).menu.length).toBeGreaterThan(0);
      editor.handlePointer({ kind: "press", button: 0, column: 3, row: 2 });
      editor.handlePointer({ kind: "motion", button: 0, column: 6, row: 2 });
      editor.handlePointer({ kind: "release", button: 0, column: 6, row: 2 });
      const selected = parts(editor, 80);
      expect(selected.body[1]).toContain("\u001b[44m");
      expect(selected.menu.join("\n")).not.toContain("\u001b[44m");
      editor.handleInput?.("\u0003");
      expect(copied).toEqual(["abc"]);
      editor.setText(""); editor.addAutocompleteProvider(() => provider);
      editor.handleInput?.("@");
      await expect.poll(() => parts(editor, 80).menu.length).toBeGreaterThan(0);
      editor.handleInput?.("\u000a");
      expect(stripTerminalSequences(parts(editor, 80).menu.join("\n"))).toContain("→ choice-1");
      editor.handleInput?.("\t");
      expect(editor.getText()).toBe("/choice-1");
      expect(submitted).toEqual([]);
      editor.handleInput?.("\r");
      expect(submitted).toEqual(["/choice-1"]);
      editor.setText(""); editor.addAutocompleteProvider(() => provider); editor.handleInput?.("@");
      await expect.poll(() => parts(editor, 80).menu.length).toBeGreaterThan(0);
      editor.handleInput?.("\r"); // Compatibility: non-slash completion confirms without submitting.
      expect(editor.getText()).toBe("/choice-0");
      expect(submitted).toHaveLength(1);
    } finally { await dispose(); }
  });

  it("does not revive a dismissed asynchronous menu and paints the current result above input", async () => {
    const { editor, dispose } = await fixture(history);
    try {
      let deliver!: (value: { prefix: string; items: typeof items }) => void;
      let requests = 0;
      editor.addAutocompleteProvider(() => ({ ...provider,
        getSuggestions: async () => ++requests === 1 ? { prefix: "@", items }
          : new Promise(resolve => { deliver = resolve; }),
      }));
      editor.handleInput?.("@");
      await expect.poll(() => parts(editor, 80).menu.length).toBeGreaterThan(0);
      editor.handleInput?.("a");
      await expect.poll(() => typeof deliver).toBe("function");
      editor.handleInput?.("\u001b");
      deliver({ prefix: "@", items }); await settle();
      expect(parts(editor, 80).menu).toHaveLength(0);
      editor.addAutocompleteProvider(() => provider);
      editor.setText(""); editor.handleInput?.("@");
      await expect.poll(() => parts(editor, 80).menu.length).toBeGreaterThan(0);
      expect(parts(editor, 80).body[1]).toContain("@");
    } finally { await dispose(); }
  });
});
