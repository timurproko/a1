import { describe, expect, it, vi } from "vitest";
import { getKeybindings, setKeybindings, stripTerminalSequences } from "@earendil-works/pi-tui";
import { applyPiTheme, applyPiThemeInstance, piTheme } from "../../../../src/integrations/pi/components/index.js";
import { KeybindingsManager, type KeybindingsConfig } from "../../../../src/integrations/pi/components/upstream/adjacent/core/keybindings.js";
import { ModelsDialogComponent, type ModelsDialogConfig } from "../../../../src/integrations/pi/components/models-dialog.js";
import { firstVisibleTextColumn } from "../../../support/dialog-alignment.js";
import { cellBackgroundAt, cellStyle } from "../../../support/ansi-cell-style.js";
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
const REVERSE_TABS = ["\u001b[Z", "\u001b[9;2u", "\u001b[27;2;9~"] as const;
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
  return dialog.render(width).map(line => stripTerminalSequences(line).trimEnd()).filter(line => /^ (?:(?:→ |  )[●○] )/u.test(line));
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
      expect(stripped[1]).toBe(" Models");
      expect(stripped[2]).toBe(" Filter: all | scoped");
      expect(lines[2]).toContain(piTheme().fg("mdHeading", "all"));
      expect(lines[2]).not.toContain(piTheme().fg("accent", "all"));
      expect(rows(dialog)).toEqual([
        "   ○ claude [anthropic]",
        " → ○ gpt-5 [openai] ✓",
        "   ○ gpt-5-mini [openai]",
      ]);
      const active = lines.find(line => stripTerminalSequences(line).startsWith(" → "))!;
      expect(active).toContain(`${piTheme().fg("muted", "[openai]")} ${piTheme().fg("success", "✓")}`);
      expect(active).toContain(piTheme().fg("dim", "○"));
      expect(active).toContain(piTheme().fg("accent", "→ "));
      expect(active).toContain(piTheme().fg("text", "gpt-5"));
      const activeText = stripTerminalSequences(active);
      expect(activeText).toBe(" → ○ gpt-5 [openai] ✓");
      const selectionBackground = cellBackgroundAt(piTheme().bg("selectedBg", "x"), 0);
      expect(cellBackgroundAt(active, 1)).toBe(selectionBackground);
      expect(cellBackgroundAt(active, activeText.length - 1)).toBe(selectionBackground);
      expect(cellStyle(active, "→")).toEqual(cellStyle(piTheme().fg("accent", "→"), "→"));
      expect(cellStyle(active, "g")).toEqual(cellStyle(piTheme().fg("text", "g"), "g"));
      expect(cellStyle(active, "[")).toEqual(cellStyle(piTheme().fg("muted", "["), "["));
      expect(active).not.toContain("\u001b[1m");
      expect(stripped).toContain("   Model Name: GPT-5");
      expect(stripped.at(-2)).toBe(" Type search  ↑↓ navigate  Tab filter  Enter switch  Space scope  Ctrl+S save  Esc close");
      const footer = lines.at(-2)!;
      expect(firstVisibleTextColumn(footer)).toBe(firstVisibleTextColumn(lines[1]!));
      expect(footer).toContain(piTheme().fg("dim", "Type"));
      expect(footer).toContain(piTheme().fg("muted", "search"));
      expect(firstVisibleTextColumn(stripped.find(line => line.includes("○ claude"))!)).toBe(3);
      expect(footer).toContain(piTheme().fg("dim", "↑↓"));
      expect(footer).toContain(piTheme().fg("muted", "navigate"));
      expect(footer).not.toMatch(/[·•]/u);
      expect(stripped).not.toContain("(unsaved)");
      expect(dialog.selectedModelId).toBe(ids.gpt5);
    });
  });

  it("uses the secondary accent for filled scope markers independently of row focus", () => {
    withDialog(dialog => {
      const lines = dialog.render(200);
      const unselectedScoped = lines.find(line => stripTerminalSequences(line).includes("● claude"))!;
      const selectedScoped = lines.find(line => stripTerminalSequences(line).includes("● gpt-5 "))!;
      const unselectedEmpty = lines.find(line => stripTerminalSequences(line).includes("○ gpt-5-mini"))!;

      const secondaryMarker = cellStyle(piTheme().style("●", { fg: "mdHeading", dim: true }), "●");
      expect(cellStyle(unselectedScoped, "●")).toEqual(secondaryMarker);
      expect(cellStyle(selectedScoped, "●")).toEqual(secondaryMarker);
      expect(cellStyle(unselectedScoped, "●").foreground).toBe(cellStyle(lines[2]!, "a").foreground);
      expect(cellStyle(unselectedScoped, "●").faint).toBe(true);
      expect(cellStyle(lines[2]!, "a").faint).toBe(false);
      expect(cellStyle(unselectedEmpty, "○")).toEqual(cellStyle(piTheme().fg("dim", "○"), "○"));
      expect(cellStyle(selectedScoped, "✓")).toEqual(cellStyle(piTheme().fg("success", "✓"), "✓"));
    }, { scopeIds: [ids.claude, ids.gpt5], savedScopeIds: [ids.claude, ids.gpt5] });
  });

  it("truncates every row to the width and keeps narrow frames free of wrapped fragments", () => {
    withDialog(dialog => {
      for (const width of [28, 12]) {
        const rendered = dialog.render(width);
        for (const line of rendered) expect(stripTerminalSequences(line).length).toBeLessThanOrEqual(width);
        expect(stripTerminalSequences(rendered.join("\n"))).toContain("Esc close");
      }
      expect(rows(dialog, 28)).toEqual(["   ○ claude [anthropic]", " → ○ gpt-5 [openai] ✓", "   ○ gpt-5-mini [openai]"]);
    });
  });

  it("filters by search, retains surviving selection, and closes immediately on Ctrl+C", () => {
    withDialog((dialog, callbacks) => {
      for (const character of "mini") dialog.handleInput(character);
      expect(rows(dialog)).toEqual([" → ○ gpt-5-mini [openai]"]);
      expect(dialog.selectedModelId).toBe(ids.mini);
      for (let index = 0; index < 4; index += 1) dialog.handleInput("\u007f");
      expect(rows(dialog)).toHaveLength(3);
      for (const character of "nothing here") dialog.handleInput(character);
      expect(text(dialog)).toContain("  No matching models");
      dialog.handleInput("\u0003");
      expect(callbacks.onCancel).toHaveBeenCalledOnce();
      expect(dialog.query).toBe("nothinghere");
      expect(callbacks.onSelect).not.toHaveBeenCalled();
    }, { initialQuery: "" });
  });

  it.each(REVERSE_TABS)("cycles the filter backward for reverse Tab %j without advertising it", reverseTab => {
    withDialog(dialog => {
      expect(dialog.filter).toBe("all");
      expect(dialog.query).toBe("gpt");
      expect(dialog.selectedModelId).toBe(ids.gpt5);
      dialog.handleInput(reverseTab);
      expect(dialog.filter).toBe("scoped");
      expect(dialog.query).toBe("gpt");
      expect(dialog.selectedModelId).toBe(ids.gpt5);
      expect(text(dialog)).not.toContain("Shift+Tab");
      dialog.handleInput(TAB);
      expect(dialog.filter).toBe("all");
    }, { scopeIds: [ids.gpt5, ids.mini], initialQuery: "gpt" });
  });

  it("seeds the query from the initial argument and switches only on Enter", () => {
    withDialog((dialog, callbacks) => {
      expect(dialog.query).toBe("gpt");
      expect(rows(dialog)).toEqual([" → ○ gpt-5 [openai] ✓", "   ○ gpt-5-mini [openai]"]);
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
      expect(stripTerminalSequences(lines[1]!)).toBe(" Models (unsaved)");
      expect(lines[1]).toBe(` ${piTheme().fg("accent", piTheme().bold("Models"))}${piTheme().fg("warning", " (unsaved)")}`);
      expect(rows(dialog)[1]).toBe(" → ● gpt-5 [openai] ✓");
      expect(text(dialog)).not.toMatch(/Esc close\n.*unsaved/u);
      dialog.handleInput(TAB);
      expect(dialog.filter).toBe("scoped");
      expect(stripTerminalSequences(dialog.render(200)[2]!)).toBe(" Filter: all | scoped");
      expect(rows(dialog)).toEqual([" → ● gpt-5 [openai] ✓"]);
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
      expect(rows(dialog)).toEqual(["   ● claude [anthropic]", " → ● gpt-5 [openai] ✓"]);
      dialog.handleInput(SPACE);
      expect(callbacks.onScopeChange).toHaveBeenLastCalledWith([ids.claude]);
      expect(rows(dialog)).toEqual(["   ● claude [anthropic]", " → ○ gpt-5 [openai] ✓"]);
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

  it("keeps query, selection, scope edits, and dirty state across catalog refresh and reports the bounded outcome", async () => {
    vi.useFakeTimers();
    try {
      await withDialog(async (dialog, callbacks) => {
        for (const character of "gpt") dialog.handleInput(character);
        dialog.handleInput(DOWN);
        dialog.handleInput(SPACE);
        expect(dialog.selectedModelId).toBe(ids.mini);
        const refreshingLines = dialog.render(200);
        expect(stripTerminalSequences(refreshingLines[1]!)).toBe(" Models (unsaved) (refreshing)");
        expect(refreshingLines[1]).toContain(piTheme().fg("muted", " (refreshing)"));
        expect(text(dialog)).not.toContain("Refreshing model catalogs…");
        dialog.updateModels([...models, { provider: "google", id: "gemini", name: "Gemini" }]);
        dialog.setRefreshStatus("Model catalogs refreshed.", "success");
        expect(dialog.query).toBe("gpt");
        expect(dialog.selectedModelId).toBe(ids.mini);
        expect(dialog.scopeIds).toEqual([ids.mini]);
        expect(dialog.dirty).toBe(true);
        expect(text(dialog)).toContain("Models (unsaved) (refreshing)");
        await vi.advanceTimersByTimeAsync(1_000);
        const refreshedLines = dialog.render(200);
        expect(stripTerminalSequences(refreshedLines[1]!)).toBe(" Models (unsaved) (refreshed)");
        expect(refreshedLines[1]).toContain(piTheme().fg("success", " (refreshed)"));
        expect(text(dialog)).not.toContain("Model catalogs refreshed.");
        dialog.updateModels([models[0]!]);
        dialog.setRefreshStatus("Model refresh timed out; showing cached models.", "warning");
        expect(dialog.selectedModelId).toBe(ids.gpt5);
        expect(dialog.scopeIds).toEqual([ids.mini]);
        expect(dialog.dirty).toBe(true);
        expect(dialog.render(200).some(line => line.includes(piTheme().fg("warning", "  Model refresh timed out; showing cached models.")))).toBe(true);
        expect(text(dialog)).not.toContain("(refreshing)");
        expect(text(dialog)).not.toContain("(refreshed)");
        expect(callbacks.onSelect).not.toHaveBeenCalled();
      }, { refreshStatus: "Refreshing model catalogs…" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("holds refreshing for one second and refreshed for two seconds without late rendering", async () => {
    vi.useFakeTimers();
    try {
      await withDialog(async (dialog, callbacks) => {
        expect(stripTerminalSequences(dialog.render(200)[1]!)).toBe(" Models (refreshing)");
        expect(text(dialog)).not.toContain("Refreshing model catalogs…");
        dialog.setRefreshStatus("Model catalogs refreshed.", "success");
        await vi.advanceTimersByTimeAsync(999);
        expect(stripTerminalSequences(dialog.render(200)[1]!)).toBe(" Models (refreshing)");
        expect(callbacks.requestRender).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);
        expect(stripTerminalSequences(dialog.render(200)[1]!)).toBe(" Models (refreshed)");
        expect(callbacks.requestRender).toHaveBeenCalledOnce();

        callbacks.requestRender.mockClear();
        dialog.handleInput(SPACE);
        await vi.advanceTimersByTimeAsync(1_999);
        expect(text(dialog)).toContain("Models (unsaved) (refreshed)");
        expect(callbacks.requestRender).not.toHaveBeenCalled();
        dialog.setRefreshStatus("Model catalogs refreshed.", "success");
        await vi.advanceTimersByTimeAsync(1);
        expect(text(dialog)).toContain("Models (unsaved) (refreshed)");
        expect(callbacks.requestRender).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1_999);
        expect(text(dialog)).toContain("Models (unsaved)");
        expect(text(dialog)).not.toContain("(refreshed)");
        expect(callbacks.requestRender).toHaveBeenCalledOnce();

        callbacks.requestRender.mockClear();
        dialog.setRefreshStatus("Refreshing model catalogs…", "muted");
        await vi.advanceTimersByTimeAsync(500);
        dialog.setRefreshStatus("Could not refresh model catalogs: offline", "warning");
        await vi.advanceTimersByTimeAsync(499);
        expect(text(dialog)).toContain("Models (unsaved) (refreshing)");
        expect(text(dialog)).not.toContain("Could not refresh model catalogs");
        expect(callbacks.requestRender).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);
        expect(text(dialog)).toContain("  Could not refresh model catalogs: offline");
        expect(text(dialog)).not.toContain("(refreshing)");
        expect(text(dialog)).not.toContain("(refreshed)");
        expect(callbacks.requestRender).toHaveBeenCalledOnce();

        callbacks.requestRender.mockClear();
        dialog.setRefreshStatus("Refreshing model catalogs…", "muted");
        dialog.setRefreshStatus("Model catalogs refreshed.", "success");
        dialog.dispose();
        await vi.advanceTimersByTimeAsync(1_000);
        expect(callbacks.requestRender).not.toHaveBeenCalled();
        expect(text(dialog)).not.toContain("(refreshing)");
        expect(text(dialog)).not.toContain("(refreshed)");
      }, { refreshStatus: "Refreshing model catalogs…" });
    } finally {
      vi.useRealTimers();
    }
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
      expect(rows(dialog)).toEqual(["   ● claude [anthropic]", " → ● gpt-5 [openai] ✓", "   ● gpt-5-mini [openai]"]);
      dialog.handleInput("\u001b[1;3A");
      expect(callbacks.onScopeChange).toHaveBeenLastCalledWith([ids.gpt5, ids.claude, ids.mini]);
      expect(rows(dialog)).toEqual([" → ● gpt-5 [openai] ✓", "   ● claude [anthropic]", "   ● gpt-5-mini [openai]"]);
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
