import { Text, stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { describe, expect, it, vi } from "vitest";
import {
  createPiExtensionUiBridge,
  type PiExtensionUiBridgeHost,
  type PiShellComponentPort,
} from "../../../../src/integrations/pi/components/index.js";
import type { ExtensionUIContext } from "@earendil-works/pi-coding-agent";
import { firstVisibleTextColumn } from "../../../support/dialog-alignment.js";
import { cellBackgroundAt, cellStyle } from "../../../support/ansi-cell-style.js";
import { paintTextSelection } from "../../../../src/ui/components/index.js";

function fixture(clipboard: Pick<PiExtensionUiBridgeHost, "onCopyText" | "readClipboardContent"> = {}) {
  let inputSurface: PiShellComponentPort | null = null;
  const widgets = new Map<string, PiShellComponentPort>();
  const statuses = new Map<string, string>();
  const notifications: string[] = [];
  const blockedStatuses: Array<{ readonly kind: "permission" | "question" | "auth"; readonly message: string } | undefined> = [];
  const inputListeners = new Set<(data: string) => { readonly consume?: boolean; readonly data?: string } | undefined>();
  let editorText = "";
  let expanded = false;
  const host: PiExtensionUiBridgeHost = {
    runtime: { getColumns: () => 80, getRows: () => 24, requestRender: vi.fn() },
    ...clipboard,
    setInputSurface: component => { inputSurface = component; },
    setProgramStatusBlocked: status => blockedStatuses.push(status),
    showOverlay: component => {
      inputSurface = component;
      let hidden = false;
      return {
        hide() { hidden = true; inputSurface = null; component.dispose?.(); },
        setHidden(value) { hidden = value; }, isHidden: () => hidden,
        focus() {}, unfocus() {}, isFocused: () => !hidden, getBounds: () => undefined,
      };
    },
    listenInput(handler) { inputListeners.add(handler); return () => inputListeners.delete(handler); },
    replaceWidget(key, component) { if (component === null) widgets.delete(key); else widgets.set(key, component); },
    replaceHeader: vi.fn(), replaceFooter: vi.fn(),
    setStatus(key, text) { if (text === undefined) statuses.delete(key); else statuses.set(key, text); },
    setWorking: vi.fn(),
    notify(message, type) { notifications.push(`${type}:${message}`); },
    setTitle: vi.fn(),
    getEditorText: () => editorText,
    setEditorText: text => { editorText = text; },
    pasteToEditor: text => { editorText += text; },
    addAutocompleteProvider: vi.fn(),
    setCustomEditor: vi.fn(),
    getFooterData: () => ({
      getGitBranch: () => "develop", getExtensionStatuses: () => statuses,
      getAvailableProviderCount: () => 1, onBranchChange: () => () => {},
    }),
    getToolsExpanded: () => expanded,
    setToolsExpanded: value => { expanded = value; },
  };
  const bridge = createPiExtensionUiBridge(host);
  return { bridge, host, widgets, statuses, notifications, blockedStatuses, inputListeners, get inputSurface() { return inputSurface; } };
}

describe("pinned extension UI bridge", () => {
  it("windows long option lists around the selection without changing the selected result", async () => {
    const value = fixture();
    const options = Array.from({ length: 25 }, (_, index) => `option-${String(index).padStart(2, "0")}`);
    const selection = value.bridge.context.select("Choose", options);
    const frame = () => stripTerminalSequences(value.inputSurface!.render(60).join("\n"));
    expect(frame()).toContain("(1/25)");
    expect(frame()).toContain("option-09");
    expect(frame()).not.toContain("option-10");
    for (let index = 0; index < 24; index++) value.inputSurface!.handleInput?.("\x1b[B");
    expect(frame()).toContain("(25/25)");
    expect(frame()).toContain("option-15");
    expect(frame()).not.toContain("option-14");
    value.inputSurface!.handleInput?.("\r");
    await expect(selection).resolves.toBe("option-24");
    value.bridge.dispose();
  });

  it("opens, resolves, cancels, and restores selectors and text inputs", async () => {
    const value = fixture();
    const selection = value.bridge.context.select("Choose", ["alpha", "beta"]);
    const selectorRows = value.inputSurface!.render(60);
    const selectorFrame = stripTerminalSequences(selectorRows.join("\n"));
    expect(stripTerminalSequences(selectorRows[1]!)).toContain("Choose");
    expect(firstVisibleTextColumn(selectorRows.find(row => stripTerminalSequences(row).includes("Choose"))!))
      .toBe(firstVisibleTextColumn(selectorRows.find(row => stripTerminalSequences(row).includes("↑↓ navigate"))!));
    expect(selectorFrame).toContain("alpha");
    expect(selectorFrame).toContain("↑↓ navigate  Enter select  Esc close");
    expect(selectorFrame).not.toContain("Ctrl+C");
    expect(selectorFrame).not.toMatch(/[·•]/u);
    expect(value.blockedStatuses.at(-1)).toEqual({ kind: "question", message: "Choose" });
    value.inputSurface!.handleInput?.("\x1b[B");
    value.inputSurface!.handleInput?.("\r");
    await expect(selection).resolves.toBe("beta");
    expect(value.inputSurface).toBeNull();
    expect(value.blockedStatuses.at(-1)).toBeUndefined();

    const confirmation = value.bridge.context.confirm("Permission", "Allow this operation?");
    expect(value.blockedStatuses.at(-1)).toEqual({ kind: "permission", message: "Permission" });
    value.inputSurface!.handleInput?.("\r");
    await expect(confirmation).resolves.toBe(true);

    const input = value.bridge.context.input("Name", "placeholder");
    const inputRows = value.inputSurface!.render(60);
    const inputFrame = stripTerminalSequences(inputRows.join("\n"));
    expect(stripTerminalSequences(inputRows[1]!)).toContain("Name");
    expect(firstVisibleTextColumn(inputRows.find(row => stripTerminalSequences(row).includes("Name"))!))
      .toBe(firstVisibleTextColumn(inputRows.find(row => stripTerminalSequences(row).includes("Enter submit"))!));
    expect(inputFrame).toContain("Enter submit  Esc close");
    expect(inputFrame).not.toContain("Ctrl+C");
    expect(inputFrame).not.toMatch(/[·•]/u);
    value.inputSurface!.handleInput?.("Ada");
    value.inputSurface!.handleInput?.("\r");
    await expect(input).resolves.toBe("Ada");

    const editor = value.bridge.context.editor("Notes", "draft");
    const editorRows = value.inputSurface!.render(100);
    const editorFrame = stripTerminalSequences(editorRows.join("\n"));
    expect(stripTerminalSequences(editorRows[1]!)).toContain("Notes");
    expect(firstVisibleTextColumn(editorRows.find(row => stripTerminalSequences(row).includes("Notes"))!))
      .toBe(firstVisibleTextColumn(editorRows.find(row => stripTerminalSequences(row).includes("Enter submit"))!));
    expect(editorFrame).toContain("Enter submit  Shift+Enter/Ctrl+J newline  Ctrl+G external editor  Esc close");
    expect(editorFrame).not.toContain("Ctrl+C");
    expect(editorFrame).not.toMatch(/[·•]/u);
    value.inputSurface!.handleInput?.("\u0003");
    await expect(editor).resolves.toBeUndefined();
    expect(value.inputSurface).toBeNull();

    const controller = new AbortController();
    const cancelled = value.bridge.context.select("Abort", ["one"], { signal: controller.signal });
    controller.abort();
    await expect(cancelled).resolves.toBeUndefined();
    expect(value.inputSurface).toBeNull();

    const switched = value.bridge.context.input("Session switch", "cancel me");
    expect(value.inputSurface).not.toBeNull();
    value.bridge.reset();
    await expect(switched).resolves.toBeUndefined();
    expect(value.inputSurface).toBeNull();
    value.bridge.dispose();
  });

  it("prefills internal inputs without changing public extension inputs", async () => {
    const value = fixture();
    const input = value.bridge.input("Name", "", { initialValue: "Project" });
    expect(stripTerminalSequences(value.inputSurface!.render(60).join("\n"))).toContain("> Project");
    value.inputSurface!.handleInput?.(" Alpha");
    value.inputSurface!.handleInput?.("\r");
    await expect(input).resolves.toBe("Project Alpha");
    const extensionInput = value.bridge.context.input("Name", "");
    expect(stripTerminalSequences(value.inputSurface!.render(60).join("\n"))).not.toContain("Project");
    value.inputSurface!.handleInput?.("\x1b");
    await expect(extensionInput).resolves.toBeUndefined();
    value.bridge.dispose();
  });

  it("selects, copies, cuts, pastes, replaces, and undoes in the opt-in name field", async () => {
    const onCopyText = vi.fn();
    const value = fixture({ onCopyText, readClipboardContent: async () => ({ kind: "text", text: "Beta" }) });
    const result = value.bridge.input("Session Name", "", { initialValue: "Alpha", sessionNameEditing: true });
    await value.inputSurface!.ready;
    const key = (data: string) => value.inputSurface!.handleInput!(data);
    const inputRow = () => value.inputSurface!.render(60).find(row => stripTerminalSequences(row).trimStart().startsWith(">"))!;
    key("\x01");
    const row = inputRow().replace(/\x1b_[^\x07]*\x07/gu, "");
    const plain = stripTerminalSequences(row);
    const first = plain.indexOf("Alpha");
    const promptSelection = paintTextSelection("Alpha", 0, 5, visibleWidth, true);
    for (let column = first; column < first + 5; column++) {
      expect(cellBackgroundAt(row, column)).toBe(cellBackgroundAt(promptSelection, column - first));
    }
    expect(cellStyle(row, "A")).toEqual(cellStyle(promptSelection, "A"));
    expect(cellBackgroundAt(row, first - 1)).toBe("default");
    expect(cellBackgroundAt(row, first + 5)).toBe("default");
    expect(stripTerminalSequences(value.inputSurface!.render(60).join("\n"))).toContain("Enter submit  Esc close");
    expect(stripTerminalSequences(value.inputSurface!.render(60).join("\n"))).not.toMatch(/Ctrl\+[ACVXZ]/u);
    key("\x03");
    expect(onCopyText).toHaveBeenLastCalledWith("Alpha", false);
    expect(value.inputSurface).not.toBeNull();
    key("\x18");
    expect(onCopyText).toHaveBeenLastCalledWith("Alpha", true);
    expect(stripTerminalSequences(inputRow()).trim()).toBe(">");
    key("\x1a");
    expect(stripTerminalSequences(inputRow())).toContain("Alpha");
    key("\x16");
    await vi.waitFor(() => expect(stripTerminalSequences(inputRow())).toContain("Beta"));
    key("\x1a");
    expect(stripTerminalSequences(inputRow())).toContain("Alpha");
    key("Replaced");
    expect(stripTerminalSequences(inputRow())).toContain("Replaced");
    key("\x1a");
    expect(stripTerminalSequences(inputRow())).toContain("Alpha");
    key("\r");
    await expect(result).resolves.toBe("Alpha");
    value.bridge.dispose();
  });

  it("maps framed mouse selections to graphemes and retains them through cut and undo", async () => {
    const onCopyText = vi.fn();
    const value = fixture({ onCopyText });
    const result = value.bridge.input("Session Name", "", { initialValue: "A界e\u0301🙂Z", sessionNameEditing: true });
    await value.inputSurface!.ready;
    const surface = value.inputSurface!;
    const rows = surface.render(60);
    const row = rows.findIndex(row => stripTerminalSequences(row).trimStart().startsWith(">")) + 1;
    surface.handleLocalMouse!({ kind: "press", button: 0, column: 5, row });
    surface.handleLocalMouse!({ kind: "motion", button: 0, column: 8, row });
    surface.handleLocalMouse!({ kind: "release", button: 0, column: 8, row });
    surface.handleInput!("\x03");
    expect(onCopyText).toHaveBeenLastCalledWith("界e\u0301", false);
    surface.handleInput!("\x18");
    expect(stripTerminalSequences(surface.render(60).join("\n"))).toContain("A🙂Z");
    surface.handleInput!("\x1a");
    surface.handleInput!("\x03");
    expect(onCopyText).toHaveBeenLastCalledWith("界e\u0301", false);
    surface.handleInput!("\x1b");
    await expect(result).resolves.toBeUndefined();
    value.bridge.dispose();
  });

  it("maps horizontal scrolling and resize without splitting text or overflowing the frame", async () => {
    const onCopyText = vi.fn();
    const value = fixture({ onCopyText });
    const result = value.bridge.input("Session Name", "", { initialValue: "0123456789界Z", sessionNameEditing: true });
    await value.inputSurface!.ready;
    const surface = value.inputSurface!;
    const narrow = surface.render(15);
    const input = narrow.findIndex(row => stripTerminalSequences(row).trimStart().startsWith(">"));
    const first = stripTerminalSequences(narrow[input]!).trim().slice(2, 4);
    expect(first).not.toBe("01");
    surface.handleLocalMouse!({ kind: "press", button: 0, column: 4, row: input + 1 });
    surface.handleLocalMouse!({ kind: "motion", button: 0, column: 6, row: input + 1 });
    surface.handleLocalMouse!({ kind: "release", button: 0, column: 6, row: input + 1 });
    surface.handleInput!("\x03");
    expect(onCopyText).toHaveBeenLastCalledWith(first, false);
    expect(stripTerminalSequences(surface.render(60).join("\n"))).toContain("0123456789界Z");
    for (const width of [1, 2, 3, 4, 8, 15, 60]) {
      expect(surface.render(width).map(row => ({ row: stripTerminalSequences(row), width: visibleWidth(row) }))
        .filter(row => row.width > width), `overflow at ${width}`).toEqual([]);
    }
    surface.handleInput!("\x1b");
    await expect(result).resolves.toBeUndefined();
    value.bridge.dispose();
  });

  it("keeps pasted text single-line, bounded, and undoable without interpreting embedded shortcuts", async () => {
    const value = fixture();
    const result = value.bridge.input("Session Name", "", { initialValue: "Alpha", sessionNameEditing: true });
    await value.inputSurface!.ready;
    const surface = value.inputSurface!;
    surface.handleInput!("\x01");
    surface.handleInput!("\x1b[200~New\r\n");
    surface.handleInput!("Name\t\x03\x00\x1b[20");
    surface.handleInput!("1~");
    expect(value.inputSurface).toBe(surface);
    expect(stripTerminalSequences(surface.render(60).join("\n"))).toContain("NewName    ");
    surface.handleInput!("\x1a");
    surface.handleInput!("\x01");
    surface.handleInput!("x".repeat(4097));
    surface.handleInput!("\r");
    await expect(result).resolves.toBe("Alpha");
    value.bridge.dispose();
  });

  it("ignores stale clipboard reads after edits, dismissal, or replacement", async () => {
    let complete: (value: { readonly kind: "text"; readonly text: string }) => void = () => {};
    const signals: AbortSignal[] = [];
    const value = fixture({ readClipboardContent: signal => {
      signals.push(signal!);
      return new Promise(resolve => { complete = resolve; });
    } });
    const first = value.bridge.input("Session Name", "", { initialValue: "First", sessionNameEditing: true });
    await value.inputSurface!.ready;
    value.inputSurface!.handleInput!("\x16");
    await Promise.resolve();
    value.inputSurface!.handleInput!("\x1b");
    await expect(first).resolves.toBeUndefined();
    expect(signals[0]!.aborted).toBe(true);
    const second = value.bridge.input("Session Name", "", { initialValue: "Second", sessionNameEditing: true });
    await value.inputSurface!.ready;
    complete({ kind: "text", text: "stale" });
    await new Promise(resolve => setImmediate(resolve));
    value.inputSurface!.handleInput!("\x16");
    await Promise.resolve();
    value.inputSurface!.handleInput!(" edited");
    complete({ kind: "text", text: "stale" });
    await new Promise(resolve => setImmediate(resolve));
    value.inputSurface!.handleInput!("\r");
    await expect(second).resolves.toBe(" edited");
    value.bridge.dispose();
  });

  it("selects the initial name for immediate replacement and undo", async () => {
    const value = fixture();
    const result = value.bridge.input("Session Name", "", { initialValue: "Existing", sessionNameEditing: true });
    const surface = value.inputSurface!;
    await surface.ready;
    const field = surface.render(60).find(row => stripTerminalSequences(row).includes("> Existing"))!;
    const painted = field.replace(/\x1b_[^\x07]*\x07/gu, "");
    const from = stripTerminalSequences(painted).indexOf("Existing");
    expect(cellBackgroundAt(painted, from)).toBe(cellBackgroundAt(paintTextSelection("x", 0, 1, visibleWidth), 0));
    surface.handleInput!("Replacement");
    surface.handleInput!("\x1a");
    surface.handleInput!("New name");
    surface.handleInput!("\r");
    await expect(result).resolves.toBe("New name");
    value.bridge.dispose();
  });

  it("retains early pointer and keyboard input while name editing loads", async () => {
    const onCopyText = vi.fn();
    const value = fixture({ onCopyText });
    const result = value.bridge.input("Session Name", "", { initialValue: "Alpha", sessionNameEditing: true });
    const surface = value.inputSurface!;
    const rows = surface.render(60);
    const row = rows.findIndex(row => stripTerminalSequences(row).trimStart().startsWith(">")) + 1;
    surface.handleLocalMouse!({ kind: "press", button: 0, column: 4, row });
    surface.handleLocalMouse!({ kind: "motion", button: 0, column: 9, row });
    surface.handleLocalMouse!({ kind: "release", button: 0, column: 9, row });
    surface.handleInput!("\x03");
    await surface.ready;
    expect(onCopyText).toHaveBeenLastCalledWith("Alpha", false);
    expect(value.inputSurface).toBe(surface);
    surface.handleInput!("\x1b");
    await expect(result).resolves.toBeUndefined();
    value.bridge.dispose();
  });

  it("cancels an unselected name field and leaves public extension-input cancellation unchanged", async () => {
    const value = fixture();
    const named = value.bridge.input("Session Name", "", { initialValue: "Alpha", sessionNameEditing: true });
    value.inputSurface!.handleInput!("\x1b[C");
    value.inputSurface!.handleInput!("\x03");
    await expect(named).resolves.toBeUndefined();
    const extension = value.bridge.context.input("Session Name", "");
    value.inputSurface!.handleInput!("text");
    value.inputSurface!.handleInput!("\x03");
    await expect(extension).resolves.toBeUndefined();
    value.bridge.dispose();
  });

  it("stacks extension dialogs like pinned Pi so covered dialogs stay answerable and reappear", async () => {
    const value = fixture();
    const visible = () => stripTerminalSequences(value.inputSurface!.render(60).join("\n"));
    const selection = value.bridge.context.select("Choose", ["alpha", "beta"]);
    const confirmation = value.bridge.context.confirm("Permission", "Allow this operation?");
    expect(visible()).toContain("Allow this operation?");
    expect(value.blockedStatuses.at(-1)).toEqual({ kind: "permission", message: "Permission" });
    value.inputSurface!.handleInput?.("\r");
    await expect(confirmation).resolves.toBe(true);
    expect(visible()).toContain("alpha");
    expect(value.blockedStatuses.at(-1)).toEqual({ kind: "question", message: "Choose" });
    value.inputSurface!.handleInput?.("\r");
    await expect(selection).resolves.toBe("alpha");
    expect(value.inputSurface).toBeNull();
    expect(value.blockedStatuses.at(-1)).toBeUndefined();

    const controller = new AbortController();
    const covered = value.bridge.context.select("Covered", ["one"], { signal: controller.signal });
    const top = value.bridge.context.input("Top", "placeholder");
    const topSurface = value.inputSurface;
    controller.abort();
    await expect(covered).resolves.toBeUndefined();
    expect(value.inputSurface).toBe(topSurface);
    expect(value.blockedStatuses.at(-1)).toEqual({ kind: "question", message: "Top" });
    value.inputSurface!.handleInput?.("\r");
    await expect(top).resolves.toBe("");
    expect(value.inputSurface).toBeNull();

    const disposeCustom = vi.fn();
    const nested = (value.bridge.context as unknown as ExtensionUIContext).custom<boolean>((_tui, _theme, _keys, finish) => ({
      render: () => ["custom host"],
      invalidate() {},
      handleInput: () => { void value.bridge.context.confirm("Nested", "Inside custom?").then(finish); },
      dispose: disposeCustom,
    }));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(visible()).toContain("custom host");
    value.inputSurface!.handleInput?.("x");
    expect(visible()).toContain("Inside custom?");
    value.inputSurface!.handleInput?.("\r");
    await expect(nested).resolves.toBe(true);
    expect(disposeCustom).toHaveBeenCalledTimes(1);
    expect(value.inputSurface).toBeNull();

    const lower = value.bridge.context.select("Lower", ["one"]);
    const upper = value.bridge.context.editor("Upper", "draft");
    value.bridge.reset();
    await expect(upper).resolves.toBeUndefined();
    await expect(lower).resolves.toBeUndefined();
    expect(value.inputSurface).toBeNull();
    expect(value.blockedStatuses.at(-1)).toBeUndefined();
    value.bridge.dispose();
  });

  it("binds widgets, statuses, editor state, input hooks, themes, and failure isolation", () => {
    const value = fixture();
    value.bridge.context.setWidget("rows", ["one", "two"]);
    value.bridge.context.setWidget("factory", () => new Text("factory widget", 0, 0), { placement: "belowEditor" });
    expect(stripTerminalSequences(value.widgets.get("rows")!.render(40).join("\n"))).toContain("two");
    expect(stripTerminalSequences(value.widgets.get("factory")!.render(40).join("\n"))).toContain("factory widget");
    value.bridge.context.setStatus("lint", "clean");
    expect(value.statuses.get("lint")).toBe("clean");

    value.bridge.context.setEditorText("base");
    value.bridge.context.pasteToEditor("+paste");
    expect(value.bridge.context.getEditorText()).toBe("base+paste");
    value.bridge.context.setToolsExpanded(true);
    expect(value.bridge.context.getToolsExpanded()).toBe(true);
    expect(value.bridge.context.getTheme("dark")).toBeDefined();
    expect(value.bridge.context.setTheme("dark")).toEqual({ success: true });

    const terminal = vi.fn(() => ({ consume: true }));
    const unsubscribe = value.bridge.context.onTerminalInput(terminal);
    for (const listener of value.inputListeners) expect(listener("x")).toEqual({ consume: true });
    unsubscribe();
    expect(value.inputListeners.size).toBe(0);

    value.bridge.context.setWidget("broken", (() => { throw new Error("boom"); }) as never);
    expect(value.notifications).toContain("error:Extension widget failed: boom");
    expect(() => value.bridge.context.setEditorComponent((() => { throw new Error("editor boom"); }) as never)).not.toThrow();
    expect(value.notifications).toContain("error:Extension editor failed: editor boom");
    expect(() => value.bridge.context.setEditorComponent((() => ({})) as never)).not.toThrow();
    expect(value.notifications).toContain("error:Extension editor failed: extension editor factory returned a malformed editor");
    value.bridge.dispose();
  });

  it("mounts custom overlays and restores the core surface on resolve and throw", async () => {
    const value = fixture();
    let done: ((result: string) => void) | undefined;
    // Compatibility: the bridge publishes the neutral port; this case drives Pi's own four-argument custom factory.
    const result = (value.bridge.context as unknown as ExtensionUIContext).custom<string>((_tui, _theme, _keys, finish) => {
      done = finish;
      return new Text("custom surface", 0, 0);
    }, { overlay: true });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(stripTerminalSequences(value.inputSurface!.render(40).join("\n"))).toContain("custom surface");
    done!("accepted");
    await expect(result).resolves.toBe("accepted");
    expect(value.inputSurface).toBeNull();

    await expect(value.bridge.context.custom(() => { throw new Error("custom boom"); })).rejects.toThrow("custom boom");
    await expect(value.bridge.context.custom((() => ({})) as never)).rejects.toThrow(/malformed component/);
    expect(value.notifications).not.toContain("error:Extension custom surface failed: custom boom");
    expect(value.inputSurface).toBeNull();

    const customInput = vi.fn();
    const cancelled = value.bridge.context.custom(() => ({
      render: () => ["custom dialog"],
      invalidate() {},
      handleInput: customInput,
    }));
    await new Promise(resolve => setTimeout(resolve, 0));
    value.inputSurface!.handleInput?.("\u0003");
    await expect(cancelled).resolves.toBeUndefined();
    expect(customInput).not.toHaveBeenCalled();
    expect(value.inputSurface).toBeNull();

    const switched = value.bridge.context.custom(() => new Text("switch custom", 0, 0));
    await new Promise(resolve => setTimeout(resolve, 0));
    value.bridge.reset();
    await expect(switched).resolves.toBeUndefined();
    expect(value.inputSurface).toBeNull();
    value.bridge.dispose();
  });
});
