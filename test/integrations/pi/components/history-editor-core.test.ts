import { beforeEach, describe, expect, it } from "vitest";
import { Editor, KeybindingsManager, setKeybindings, TUI_KEYBINDINGS, stripTerminalSequences, visibleWidth, type AutocompleteProvider } from "#pi-tui";
import { HistoryEditorCore } from "../../../../src/integrations/pi/components/upstream/history/editor-core.js";
import { createTuiFacade } from "../../../../src/integrations/pi/components/shell-shared-facade.js";

const theme = {
  borderColor: (s: string) => s,
  selectList: { selectedPrefix: (s: string) => s, selectedText: (s: string) => s, description: (s: string) => s, scrollInfo: (s: string) => s, noMatch: (s: string) => s },
};
const older = "\x10";
const newer = "\x0e";
const undo = "\x1a";
const paste = (text: string) => `\x1b[200~${text}\x1b[201~`;
const tui = () => createTuiFacade({ getColumns: () => 80, getRows: () => 24, requestRender() {} });
const turn = async () => { await new Promise(resolve => setTimeout(resolve, 30)); };

beforeEach(() => {
  setKeybindings(new KeybindingsManager(TUI_KEYBINDINGS, {
    "tui.editor.historyPrevious": "ctrl+p", "tui.editor.historyNext": "ctrl+n", "tui.editor.undo": "ctrl+z",
  }));
});

function pair() {
  const pinned = new Editor(tui(), theme);
  const owned = new HistoryEditorCore(tui(), theme);
  pinned.focused = owned.focused = true;
  return { pinned, owned };
}
function observe(editor: Editor | HistoryEditorCore, width: number) {
  return { rows: editor.render(width), text: editor.getText(), expanded: editor.getExpandedText(), cursor: editor.getCursor(), autocomplete: editor.isShowingAutocomplete() };
}

describe("source-derived history editor baseline", () => {
  it.each([12, 40, 80])("matches independently executed pinned input at width %i", async width => {
    const { pinned, owned } = pair();
    const submitted: string[][] = [[], []];
    pinned.onSubmit = text => submitted[0]!.push(text);
    owned.onSubmit = text => submitted[1]!.push(text);
    for (const editor of [pinned, owned]) {
      editor.addToHistory("older\nsecond line"); editor.addToHistory("newest"); editor.render(width);
    }
    const inputs = ["hello", " ", "world", "\x1b[D", "\x1b[1;5D", "\x7f", undo,
      paste("line\n".repeat(12)), "\x1b[D", older, older, newer, newer, undo,
      "\x01", "\x0b", "\x19", "\x1b[27;2;65~", "\x1b[97;2u", "\r",
      paste("路径 👩‍💻 é\nsecond"), "\x1b[A", "\x1b[B", "\x1b[3~", undo];
    for (const input of inputs) {
      pinned.handleInput(input); owned.handleInput(input); await turn();
      expect(observe(owned, width)).toEqual(observe(pinned, width));
      expect(submitted[1]).toEqual(submitted[0]);
    }
  });

  it("matches asynchronous autocomplete and submission without private access", async () => {
    const { pinned, owned } = pair();
    const provider: AutocompleteProvider = {
      getSuggestions: async () => ({ prefix: "/te", items: [{ value: "/test", label: "test" }, { value: "/text", label: "text" }] }),
      applyCompletion: () => ({ lines: ["/test "], cursorLine: 0, cursorCol: 6 }),
    };
    for (const editor of [pinned, owned]) editor.setAutocompleteProvider(provider);
    for (const input of ["/", "t", "e", "\x1b[B", "\t", undo]) {
      pinned.handleInput(input); owned.handleInput(input); await turn();
      expect(observe(owned, 40)).toEqual(observe(pinned, 40));
    }
  });
});

