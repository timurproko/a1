import { Text, stripTerminalSequences } from "@earendil-works/pi-tui";
import { describe, expect, it, vi } from "vitest";
import {
  createPiExtensionUiBridge,
  type PiExtensionUiBridgeHost,
  type PiShellComponentPort,
} from "../../../src/foundation/pi-component-adapter/index.js";

function fixture() {
  let inputSurface: PiShellComponentPort | null = null;
  const widgets = new Map<string, PiShellComponentPort>();
  const statuses = new Map<string, string>();
  const notifications: string[] = [];
  const inputListeners = new Set<(data: string) => { readonly consume?: boolean; readonly data?: string } | undefined>();
  let editorText = "";
  let expanded = false;
  const host: PiExtensionUiBridgeHost = {
    runtime: { getColumns: () => 80, getRows: () => 24, requestRender: vi.fn() },
    setInputSurface: component => { inputSurface = component; },
    showOverlay: component => {
      inputSurface = component;
      let hidden = false;
      return {
        hide() { hidden = true; inputSurface = null; component.dispose?.(); },
        setHidden(value) { hidden = value; }, isHidden: () => hidden,
        focus() {}, unfocus() {}, isFocused: () => !hidden,
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
  return { bridge, host, widgets, statuses, notifications, inputListeners, get inputSurface() { return inputSurface; } };
}

describe("pinned extension UI bridge", () => {
  it("opens, resolves, cancels, and restores selectors and text inputs", async () => {
    const value = fixture();
    const selection = value.bridge.context.select("Choose", ["alpha", "beta"]);
    expect(stripTerminalSequences(value.inputSurface!.render(60).join("\n"))).toContain("alpha");
    value.inputSurface!.handleInput?.("\x1b[B");
    value.inputSurface!.handleInput?.("\r");
    await expect(selection).resolves.toBe("beta");
    expect(value.inputSurface).toBeNull();

    const input = value.bridge.context.input("Name", "placeholder");
    value.inputSurface!.handleInput?.("Ada");
    value.inputSurface!.handleInput?.("\r");
    await expect(input).resolves.toBe("Ada");

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
    const result = value.bridge.context.custom<string>((_tui, _theme, _keys, finish) => {
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

    const switched = value.bridge.context.custom(() => new Text("switch custom", 0, 0));
    await new Promise(resolve => setTimeout(resolve, 0));
    value.bridge.reset();
    await expect(switched).resolves.toBeUndefined();
    expect(value.inputSurface).toBeNull();
    value.bridge.dispose();
  });
});
