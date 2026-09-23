import { describe, expect, it, vi } from "vitest";
import { getKeybindings, setKeybindings, stripTerminalSequences } from "@earendil-works/pi-tui";
import { applyPiTheme, applyPiThemeInstance, piTheme } from "../../../../src/integrations/pi/components/index.js";
import { KeybindingsManager, type KeybindingsConfig } from "../../../../src/integrations/pi/components/upstream/adjacent/core/keybindings.js";
import { ScopedModelsSelectorComponent } from "../../../../src/integrations/pi/components/upstream/components/scoped-models-selector.js";
import { firstVisibleTextColumn } from "../../../support/dialog-alignment.js";
import { withPiParityColorMode } from "../../../support/pi-terminal-capabilities.js";

const models = [
  { provider: "fixture", id: "first", name: "First alt+literal" },
  { provider: "fixture", id: "second", name: "Second" },
];
const ids = models.map(model => `${model.provider}/${model.id}`);

/** Scope only synchronous presentation; native platform CI remains the independent authority. */
function withSelector(platform: NodeJS.Platform, bindings: KeybindingsConfig, run: (selector: ScopedModelsSelectorComponent, callbacks: ReturnType<typeof spies>, keys: KeybindingsManager) => void, enabled: string[] | null = null) {
  const previousPlatform = Object.getOwnPropertyDescriptor(process, "platform")!;
  const previousKeys = getKeybindings();
  const previousTheme = piTheme();
  return withPiParityColorMode("truecolor", () => {
    applyPiTheme("dark", false, "truecolor");
    const keys = new KeybindingsManager(bindings);
    const callbacks = spies();
    try {
      Object.defineProperty(process, "platform", { ...previousPlatform, value: platform });
      setKeybindings(keys);
      const selector = new ScopedModelsSelectorComponent({ allModels: models, enabledModelIds: enabled, refreshStatus: "Refreshing models" }, callbacks);
      selector.focused = true;
      run(selector, callbacks, keys);
    } finally {
      Object.defineProperty(process, "platform", previousPlatform);
      setKeybindings(previousKeys);
      applyPiTheme(previousTheme.name ?? "dark", false, previousTheme.getColorMode());
      applyPiThemeInstance(previousTheme);
    }
  });
}

function spies() { return { onChange: vi.fn(), onPersist: vi.fn(), onCancel: vi.fn() }; }
function text(selector: ScopedModelsSelectorComponent) { return selector.render(600).map(stripTerminalSequences).join("\n"); }