describe("typed persistent recall transitions", () => {
  function create() {
    const editor = new HistoryEditorCore(tui(), theme);
    editor.configurePersistentHistory(true);
    editor.replaceHistoryEntries(["newest", "middle\nsecond line", "oldest"]);
    editor.render(80);
    return editor;
  }

  it("keeps history label style independent, live, and clipped without altering row geometry", () => {
    let neutral = "dim";
    const editor = new HistoryEditorCore(tui(), theme, { persistentHistory: true, styleHistoryLabel: text => `<${neutral}>${text}</${neutral}>` });
    editor.replaceHistoryEntries(["line\n".repeat(12).trim()]);
    editor.handleInput(older);
    expect(editor.render(80)[0]).toContain("<dim>History 1/1 · ↑ 5 more </dim>");
    neutral = "updated";
    editor.invalidate();
    expect(editor.render(80)[0]).toContain("<updated>History 1/1 · ↑ 5 more </updated>");

    const plain = create();
    plain.handleInput(older);
    for (const width of [1, 4, 8, 12, 20, 80]) {
      const row = plain.render(width)[0]!;
      expect(visibleWidth(row)).toBeLessThanOrEqual(width);
      expect(stripTerminalSequences(row)).not.toContain("undefined");
    }
  });

  it("uses v2 directional caret placement and newest=total numbering", () => {
    const editor = create();
    editor.handleInput(older);
    expect(editor.getCursor()).toEqual({ line: 0, col: 6 });
    expect(editor.render(80)[0]).toContain("History 3/3");
    editor.handleInput(older);
    expect(editor.getCursor()).toEqual({ line: 1, col: 11 });
    editor.handleInput(older);
    expect(editor.render(80)[0]).toContain("History 1/3");
    editor.handleInput(older);
    expect(editor.getCursor()).toEqual({ line: 0, col: 6 });
    editor.handleInput(newer);
    expect(editor.getCursor()).toEqual({ line: 0, col: 0 });
  });

  it("coalesces snapshots without disturbing draft, browse total, or undo grouping", () => {
    const editor = create();
    editor.setText("draft"); editor.handleInput("\x1b[D");
    editor.handleInput(older); editor.handleInput(older);
    editor.replaceHistoryEntries(["remote", "oldest"]);
    editor.replaceHistoryEntries(["latest", "oldest"]);
    expect(editor.getHistoryPosition()).toEqual({ index: 1, total: 3 });
    expect(editor.getText()).toBe("middle\nsecond line");
    editor.handleInput(newer); editor.handleInput(newer);
    expect(editor.getText()).toBe("draft");
    expect(editor.getCursor()).toEqual({ line: 0, col: 4 });
    expect(editor.render(80)[0]).not.toContain("History");
    editor.handleInput(older);
    expect(editor.getText()).toBe("latest");
    editor.handleInput(older);
    editor.handleInput(undo);
    expect(editor.getText()).toBe("draft");
  });

  it("retains live draft pastes while recalling literal marker-looking text", () => {
    const editor = create();
    const content = "long paste ".repeat(110);
    editor.handleInput(paste(content)); editor.handleInput("\x1b[D");
    const draft = editor.getText(); const cursor = editor.getCursor();
    editor.replaceHistoryEntries(["literal [paste #1 1210 chars]"]);
    editor.handleInput(older);
    expect(editor.getExpandedText()).toBe("literal [paste #1 1210 chars]");
    editor.handleInput(newer);
    expect(editor.getText()).toBe(draft);
    expect(editor.getCursor()).toEqual(cursor);
    expect(editor.getExpandedText()).toBe(content);
  });

  it("installs empty or deduplicated history without replacing input", () => {
    const editor = create(); editor.setText("draft");
    editor.replaceHistoryEntries([" repeat ", "repeat", "", "other"]);
    expect(editor.getHistoryPosition().total).toBe(2);
    expect(editor.getText()).toBe("draft");
    editor.replaceHistoryEntries([]);
    editor.handleInput(older);
    expect(editor.getText()).toBe("draft");
    expect(editor.getHistoryPosition()).toEqual({ index: -1, total: 0 });
  });
});
