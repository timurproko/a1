import { describe, expect, it, vi } from "vitest";
import { getKeybindings, setKeybindings, stripTerminalSequences } from "@earendil-works/pi-tui";
import { applyPiTheme, applyPiThemeInstance, piTheme } from "../../../../src/integrations/pi/components/index.js";
import { KeybindingsManager, type KeybindingsConfig } from "../../../../src/integrations/pi/components/upstream/adjacent/core/keybindings.js";
import { ModelsDialogComponent, type ModelsDialogConfig } from "../../../../src/integrations/pi/components/models-dialog.js";
import { withPiParityColorMode } from "../../../support/pi-terminal-capabilities.js";

const models = [
  { provider: "openai", id: "gpt-5", name: "GPT-5" },
  { provider: "anthropic", id: "claude", name: "Claude" },
  { provider: "openai", id: "gpt-5-mini", name: "GPT-5 Mini" },
];
const ids = { claude: "anthropic/claude", gpt5: "openai/gpt-5", mini: "openai/gpt-5-mini" };
const SPACE = " ";
const ENTER = "\r";
const TAB = "\t";
const ESCAPE = "\u001b";
const CTRL_S = "\u0013";
const DOWN = "\u001b[B";

function spies() {
  return { onSelect: vi.fn(), onScopeChange: vi.fn(), onSave: vi.fn(async () => {}), onCancel: vi.fn(), requestRender: vi.fn() };
}

function text(dialog: ModelsDialogComponent, width = 200): string {
  return dialog.render(width).map(stripTerminalSequences).join("\n");
}

function rows(dialog: ModelsDialogComponent, width = 200): readonly string[] {
  return dialog.render(width).map(stripTerminalSequences).filter(line => /^(?:→ |  )[●○] /u.test(line));
}

/** Scope only synchronous presentation under owned bindings; native platform CI remains the independent authority. */
function withDialog<T>(
  run: (dialog: ModelsDialogComponent, callbacks: ReturnType<typeof spies>, keys: KeybindingsManager) => T,
  config: Partial<ModelsDialogConfig> = {},
  bindings: KeybindingsConfig = {},
  platform: NodeJS.Platform = process.platform,
): T {
  const previousPlatform = Object.getOwnPropertyDescriptor(process, "platform")!;
  const previousKeys = getKeybindings();
  const previousTheme = piTheme();
  const restore = () => {
    Object.defineProperty(process, "platform", previousPlatform);
    setKeybindings(previousKeys);
    applyPiTheme(previousTheme.name ?? "dark", false, previousTheme.getColorMode());
    applyPiThemeInstance(previousTheme);
  };
  return withPiParityColorMode("truecolor", () => {
    applyPiTheme("dark", false, "truecolor");
    const keys = KeybindingsManager.fromOwnedBindings(bindings);
    const callbacks = spies();
    let result: T;
    try {
      Object.defineProperty(process, "platform", { ...previousPlatform, value: platform });
      setKeybindings(keys);
      const dialog = new ModelsDialogComponent({ models, activeModelId: ids.gpt5, scopeIds: [], savedScopeIds: [], ...config }, callbacks);
      dialog.focused = true;
      result = run(dialog, callbacks, keys);
    } catch (error) {
      restore();
      throw error;
    }
    if (result instanceof Promise) return result.finally(restore) as T;
    restore();
    return result;
  });
}

async function settled(): Promise<void> {
  await new Promise(resolve => setImmediate(resolve));
}

