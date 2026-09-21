import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CURSOR_MARKER, stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OwnedUiSessionViewModel, OwnedUiThinkingLevel } from "../../../../src/contracts/owned-ui/index.js";
import { LineInput, PromptInput, promptRule, renderInputRow } from "../../../../src/ui/components/index.js";
import { applyPiTheme, createPiShellEditor, createPiShellFooter, createPiShellHeader, createPiShellHotkeys, piTheme, PINNED_PI_BUILTIN_SLASH_COMMANDS } from "../../../../src/integrations/pi/components/index.js";
import { createPiShellThinkingSelector } from "../../../../src/integrations/pi/components/thinking-selector-dialog.js";
import { KeybindingsManager } from "../../../../src/integrations/pi/components/upstream/adjacent/core/keybindings.js";
import { cellStyle } from "../../../support/ansi-cell-style.js";
import { promptInputPresentation } from "../../../support/prompt-input-presentation.js";

const LEVELS: readonly OwnedUiThinkingLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh"];
const directories: string[] = [];
afterEach(async () => { for (const path of directories.splice(0)) await rm(path, { recursive: true, force: true }); });

async function agentDir(bindings: Record<string, string | string[]> = {}): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "a1-input-ux-"));
  directories.push(path);
  await writeFile(join(path, "keybindings.json"), JSON.stringify(bindings));
  return path;
}

function view(): OwnedUiSessionViewModel {
  return {
    contractVersion: 1, sessionId: "session", revision: 1, lifecycle: "ready", transcript: [],
    editor: { text: "", queuedSubmissions: [], selection: null, cursorOffset: 0, historyRevision: 0, submitEnabled: true },
    status: {
      title: "A1", workingMessage: null, diagnostics: [], badges: [],
      usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, latestCacheHitRate: null,
        contextTokens: 0, contextWindow: 0, contextPercent: 0, usingSubscription: false, autoCompactEnabled: false },
      footer: { branch: null, sessionName: null, extensionStatuses: [], availableProviderCount: 2 },
    },
    terminal: { columns: 80, rows: 24, focusedRegion: "editor", hardwareCursor: false },
    activeModel: { providerId: "PROVIDER", modelId: "MODEL", displayName: "Model" }, thinkingLevel: "medium",
    activeCommandIds: [], dialog: null, overlay: null, customizations: [], diagnostics: [],
  };
}

async function editor(profile: "a1" | "pi" = "a1", bindings: Record<string, string | string[]> = {}) {
  const cycle = vi.fn();
  const select = vi.fn();
  const submit = vi.fn();
  const copy = vi.fn();
  const input = createPiShellEditor({
    agentDir: await agentDir(bindings), keybindingProfile: profile,
    getColumns: () => 80, getRows: () => 24, requestRender() {}, onSubmit: submit,
    onThinkingCycle: cycle, onModelSelect: select, onCopyText: copy,
    promptPresentation: promptInputPresentation(),
  });
  input.setFocused?.(true);
  return { input, cycle, select, submit, copy };
}

