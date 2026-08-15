import { describe, expect, it } from "vitest";
import { assertOwnedUiEditorState } from "../../../src/foundation/owned-ui-contracts/index.js";
import {
  OwnedPromptEditor,
  type OwnedTerminalInput,
} from "../../../src/features/owned-ui/index.js";

function input(value: OwnedTerminalInput): OwnedTerminalInput {
  return value;
}

describe("owned prompt editor", () => {
  it("edits text, Unicode/IME input, cursor position, paste, and backspace", () => {
    const renders: number[] = [];
    const editor = new OwnedPromptEditor({ onRequestRender: () => renders.push(1) });
    editor.handleInput(input({ type: "text", text: "a" }));
    editor.handleInput(input({ type: "text", text: "界" }));
    editor.handleInput(input({ type: "key", key: "left", ctrl: false, alt: false, shift: false }));
    editor.handleInput(input({ type: "paste", text: "b\n" }));

    expect(editor.getText()).toBe("ab\n界");
    expect(editor.state().cursorOffset).toBe(3);
    expect(() => assertOwnedUiEditorState(editor.state())).not.toThrow();

    editor.handleInput(input({ type: "key", key: "backspace", ctrl: false, alt: false, shift: false }));
    expect(editor.getText()).toBe("ab界");
    expect(renders.length).toBeGreaterThan(0);
  });

  it("submits idle prompts and queues submissions while the engine is busy", () => {
    const submitted: string[] = [];
    const queued: string[] = [];
    const editor = new OwnedPromptEditor({ onSubmit: text => submitted.push(text), onQueue: text => queued.push(text) });
    editor.setText("first");
    editor.handleInput(input({ type: "key", key: "enter", ctrl: false, alt: false, shift: false }));
    expect(submitted).toEqual(["first"]);
    expect(editor.getText()).toBe("");

    editor.setBusy(true);
    editor.setText("second");
    editor.handleInput(input({ type: "key", key: "enter", ctrl: false, alt: false, shift: false }));
    expect(queued).toEqual(["second"]);
    expect(editor.state().queuedSubmissions).toEqual(["second"]);
    expect(editor.render({ columns: 40, rows: 4 }).join("\n")).toContain("queued: second");
  });

  it("supports selection, clipboard copy, clear, and cancellation ownership", () => {
    const copied: string[] = [];
    let cancelled = 0;
    const editor = new OwnedPromptEditor({ onCancel: () => cancelled += 1 });
    editor.setText("select me");
    editor.handleInput(input({ type: "key", key: "a", ctrl: true, alt: false, shift: false }));
    expect(editor.selectedText()).toBe("select me");
    expect(editor.copySelection(text => copied.push(text))).toBe(true);
    expect(copied).toEqual(["select me"]);

    editor.handleInput(input({ type: "key", key: "c", ctrl: true, alt: false, shift: false }));
    expect(editor.state().selection).toBeNull();
    expect(cancelled).toBe(0);

    editor.handleInput(input({ type: "key", key: "c", ctrl: true, alt: false, shift: false }));
    expect(cancelled).toBe(1);
  });

  it("renders bounded prompt and queued rows on resize and cleans up transient state", () => {
    const editor = new OwnedPromptEditor();
    editor.setText(`${"x".repeat(30)}\tvalue`);
    editor.setBusy(true);
    editor.handleInput(input({ type: "key", key: "enter", ctrl: false, alt: false, shift: false }));
    const rows = editor.render({ columns: 12, rows: 8 });
    expect(rows.every(row => row.length <= 12)).toBe(true);
    expect(rows[0]).toContain("> ");

    editor.dispose();
    expect(editor.state().queuedSubmissions).toEqual([]);
    expect(editor.state().selection).toBeNull();
  });
});