describe("unified Models dialog", () => {
  it("renders provider-ordered rows with the marker before the id and the checkmark after the provider badge", () => {
    withDialog(dialog => {
      const lines = dialog.render(200);
      const stripped = lines.map(stripTerminalSequences);
      expect(stripped[2]).toBe("Models");
      expect(stripped[3]).toBe("Filter: all | scoped");
      expect(rows(dialog)).toEqual([
        "  ○ claude [anthropic]",
        "→ ○ gpt-5 [openai] ✓",
        "  ○ gpt-5-mini [openai]",
      ]);
      const active = lines.find(line => stripTerminalSequences(line).startsWith("→ "))!;
      expect(active).toContain(`${piTheme().fg("muted", "[openai]")} ${piTheme().fg("success", "✓")}`);
      expect(active).toContain(piTheme().fg("dim", "○"));
      expect(active).toContain(piTheme().fg("accent", "gpt-5"));
      expect(stripped).toContain("  Model Name: GPT-5");
      expect(stripped.at(-2)).toBe("  type to search  ↑↓ navigate  Tab filter  Enter switch  Space scope  Ctrl+S save  Esc close");
      const footer = lines.at(-2)!;
      expect(footer).toContain(piTheme().fg("dim", "↑↓"));
      expect(footer).toContain(piTheme().fg("muted", "navigate"));
      expect(footer).not.toMatch(/[·•]/u);
      expect(stripped).not.toContain("(unsaved)");
      expect(dialog.selectedModelId).toBe(ids.gpt5);
    });
  });

  it("truncates every row to the width and keeps narrow frames free of wrapped fragments", () => {
    withDialog(dialog => {
      for (const width of [28, 12]) {
        for (const line of dialog.render(width)) expect(stripTerminalSequences(line).length).toBeLessThanOrEqual(width);
      }
      expect(rows(dialog, 28)).toEqual(["  ○ claude [anthropic]", "→ ○ gpt-5 [openai] ✓", "  ○ gpt-5-mini [openai]"]);
    });
  });

  it("filters by search while keeping catalog order and retains the selection where the row survives", () => {
    withDialog(dialog => {
      for (const character of "mini") dialog.handleInput(character);
      expect(rows(dialog)).toEqual(["→ ○ gpt-5-mini [openai]"]);
      expect(dialog.selectedModelId).toBe(ids.mini);
      for (let index = 0; index < 4; index += 1) dialog.handleInput("\u007f");
      expect(rows(dialog)).toHaveLength(3);
      for (const character of "nothing here") dialog.handleInput(character);
      expect(text(dialog)).toContain("  No matching models");
      dialog.handleInput("\u0003");
      expect(dialog.query).toBe("");
      expect(rows(dialog)).toHaveLength(3);
      dialog.handleInput("\u0003");
    }, { initialQuery: "" });
  });

  it("seeds the query from the initial argument and switches only on Enter", () => {
    withDialog((dialog, callbacks) => {
      expect(dialog.query).toBe("gpt");
      expect(rows(dialog)).toEqual(["→ ○ gpt-5 [openai] ✓", "  ○ gpt-5-mini [openai]"]);
      expect(callbacks.onSelect).not.toHaveBeenCalled();
      dialog.handleInput(DOWN);
      dialog.handleInput(ENTER);
      expect(callbacks.onSelect).toHaveBeenCalledExactlyOnceWith(ids.mini);
      expect(callbacks.onSave).not.toHaveBeenCalled();
      expect(callbacks.onScopeChange).not.toHaveBeenCalled();
    }, { initialQuery: "gpt" });
  });

  it("toggles scope with Space as a session-only edit, marks the title dirty, and mirrors the pending scope in the scoped filter", () => {
    withDialog((dialog, callbacks) => {
      dialog.handleInput(SPACE);
      expect(callbacks.onScopeChange).toHaveBeenLastCalledWith([ids.gpt5]);
      expect(callbacks.onSave).not.toHaveBeenCalled();
      const lines = dialog.render(200);
      expect(stripTerminalSequences(lines[2]!)).toBe("Models (unsaved)");
      expect(lines[2]).toBe(`${piTheme().fg("accent", piTheme().bold("Models"))}${piTheme().fg("warning", " (unsaved)")}`);
      expect(rows(dialog)[1]).toBe("→ ● gpt-5 [openai] ✓");
      expect(text(dialog)).not.toMatch(/Esc close\n.*unsaved/u);
      dialog.handleInput(TAB);
      expect(dialog.filter).toBe("scoped");
      expect(stripTerminalSequences(dialog.render(200)[3]!)).toBe("Filter: all | scoped");
      expect(rows(dialog)).toEqual(["→ ● gpt-5 [openai] ✓"]);
      dialog.handleInput(SPACE);
      expect(callbacks.onScopeChange).toHaveBeenLastCalledWith([]);
      expect(dialog.dirty).toBe(false);
      expect(text(dialog)).toContain("  No scoped models");
      dialog.handleInput(TAB);
      expect(dialog.filter).toBe("all");
      expect(dialog.selectedModelId).toBe(ids.gpt5);
    });
  });

  it("starts from the explicit scope, keeps saved-but-removed rows reachable in the scoped filter, and preserves order", () => {
    withDialog((dialog, callbacks) => {
      expect(dialog.dirty).toBe(false);
      dialog.handleInput(TAB);
      expect(rows(dialog)).toEqual(["  ● claude [anthropic]", "→ ● gpt-5 [openai] ✓"]);
      dialog.handleInput(SPACE);
      expect(callbacks.onScopeChange).toHaveBeenLastCalledWith([ids.claude]);
      expect(rows(dialog)).toEqual(["  ● claude [anthropic]", "→ ○ gpt-5 [openai] ✓"]);
      expect(dialog.dirty).toBe(true);
      dialog.handleInput(SPACE);
      expect(callbacks.onScopeChange).toHaveBeenLastCalledWith([ids.claude, ids.gpt5]);
      expect(dialog.dirty).toBe(false);
    }, { scopeIds: [ids.claude, ids.gpt5], savedScopeIds: [ids.claude, ids.gpt5] });
  });

  it("clears the dirty state only after a successful save and keeps it after a failed one", async () => {
    await withDialog(async (dialog, callbacks) => {
      let resolveSave!: () => void;
      callbacks.onSave.mockImplementationOnce(() => new Promise<void>(resolve => { resolveSave = resolve; }));
      dialog.handleInput(SPACE);
      dialog.handleInput(CTRL_S);
      expect(callbacks.onSave).toHaveBeenCalledExactlyOnceWith([ids.gpt5]);
      expect(dialog.dirty).toBe(true);
      dialog.handleInput(DOWN);
      dialog.handleInput(SPACE);
      expect(dialog.scopeIds).toEqual([ids.gpt5, ids.mini]);
      resolveSave();
      await settled();
      expect(callbacks.requestRender).toHaveBeenCalled();
      // Invariant: the baseline is the snapshot that persisted, so the later edit stays unsaved.
      expect(dialog.dirty).toBe(true);
      dialog.handleInput(SPACE);
      expect(dialog.scopeIds).toEqual([ids.gpt5]);
      expect(dialog.dirty).toBe(false);
      expect(text(dialog)).not.toContain("(unsaved)");

      callbacks.onSave.mockImplementationOnce(async () => { throw new Error("disk full"); });
      dialog.handleInput(SPACE);
      dialog.handleInput(CTRL_S);
      await settled();
      expect(callbacks.onSave).toHaveBeenCalledTimes(2);
      expect(dialog.dirty).toBe(true);
      expect(text(dialog)).toContain("Models (unsaved)");

      callbacks.onSave.mockImplementationOnce(() => { throw new Error("sync failure"); });
      dialog.handleInput(CTRL_S);
      await settled();
      expect(dialog.dirty).toBe(true);
      dialog.dispose();
      callbacks.requestRender.mockClear();
      dialog.handleInput(CTRL_S);
      await settled();
      expect(callbacks.requestRender).not.toHaveBeenCalled();
    });
  });

  it("closes silently on Escape and never saves as a side effect of cancel or selection", () => {
    withDialog((dialog, callbacks) => {
      dialog.handleInput(SPACE);
      dialog.handleInput(ENTER);
      dialog.handleInput(ESCAPE);
      expect(callbacks.onSelect).toHaveBeenCalledOnce();
      expect(callbacks.onCancel).toHaveBeenCalledOnce();
      expect(callbacks.onSave).not.toHaveBeenCalled();
      expect(callbacks.onScopeChange).toHaveBeenCalledOnce();
    });
  });

  it("keeps query, selection, scope edits, and dirty state across catalog refresh and reports the bounded outcome", () => {
    withDialog((dialog, callbacks) => {
      for (const character of "gpt") dialog.handleInput(character);
      dialog.handleInput(DOWN);
      dialog.handleInput(SPACE);
      expect(dialog.selectedModelId).toBe(ids.mini);
      expect(text(dialog)).toContain("  Refreshing model catalogs…");
      dialog.updateModels([...models, { provider: "google", id: "gemini", name: "Gemini" }]);
      dialog.setRefreshStatus("Model catalogs refreshed.", "success");
      expect(dialog.query).toBe("gpt");
      expect(dialog.selectedModelId).toBe(ids.mini);
      expect(dialog.scopeIds).toEqual([ids.mini]);
      expect(dialog.dirty).toBe(true);
      expect(dialog.render(200).some(line => line.includes(piTheme().fg("success", "  Model catalogs refreshed.")))).toBe(true);
      dialog.updateModels([models[0]!]);
      dialog.setRefreshStatus("Model refresh timed out; showing cached models.", "warning");
      expect(dialog.selectedModelId).toBe(ids.gpt5);
      expect(dialog.scopeIds).toEqual([ids.mini]);
      expect(dialog.dirty).toBe(true);
      expect(dialog.render(200).some(line => line.includes(piTheme().fg("warning", "  Model refresh timed out; showing cached models.")))).toBe(true);
      expect(callbacks.onSelect).not.toHaveBeenCalled();
    }, { refreshStatus: "Refreshing model catalogs…" });
  });

  it("keeps bulk, provider, and reorder scope actions on their effective bindings", () => {
    withDialog((dialog, callbacks) => {
      dialog.handleInput("\u0001");
      expect(callbacks.onScopeChange).toHaveBeenLastCalledWith([ids.claude, ids.gpt5, ids.mini]);
      dialog.handleInput("\u0018");
      expect(callbacks.onScopeChange).toHaveBeenLastCalledWith([]);
      dialog.handleInput("\u0010");
      expect(callbacks.onScopeChange).toHaveBeenLastCalledWith([ids.gpt5, ids.mini]);
      dialog.handleInput("\u0010");
      expect(callbacks.onScopeChange).toHaveBeenLastCalledWith([]);
      dialog.handleInput("\u0001");
      dialog.handleInput(TAB);
      expect(rows(dialog)).toEqual(["  ● claude [anthropic]", "→ ● gpt-5 [openai] ✓", "  ● gpt-5-mini [openai]"]);
      dialog.handleInput("\u001b[1;3A");
      expect(callbacks.onScopeChange).toHaveBeenLastCalledWith([ids.gpt5, ids.claude, ids.mini]);
      expect(rows(dialog)).toEqual(["→ ● gpt-5 [openai] ✓", "  ● claude [anthropic]", "  ● gpt-5-mini [openai]"]);
      dialog.handleInput("\u001b[1;3A");
      expect(callbacks.onScopeChange).toHaveBeenCalledTimes(6);
      dialog.handleInput("\u001b[1;3B");
      expect(callbacks.onScopeChange).toHaveBeenLastCalledWith([ids.claude, ids.gpt5, ids.mini]);
      for (const character of "gpt") dialog.handleInput(character);
      dialog.handleInput("\u0018");
      expect(callbacks.onScopeChange).toHaveBeenLastCalledWith([ids.claude]);
    });
  });

  it("shows an empty catalog as a login hint rather than an empty frame", () => {
    withDialog(dialog => {
      expect(text(dialog)).toContain("  No models available. Use /login to add providers.");
      expect(text(dialog)).not.toContain("Model Name");
      dialog.handleInput(ENTER);
      dialog.handleInput(SPACE);
    }, { models: [], activeModelId: null });
  });

  for (const platform of ["darwin", "win32", "linux"] as const) {
    it(`labels custom and unbound save hints on ${platform} without changing logical keys`, () => {
      const alt = platform === "darwin" ? "Option" : "Alt";
      withDialog((dialog, callbacks, keys) => {
        expect(text(dialog)).toContain(`  ${alt}+S/Ctrl+S save  Esc close`);
        expect(keys.getKeys("app.models.save")).toEqual(["alt+s", "ctrl+s"]);
        dialog.handleInput(SPACE);
        dialog.handleInput("\u001bs");
        expect(callbacks.onSave).toHaveBeenCalledExactlyOnceWith([ids.gpt5]);
      }, {}, { "app.models.save": ["alt+s", "ctrl+s"] }, platform);
      withDialog((dialog, callbacks) => {
        expect(text(dialog)).toContain("  Space scope  Esc close");
        expect(text(dialog)).not.toContain(" save  Esc close");
        dialog.handleInput(SPACE);
        dialog.handleInput(CTRL_S);
        expect(callbacks.onSave).not.toHaveBeenCalled();
        expect(dialog.dirty).toBe(true);
      }, {}, { "app.models.save": [] }, platform);
    });
  }
});

it("restores the platform and binding owner after a failing assertion", () => {
  const platform = Object.getOwnPropertyDescriptor(process, "platform");
  const keys = getKeybindings();
  expect(() => withDialog(() => { throw new Error("fixture failure"); })).toThrow("fixture failure");
  expect(Object.getOwnPropertyDescriptor(process, "platform")).toEqual(platform);
  expect(getKeybindings()).toBe(keys);
});