describe("owned shared input and status presentation", () => {
  it.each(["dark", "light"] as const)("matches search and submitted-prefix foreground in %s", async themeName => {
    applyPiTheme(themeName, false, "truecolor");
    const { input, submit } = await editor();
    const compose = vi.spyOn(PromptInput.prototype, "render");
    try {
      input.setPromptSuggestion("Search settings");
      const ghost = input.render(40);
      const search = renderInputRow(new LineInput(), 40, { placeholder: "Search settings", theme: piTheme() }).lines;
      expect(compose).toHaveBeenCalledTimes(2);
      expect(ghost[0]).toBe(search[0]);
      expect(ghost.at(-1)).toBe(search.at(-1));
      const expected = cellStyle(piTheme().fg("muted", "❯"), "❯");
      expect(cellStyle(ghost[1]!, "❯")).toEqual(expected);
      expect(cellStyle(search[1]!, "❯")).toEqual(expected);
      expect(expected.faint).toBe(false);
      expect(ghost[1]).toContain(CURSOR_MARKER);
      expect(input.getText()).toBe("");
      input.handleInput?.("\r");
      expect(submit).not.toHaveBeenCalled();
      input.setText("draft 日本語\nsecond line");
      for (const width of [2, 3, 12, 40, 80]) {
        const rows = input.render(width);
        expect(rows.every(row => visibleWidth(row) <= width)).toBe(true);
        expect(rows[0]).toContain("\u001b[38;2;154;160;166m");
        expect(rows.at(-1)).toContain("\u001b[38;2;154;160;166m");
      }
      expect(input.getText()).toBe("draft 日本語\nsecond line");
    } finally { compose.mockRestore(); }
  });

  it("keeps owned rules neutral across every level and bash mode while preserving pinned borders", async () => {
    applyPiTheme("dark", false, "truecolor");
    const owned = await editor();
    const pinned = await editor("pi");
    for (const level of LEVELS) {
      owned.input.setThinkingLevel(level);
      pinned.input.setThinkingLevel(level);
      expect(cellStyle(owned.input.render(40)[0]!, "─")).toEqual(cellStyle(promptRule(40), "─"));
      // Rationale: pinned 0.85.1 colors the whole rule in one span rather than one dash at a time.
      if (level !== "off") expect(pinned.input.render(40)[0]).toContain(piTheme().getThinkingBorderColor(level)("─".repeat(40)));
    }
    owned.input.setText("!pwd");
    pinned.input.setText("!pwd");
    expect(cellStyle(owned.input.render(40)[0]!, "─")).toEqual(cellStyle(promptRule(40), "─"));
    expect(pinned.input.render(40)[0]).toContain(piTheme().getBashModeBorderColor()("─".repeat(40)));
    expect(stripTerminalSequences(pinned.input.render(40).join("\n"))).not.toContain("❯");
    owned.input.setText("normal");
    expect(cellStyle(owned.input.render(40)[0]!, "─")).toEqual(cellStyle(promptRule(40), "─"));
  });

  it("keeps pointer selection aligned with the shared content inset and never copies chrome", async () => {
    const { input, copy } = await editor();
    input.setText("hello world");
    input.render(40);
    input.handlePointer?.({ kind: "press", button: 0, column: 3, row: 2 });
    input.handlePointer?.({ kind: "motion", button: 0, column: 8, row: 2 });
    input.handlePointer?.({ kind: "release", button: 0, column: 8, row: 2 });
    expect(input.hasSelection()).toBe(true);
    input.handleInput?.("\u0003");
    expect(copy).toHaveBeenCalledWith("hello");
    expect(input.getText()).toBe("hello world");
  });

  it.each(["dark", "light"] as const)("colors only the effective level span in the %s footer", themeName => {
    applyPiTheme(themeName, false, "truecolor");
    const state = view();
    const footer = createPiShellFooter(state, "/WORK", "a1");
    for (const level of LEVELS) {
      footer.update({ ...state, thinkingLevel: level });
      const row = footer.render(100)[1]!;
      expect(stripTerminalSequences(row)).toContain(`(PROVIDER) MODEL • ${level}`);
      expect(cellStyle(row, level[0]!)).toEqual(cellStyle(piTheme().getThinkingBorderColor(level)(level), level[0]!));
      for (const character of ["P", "M", "•"]) expect(cellStyle(row, character)).toEqual(cellStyle(piTheme().fg("dim", character), character));
      for (const width of [1, 12, 20, 30, 80]) expect(footer.render(width).every(line => visibleWidth(line) <= width)).toBe(true);
    }
    footer.update({ ...state, activeModel: null, thinkingLevel: "off" });
    expect(stripTerminalSequences(footer.render(100)[1]!)).toContain("no-model");
    expect(stripTerminalSequences(footer.render(100)[1]!)).not.toContain(" • ");
    footer.update({ ...state, thinkingLevel: "low", activeModel: { ...state.activeModel!, modelId: "RESTORED" } });
    expect(stripTerminalSequences(footer.render(100)[1]!)).toContain("RESTORED • low");
    const pinned = createPiShellFooter({ ...state, thinkingLevel: "off" }, "/WORK");
    expect(stripTerminalSequences(pinned.render(100)[1]!)).not.toContain(" • off");
    pinned.update({ ...state, thinkingLevel: "high" });
    expect(cellStyle(pinned.render(100)[1]!, "h")).toEqual(cellStyle(piTheme().fg("dim", "h"), "h"));
    const levelHidden = createPiShellFooter(state, "/WORK", "a1", () => false);
    expect(stripTerminalSequences(levelHidden.render(100)[1]!)).toContain("(PROVIDER) MODEL");
    expect(stripTerminalSequences(levelHidden.render(100)[1]!)).not.toContain(" • medium");
  });
});