for (const platform of ["darwin", "win32", "linux"] as const) {
  describe(`scoped-model key hints on ${platform}`, () => {
    const alt = platform === "darwin" ? "Option" : "Alt";

    it("formats default reorder hints without changing their logical keys or model text", () => {
      withSelector(platform, {}, (selector, _callbacks, keys) => {
        expect(text(selector)).toContain(`${alt}+Up/${alt}+Down reorder`);
        expect(text(selector)).toContain("Session-only. Ctrl+S to save to settings.");
        const rows = selector.render(600);
        const heading = rows.find(row => stripTerminalSequences(row).includes("Model Configuration"))!;
        const hint = rows.find(row => stripTerminalSequences(row).includes("toggle"))!;
        expect(firstVisibleTextColumn(hint)).toBe(firstVisibleTextColumn(heading));
        expect(text(selector)).toContain("First alt+literal");
        expect(keys.getKeys("app.models.reorderUp")).toEqual(["alt+up"]);
        expect(keys.getKeys("app.models.reorderDown")).toEqual(["alt+down"]);
      });
    });

    it("formats all header/footer actions, modifier chords and ordered alternatives", () => {
      const bindings: KeybindingsConfig = {
        "tui.select.confirm": "alt+t", "app.models.enableAll": ["alt+a", "ctrl+a"],
        "app.models.clearAll": "ctrl+alt+x", "app.models.toggleProvider": "alt+p",
        "app.models.reorderUp": ["alt+up", "ctrl+up"], "app.models.reorderDown": "alt+down",
        "app.models.save": ["alt+s", "ctrl+s"],
      };
      withSelector(platform, bindings, (selector, callbacks, keys) => {
        const before = keys.getEffectiveConfig();
        expect(text(selector)).toContain(`Session-only. ${alt}+S/Ctrl+S to save to settings.`);
        expect(text(selector)).toContain(`${alt}+T toggle  ${alt}+A/Ctrl+A all  Ctrl+${alt}+X clear  ${alt}+P provider  ${alt}+Up/Ctrl+Up/${alt}+Down reorder  ${alt}+S/Ctrl+S save  all enabled`);
        expect(text(selector)).not.toMatch(/[·•]/u);
        selector.handleInput("\u001bt");
        // Rationale: since 0.85.1 the first toggle from "all enabled" disables that one model rather than keeping only it.
        const allButFirst = ids.filter(id => id !== ids[0]);
        expect(callbacks.onChange).toHaveBeenLastCalledWith(allButFirst);
        expect(callbacks.onPersist).not.toHaveBeenCalled();
        selector.handleInput("\u001bs");
        expect(callbacks.onPersist).toHaveBeenLastCalledWith(allButFirst);
        expect(keys.getEffectiveConfig()).toEqual(before);
      });
    });

    it("preserves non-Alt spelling and the empty presentation of unbound actions", () => {
      withSelector(platform, { "app.models.save": [], "app.models.reorderUp": [], "app.models.reorderDown": "shift+ctrl+down" }, (selector, callbacks, keys) => {
        const rendered = text(selector);
        expect(rendered).toContain("Session-only.");
        expect(rendered).not.toContain("to save to settings");
        expect(rendered).toContain("Shift+Ctrl+Down reorder  all enabled");
        expect(rendered).not.toContain("Ctrl+S");
        expect(keys.getKeys("app.models.save")).toEqual([]);
        selector.handleInput("\u0013");
        expect(callbacks.onPersist).not.toHaveBeenCalled();
      });
    });

    it("keeps reorders session-only, saves explicitly and retains labels across refresh and cancel", () => {
      withSelector(platform, { "app.models.reorderDown": "alt+j", "app.models.save": "alt+s" }, (selector, callbacks, keys) => {
        selector.handleInput("\u001bj");
        expect(callbacks.onChange).toHaveBeenLastCalledWith([ids[1], ids[0]]);
        expect(callbacks.onPersist).not.toHaveBeenCalled();
        expect(text(selector)).toContain("(unsaved)");
        expect(text(selector)).toContain(`${alt}+Up/${alt}+J reorder`);
        selector.handleInput("\u001bs");
        expect(callbacks.onPersist).toHaveBeenLastCalledWith([ids[1], ids[0]]);
        expect(text(selector)).not.toContain("(unsaved)");
        for (const kind of ["muted", "success", "warning"] as const) {
          selector.updateModels(models);
          selector.setRefreshStatus(`Catalog ${kind}`, kind);
          expect(text(selector)).toContain(`Catalog ${kind}`);
          expect(text(selector)).toContain(`${alt}+S save`);
        }
        selector.handleInput("\r");
        expect(callbacks.onChange).toHaveBeenLastCalledWith([ids[1]]);
        expect(text(selector)).toContain("(unsaved)");
        selector.handleInput("\u001b");
        expect(callbacks.onCancel).toHaveBeenCalledOnce();
        expect(callbacks.onPersist).toHaveBeenCalledTimes(1);
        expect(keys.getKeys("app.models.reorderDown")).toEqual(["alt+j"]);
      }, [...ids]);
    });
  });
}

it("restores the platform and binding owner after a failing assertion", () => {
  const platform = Object.getOwnPropertyDescriptor(process, "platform");
  const keys = getKeybindings();
  expect(() => withSelector("darwin", {}, () => { throw new Error("fixture failure"); })).toThrow("fixture failure");
  expect(Object.getOwnPropertyDescriptor(process, "platform")).toEqual(platform);
  expect(getKeybindings()).toBe(keys);
});
