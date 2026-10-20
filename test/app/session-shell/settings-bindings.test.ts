import { describe, expect, it, vi } from "vitest";
import type {
  OwnedUiSessionSettingsSnapshot,
  OwnedUiSettingOwner,
  OwnedUiSettingOwnerHandlers,
} from "../../../src/contracts/owned-ui/index.js";
import { bindSessionSettings } from "../../../src/app/session-shell/settings-bindings.js";

const snapshot = {
  showHardwareCursor: true,
  clearOnShrink: false,
  showTerminalProgress: true,
  editorPaddingX: 2,
  autocompleteMaxVisible: 7,
  outputPad: 1,
  hideThinkingBlock: true,
  mermaidRenderingMode: "final",
  showImages: false,
  imageWidthCells: 60,
  fullscreenCopyOnSelect: true,
  fullscreenExitOutput: "transcript",
} as unknown as OwnedUiSessionSettingsSnapshot;

function harness(productMode: "bare" | "comparison" = "bare", failOwner?: OwnedUiSettingOwner) {
  const calls: string[] = [];
  const bound = new Map<OwnedUiSettingOwner, OwnedUiSettingOwnerHandlers>();
  const settings = {
    productMode,
    bindOwner: (owner: OwnedUiSettingOwner, handlers: OwnedUiSettingOwnerHandlers) => {
      if (owner === failOwner) throw new Error(`cannot bind ${owner}`);
      calls.push(`bind ${owner}`);
      bound.set(owner, handlers);
      return () => {
        calls.push(`unbind ${owner}`);
        bound.delete(owner);
      };
    },
  };
  const record = (name: string) => vi.fn((...args: unknown[]) => { calls.push(`${name}(${args.map(arg => JSON.stringify(arg)).join(",")})`); });
  const targets = {
    terminal: { setHardwareCursor: record("hardwareCursor"), setClearOnShrink: record("clearOnShrink"), setWheelScrollLines: record("wheel") },
    root: {
      setEditorPaddingX: record("padding"),
      setAutocompleteMaxVisible: record("autocomplete"),
      setOutputPad: record("outputPad"),
      setHideThinkingBlock: record("hideThinking"),
      setMermaidRenderingMode: record("mermaid"),
      setImagePresentation: record("images"),
      setFullscreenCopyOnSelect: record("copyOnSelect"),
    },
    setTerminalProgress: record("progress"),
  };
  const apply = (owner: OwnedUiSettingOwner, key: string, value: unknown) =>
    (bound.get(owner) as Record<string, { apply(value: unknown): void }>)[key]!.apply(value);
  return { settings, targets, calls, bound, apply };
}

describe("session settings bindings", () => {
  it("applies the snapshot, then binds the terminal and shell owners in order for bare A1", () => {
    const { settings, targets, calls, bound } = harness("bare");
    bindSessionSettings(settings, snapshot, targets as never, { customViewport: true });
    expect(calls).toEqual([
      "hardwareCursor(true)", "clearOnShrink(false)", "progress(true)",
      "padding(2)", "autocomplete(7)", "outputPad(1)", "hideThinking(true)", "mermaid(\"final\")",
      "images(false,60)", "copyOnSelect(true)",
      "bind terminal", "bind shell",
    ]);
    expect(Object.keys(bound.get("terminal")!)).toEqual(["showHardwareCursor", "clearOnShrink", "showTerminalProgress"]);
    expect(Object.keys(bound.get("shell")!)).toEqual([
      "editorPaddingX", "autocompleteMaxVisible", "outputPad", "hideThinkingBlock", "mermaidRenderingMode",
      "showImages", "imageWidthCells", "fullscreenCopyOnSelect",
    ]);
  });

  it("binds the exit-output owner and the wheel distance for the pinned profile and still applies copy-on-select once", () => {
    const { settings, targets, calls, bound, apply } = harness("comparison");
    bindSessionSettings(settings, snapshot, targets as never, { customViewport: false });
    expect(calls.filter(call => call.startsWith("bind"))).toEqual(["bind shutdown", "bind terminal", "bind shell"]);
    expect(calls).toContain("copyOnSelect(true)");
    expect(bound.get("shell")).not.toHaveProperty("fullscreenCopyOnSelect");
    apply("shutdown", "fullscreenExitOutput", "resume-hint");
    apply("shell", "fullscreenWheelScrollLines", "auto");
    apply("shell", "fullscreenWheelScrollLines", 100);
    expect(calls.slice(-2)).toEqual(["wheel(\"auto\")", "wheel(100)"]);
    expect(() => apply("shell", "fullscreenWheelScrollLines", 101)).toThrow("Fullscreen wheel-scroll distance is invalid");
  });

  it("installs valid live values and rejects invalid ones with the owner's message", () => {
    const { settings, targets, calls, apply } = harness();
    bindSessionSettings(settings, snapshot, targets as never, { customViewport: true });
    calls.length = 0;
    apply("terminal", "showTerminalProgress", false);
    apply("shell", "imageWidthCells", 40);
    apply("shell", "showImages", true);
    apply("shell", "outputPad", 0);
    expect(calls).toEqual(["progress(false)", "images(false,40)", "images(true,40)", "outputPad(0)"]);
    const invalid: [OwnedUiSettingOwner, string, unknown, string][] = [
      ["terminal", "showHardwareCursor", "yes", "Hardware cursor setting is invalid"],
      ["terminal", "clearOnShrink", 1, "Clear-on-shrink setting is invalid"],
      ["terminal", "showTerminalProgress", null, "Terminal progress setting is invalid"],
      ["shell", "editorPaddingX", "2", "Editor padding is invalid"],
      ["shell", "autocompleteMaxVisible", true, "Autocomplete maximum is invalid"],
      ["shell", "outputPad", 2, "Output padding is invalid"],
      ["shell", "hideThinkingBlock", "no", "Thinking-block visibility is invalid"],
      ["shell", "mermaidRenderingMode", "always", "Mermaid mode is invalid"],
      ["shell", "showImages", 0, "Image visibility is invalid"],
      ["shell", "imageWidthCells", 0.5, "Image width is invalid"],
      ["shell", "fullscreenCopyOnSelect", "on", "Fullscreen copy-on-select setting is invalid"],
    ];
    for (const [owner, key, value, message] of invalid) expect(() => apply(owner, key, value), key).toThrow(message);
  });

  it("releases owners in reverse order, and no applier stays bound after release", () => {
    const { settings, targets, calls, bound } = harness("comparison");
    const release = bindSessionSettings(settings, snapshot, targets as never, { customViewport: false });
    calls.length = 0;
    release();
    release();
    expect(calls).toEqual(["unbind shell", "unbind terminal", "unbind shutdown"]);
    expect(bound.size).toBe(0);
  });

  it("releases the owners already bound when a later owner fails", () => {
    const { settings, targets, calls, bound } = harness("comparison", "shell");
    expect(() => bindSessionSettings(settings, snapshot, targets as never, { customViewport: false })).toThrow("cannot bind shell");
    expect(calls.slice(-2)).toEqual(["unbind terminal", "unbind shutdown"]);
    expect(bound.size).toBe(0);
  });
});