describe("owned level and model keybindings", () => {
  it("renders the bare thinking selector with the resolved cycle key and bold accent heading", async () => {
    const { input } = await editor();
    const selected = vi.fn();
    const saved = vi.fn();
    const canceled = vi.fn();
    const cycleBinding = input.keybindingConfig()["app.thinking.cycle"] ?? [];
    const selector = createPiShellThinkingSelector(
      "medium",
      ["off", "minimal", "low", "medium", "high", "medium"],
      selected,
      canceled,
      saved,
      "medium",
      { profile: "bare", cycleBinding },
    );
    selector.setFocused?.(true);
    const rows = selector.render(100);
    const plain = rows.map(stripTerminalSequences).join("\n");
    expect(plain).toContain("Ctrl+L cycles thinking levels in-session");
    expect(plain).not.toContain("Shift+Tab");
    const headingIndex = rows.findIndex(row => stripTerminalSequences(row).includes("Thinking Level"));
    const hintIndex = rows.findIndex(row => stripTerminalSequences(row).includes("Ctrl+L cycles thinking levels in-session"));
    const heading = rows[headingIndex]!;
    const hint = rows[hintIndex]!;
    expect(hintIndex).toBe(headingIndex + 1);
    expect(cellStyle(heading, "T")).toEqual(cellStyle(piTheme().fg("accent", piTheme().bold("T")), "T"));
    expect(cellStyle(hint, "C")).toEqual(cellStyle(piTheme().fg("muted", "C"), "C"));
    const selectedRow = rows.find(row => stripTerminalSequences(row).includes("Moderate reasoning"))!;
    const unselectedRow = rows.find(row => stripTerminalSequences(row).includes("Light reasoning"))!;
    expect(stripTerminalSequences(selectedRow)).toContain("→ medium ✓ Moderate reasoning (~8k tokens) · default");
    const descriptionColumns = ["No reasoning", "Very brief reasoning", "Light reasoning", "Moderate reasoning", "Deep reasoning"]
      .map(description => rows.map(stripTerminalSequences).find(row => row.includes(description))!.indexOf(description));
    expect(new Set(descriptionColumns).size).toBe(1);
    expect(cellStyle(selectedRow, "m")).toEqual(cellStyle(piTheme().fg("accent", "m"), "m"));
    expect(cellStyle(selectedRow, "M")).toEqual(cellStyle(piTheme().fg("muted", "M"), "M"));
    expect(cellStyle(unselectedRow, "L")).toEqual(cellStyle(piTheme().fg("muted", "L"), "L"));
    expect(cellStyle(selectedRow, "✓")).toEqual(cellStyle(piTheme().fg("success", "✓"), "✓"));
    expect(rows.filter(row => stripTerminalSequences(row).includes("Moderate reasoning"))).toHaveLength(1);

    selector.handleInput?.("low");
    selector.handleInput?.("\r");
    expect(selected).toHaveBeenCalledWith("low");

    const custom = createPiShellThinkingSelector(
      "high",
      ["low", "high"],
      selected,
      canceled,
      saved,
      "low",
      { profile: "bare", cycleBinding: "alt+r" },
    );
    expect(custom.render(100).map(stripTerminalSequences).join("\n"))
      .toContain(`${process.platform === "darwin" ? "Option" : "Alt"}+R cycles thinking levels in-session`);
    custom.handleInput?.("\x13");
    expect(saved).toHaveBeenCalledWith("high");
    custom.handleInput?.("\x1b");
    expect(canceled).toHaveBeenCalledOnce();
  });

  it.each(["\u000c", "\u001b[108;5u", "\u001b[27;5;108~"])("cycles once without opening model selection for %j", async key => {
    const { input, cycle, select } = await editor();
    input.setText("draft");
    input.handleInput?.(key);
    expect(cycle).toHaveBeenCalledOnce();
    expect(select).not.toHaveBeenCalled();
    expect(input.getText()).toBe("draft");
    expect(input.keybindingConfig()["app.model.select"]).toEqual([]);
    expect(input.keybindingConfig()["app.thinking.cycle"]).toBe("ctrl+l");
    expect(PINNED_PI_BUILTIN_SLASH_COMMANDS.find(command => command.name === "model")).toBeDefined();
  });

  it.each(["\u001b[Z", "\u001b[9;2u", "\u001b[27;2;9~"])("leaves reverse Tab %j unassigned and inert for drafts and suggestions", async key => {
    const { input, cycle, select, copy } = await editor();
    for (const text of ["", "draft", "/mo"]) {
      input.setText(text);
      if (text === "") input.setPromptSuggestion("run the tests");
      const before = input.render(60);
      input.handleInput?.(key);
      expect(input.render(60)).toEqual(before);
      expect(input.getText()).toBe(text);
    }
    input.setText("selected");
    input.handleInput?.("\u0001");
    expect(input.hasSelection()).toBe(true);
    input.handleInput?.(key);
    expect(input.hasSelection()).toBe(true);
    input.handleInput?.("\u0003");
    expect(copy).toHaveBeenCalledWith("selected");
    expect(cycle).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
  });

  it("preserves explicit overrides, local declarations and pinned defaults", async () => {
    const custom = await editor("a1", { "app.thinking.cycle": "shift+tab", "app.model.select": "ctrl+m" });
    custom.input.handleInput?.("\u001b[Z");
    custom.input.handleInput?.("\u001b[109;5u");
    expect(custom.cycle).toHaveBeenCalledOnce();
    expect(custom.select).toHaveBeenCalledOnce();
    const ownedKeys = KeybindingsManager.fromOwnedBindings();
    expect(ownedKeys.getKeys("app.tree.filter.labeledOnly")).toEqual(["ctrl+l"]);
    expect(ownedKeys.getConflicts().some(conflict => conflict.keybindings.includes("app.model.select"))).toBe(false);
    const pinned = await editor("pi");
    pinned.input.handleInput?.("\u001b[Z");
    pinned.input.handleInput?.("\u000c");
    expect(pinned.cycle).toHaveBeenCalledOnce();
    expect(pinned.select).toHaveBeenCalledOnce();
  });

  it("derives startup and shortcut help from live resolved bindings", () => {
    let keys = KeybindingsManager.fromOwnedBindings();
    const header = createPiShellHeader({ expanded: true, getKeybindings: () => keys.getEffectiveConfig() });
    let lines = header.render(100).map(stripTerminalSequences);
    expect(lines.find(line => line.includes("to cycle thinking level"))).toContain("ctrl+l");
    expect(lines.find(line => line.includes("to select model"))).toContain("/models");
    expect(lines.join("\n")).not.toContain("shift+tab");
    const hotkeys = stripTerminalSequences(createPiShellHotkeys(undefined, undefined, "a1").render(120).join("\n"));
    expect(hotkeys).toContain("Ctrl+L");
    expect(hotkeys).toContain("Unbound (/models)");
    expect(hotkeys).toContain("Models dialog");
    expect(hotkeys).toContain("Reorder the cycling scope");
    expect(stripTerminalSequences(createPiShellHotkeys(undefined, undefined, "pi").render(120).join("\n"))).not.toContain("Models dialog");
    expect(hotkeys).not.toContain("Shift+Tab");
    keys = KeybindingsManager.fromOwnedBindings({ "app.thinking.cycle": "ctrl+r", "app.model.select": "alt+m" });
    lines = header.render(100).map(stripTerminalSequences);
    expect(lines.find(line => line.includes("to cycle thinking level"))).toContain("ctrl+r");
    expect(keys.getKeys("app.model.select")).toEqual(["alt+m"]);
    expect(lines.find(line => line.includes("to select model"))).toContain(process.platform === "darwin" ? "option+m" : "alt+m");
    const pinned = createPiShellHeader({ expanded: true }).render(100).map(stripTerminalSequences);
    expect(pinned.find(line => line.includes("to cycle thinking level"))).toContain("shift+tab");
    expect(pinned.find(line => line.includes("to select model"))).toContain("ctrl+l");
  });
});
