import { describe, expect, it, vi } from "vitest";
import { InputSurfaceSwitch } from "../../../src/app/session-shell/input-surface-switch.js";

function surface() {
  return { render: () => [], invalidate: vi.fn(), handleInput: vi.fn(), setFocused: vi.fn(), dispose: vi.fn() };
}

function harness(dockInputReuse = true) {
  const editor = surface();
  const viewport = { invalidateInputSurface: vi.fn(), presentationRevision: 7 };
  const onChanged = vi.fn();
  const input = new InputSurfaceSwitch(editor as never, { dockInputReuse, viewport, onChanged });
  return { input, editor, viewport, onChanged };
}

describe("InputSurfaceSwitch", () => {
  it("starts on the editor and swaps focus, disposal, and coordination with each replacement", () => {
    const { input, editor, viewport, onChanged } = harness();
    expect(input.usesEditor).toBe(true);
    expect(input.coordination).toBe("editor");
    const dialog = surface();
    expect(input.set(dialog as never, true, "owned")).toBe(true);
    expect(editor.setFocused).toHaveBeenLastCalledWith(false);
    expect(dialog.setFocused).toHaveBeenLastCalledWith(true);
    expect(viewport.invalidateInputSurface).toHaveBeenCalledOnce();
    expect(onChanged).toHaveBeenCalledOnce();
    expect(input.set(dialog as never, true, "editor-like" as never)).toBe(false);
    expect(input.coordination).toBe("editor-like");
    expect(input.set(null, true, "owned")).toBe(true);
    expect(dialog.dispose).toHaveBeenCalledOnce();
    expect(input.coordination).toBe("editor");
    const kept = surface();
    input.set(kept as never, true, "owned");
    input.set(null, false, "owned");
    expect(kept.dispose).not.toHaveBeenCalled();
  });

  it("records a safe keystroke as a dock-only candidate with the presentation revision", () => {
    const { input, editor } = harness();
    input.handleInput("a");
    expect(editor.handleInput).toHaveBeenCalledWith("a");
    expect(input.dockInputCandidate).toBe(true);
    expect(input.dockInputRevision).toBe(7);
    expect(input.takeDockInputCandidate()).toBe(true);
    expect(input.dockInputCandidate).toBe(false);
    input.handleInput("a");
    input.clearDockInputCandidate();
    expect(input.dockInputRevision).toBeUndefined();
  });

  it("never records a candidate when reuse is off, and drops it when the surface throws", () => {
    expect((() => { const { input } = harness(false); input.handleInput("a"); return input.dockInputCandidate; })()).toBe(false);
    const { input, editor } = harness();
    editor.handleInput.mockImplementation(() => { throw new Error("boom"); });
    expect(() => input.handleInput("a")).toThrow("boom");
    expect(input.dockInputCandidate).toBe(false);
  });

  it("disposes a replacement surface but never the editor", () => {
    const { input, editor } = harness();
    input.dispose();
    expect(editor.dispose).not.toHaveBeenCalled();
    const dialog = surface();
    input.set(dialog as never, true, "owned");
    input.dispose();
    expect(dialog.dispose).toHaveBeenCalledOnce();
  });
});
