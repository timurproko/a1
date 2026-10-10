import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CURSOR_MARKER, getKeybindings, stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OwnedUiSessionViewModel, OwnedUiThinkingLevel } from "../../../../src/contracts/owned-ui/index.js";
import { hyperlinkTargetAtColumn, LineInput, PromptInput, promptRule, renderInputRow } from "../../../../src/ui/components/index.js";
import { applyPiTheme, createPiKeybindingsHost, createPiShellEditor, createPiShellFooter, createPiShellHeader, createPiShellHotkeys, piTheme, PINNED_PI_BUILTIN_SLASH_COMMANDS } from "../../../../src/integrations/pi/components/index.js";
import { createPiShellThinkingSelector } from "../../../../src/integrations/pi/components/thinking-selector-dialog.js";
import { KeybindingsManager, useWindowsKeybindings } from "../../../../src/integrations/pi/components/upstream/adjacent/core/keybindings.js";
import { cellBackgroundAt, cellStyle } from "../../../support/ansi-cell-style.js";
import { firstVisibleTextColumn } from "../../../support/dialog-alignment.js";
import { promptInputPresentation } from "../../../support/prompt-input-presentation.js";
import { withPiParityColorMode } from "../../../support/pi-terminal-capabilities.js";

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
  const dequeue = vi.fn();
  const input = createPiShellEditor({
    agentDir: await agentDir(bindings), keybindingProfile: profile,
    getColumns: () => 80, getRows: () => 24, requestRender() {}, onSubmit: submit,
    onThinkingCycle: cycle, onModelSelect: select, onCopyText: copy, onDequeue: dequeue,
    promptPresentation: promptInputPresentation(),
  });
  input.setFocused?.(true);
  return { input, cycle, select, submit, copy, dequeue };
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

  it("links only the PR number in the owned footer and leaves the pinned profile unchanged", () => {
    applyPiTheme("dark", false, "truecolor");
    const state = view();
    const footerState: OwnedUiSessionViewModel = {
      ...state,
      status: {
        ...state.status,
        footer: {
          ...state.status.footer!,
          branch: "feature/show-pr-id-status-bar",
          repositoryPath: "/DELIVERY/WORKTREE/WITH/A/LONG/PATH",
          pullRequest: { number: 540, url: "https://github.com/timurproko/a1/pull/540" },
          sessionName: "footer-test",
        },
      },
    };
    const ownedRow = createPiShellFooter(footerState, "/WORK", "a1").render(120)[0]!;
    const plain = stripTerminalSequences(ownedRow);
    expect(plain).toBe("/DELIVERY/WORKTREE/WITH/A/LONG/PATH (feature/show-pr-id-status-bar) #540 • footer-test");
    const linkColumn = plain.indexOf("#540");
    expect(hyperlinkTargetAtColumn(ownedRow, linkColumn - 1)).toBeUndefined();
    expect(hyperlinkTargetAtColumn(ownedRow, linkColumn)).toBe("https://github.com/timurproko/a1/pull/540");
    expect(hyperlinkTargetAtColumn(ownedRow, linkColumn + 3)).toBe("https://github.com/timurproko/a1/pull/540");
    expect(hyperlinkTargetAtColumn(ownedRow, linkColumn + 4)).toBeUndefined();
    expect(cellStyle(ownedRow, "#")).toEqual(cellStyle(piTheme().fg("mdLink", "#"), "#"));

    const pinnedRow = createPiShellFooter(footerState, "/WORK", "pi").render(120)[0]!;
    expect(stripTerminalSequences(pinnedRow)).toBe("/WORK (feature/show-pr-id-status-bar) • footer-test");
    expect(pinnedRow).not.toContain("\u001b]8;;");

    const truncated = createPiShellFooter(footerState, "/WORK", "a1").render(40)[0]!;
    const truncatedPlain = stripTerminalSequences(truncated);
    expect(visibleWidth(truncated)).toBeLessThanOrEqual(40);
    expect(truncatedPlain).toMatch(/\.\.\. #540$/);
    const truncatedLink = truncatedPlain.indexOf("#540");
    expect(hyperlinkTargetAtColumn(truncated, truncatedLink - 1)).toBeUndefined();
    expect(hyperlinkTargetAtColumn(truncated, truncatedLink)).toBe("https://github.com/timurproko/a1/pull/540");
    expect(hyperlinkTargetAtColumn(truncated, truncatedLink + 3)).toBe("https://github.com/timurproko/a1/pull/540");
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
  it.each([
    ["dark", "truecolor"], ["light", "truecolor"],
    ["dark", "256color"], ["light", "256color"],
  ] as const)("uses the owned %s/%s theme even when host color detection disagrees", (name, mode) => {
    withPiParityColorMode(mode === "truecolor" ? "256color" : "truecolor", () => {
      applyPiTheme(name, false, mode);
      const selector = createPiShellThinkingSelector("medium", ["low", "medium"], vi.fn(), vi.fn(), undefined, "medium",
        { profile: "bare", cycleBinding: "ctrl+l" });
      const assertTheme = () => {
        const rows = selector.render(100);
        const selected = rows.find(row => stripTerminalSequences(row).includes("Moderate reasoning"))!;
        expect(stripTerminalSequences(selected).replace(/\s+/g, " ")).toContain("→ ◉ medium ✓ Moderate reasoning");
        expect(cellStyle(selected, "→")).toEqual(cellStyle(piTheme().fg("accent", "→"), "→"));
        expect(cellStyle(selected, "m")).toEqual(cellStyle(piTheme().fg("text", "m"), "m"));
        expect(cellStyle(selected, "M")).toEqual(cellStyle(piTheme().fg("muted", "M"), "M"));
        expect(cellStyle(selected, "✓")).toEqual(cellStyle(piTheme().fg("success", "✓"), "✓"));
        expect(cellStyle(selected, "◉")).toEqual(cellStyle(piTheme().fg("text", "◉"), "◉"));
        expect(cellStyle(rows[0]!, "─")).toEqual(cellStyle(piTheme().fg("border", "─"), "─"));
      };
      assertTheme();
      selector.handleInput?.("medium");
      assertTheme(); // Invariant: filtering rebuilds the list with the same theme authority.
    });
    applyPiTheme("dark", false, "truecolor");
  });

  it("renders item-adjacent active state with exclusive radio defaults and persists defaults immediately", async () => {
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
    const plainSelectedRow = stripTerminalSequences(selectedRow);
    expect(plainSelectedRow.replace(/\s+/g, " ")).toContain("→ ◉ medium ✓ Moderate reasoning (~8k tokens)");
    expect(plainSelectedRow).toContain("medium ✓");
    expect(rows.filter(row => stripTerminalSequences(row).includes("◉"))).toHaveLength(1);
    expect(plain).not.toContain("[default]");
    expect(plain).not.toContain("●");
    const descriptions = ["No reasoning", "Very brief reasoning", "Light reasoning", "Moderate reasoning", "Deep reasoning"];
    const descriptionColumns = descriptions
      .map(description => rows.map(stripTerminalSequences).find(row => row.includes(description))!.indexOf(description));
    expect(new Set(descriptionColumns).size).toBe(1);
    const defaultMarkerColumns = (["off", "minimal", "low", "medium", "high"] as const).map(defaultLevel => {
      const candidate = createPiShellThinkingSelector(
        "medium",
        ["off", "minimal", "low", "medium", "high"],
        vi.fn(),
        vi.fn(),
        vi.fn(),
        defaultLevel,
        { profile: "bare", cycleBinding },
      );
      const defaultRow = candidate.render(100).map(stripTerminalSequences).find(row => row.includes("◉"))!;
      return defaultRow.indexOf("◉");
    });
    expect(new Set(defaultMarkerColumns).size).toBe(1);
    for (const activeLevel of ["high", "minimal"] as const) {
      const candidate = createPiShellThinkingSelector(
        activeLevel,
        ["off", "minimal", "low", "medium", "high"],
        vi.fn(),
        vi.fn(),
        vi.fn(),
        "off",
        { profile: "bare", cycleBinding },
      );
      const candidateRows = candidate.render(100).map(stripTerminalSequences);
      const activeRow = candidateRows.find(row => row.includes("✓"))!;
      expect(activeRow.indexOf("✓")).toBe(activeRow.indexOf(activeLevel) + activeLevel.length + 1);
      const defaultRow = candidateRows.find(row => row.includes("◉"))!;
      expect(defaultRow.indexOf("◉")).toBe(defaultMarkerColumns[0]);
      const candidateDescriptionColumns = descriptions
        .map(description => candidateRows.find(row => row.includes(description))!.indexOf(description));
      expect(candidateDescriptionColumns).toEqual(descriptionColumns);
    }
    expect(cellStyle(selectedRow, "→")).toEqual(cellStyle(piTheme().fg("accent", "→"), "→"));
    expect(cellStyle(selectedRow, "m")).toEqual(cellStyle(piTheme().fg("text", "m"), "m"));
    expect(cellStyle(selectedRow, "M")).toEqual(cellStyle(piTheme().fg("muted", "M"), "M"));
    expect(cellStyle(unselectedRow, "L")).toEqual(cellStyle(piTheme().fg("muted", "L"), "L"));
    const selectedText = stripTerminalSequences(selectedRow);
    expect(selectedText.endsWith("Moderate reasoning (~8k tokens)")).toBe(true);
    expect(selectedText).toBe(selectedText.trimEnd());
    const selectionBackground = cellBackgroundAt(piTheme().bg("selectedBg", "x"), 0);
    expect(cellBackgroundAt(selectedRow, 1)).toBe(selectionBackground);
    expect(cellBackgroundAt(selectedRow, selectedText.length - 1)).toBe(selectionBackground);
    expect(selectedRow).not.toContain("\u001b[1m");
    expect(cellStyle(selectedRow, "✓")).toEqual(cellStyle(piTheme().fg("success", "✓"), "✓"));
    expect(cellStyle(selectedRow, "◉")).toEqual(cellStyle(piTheme().fg("text", "◉"), "◉"));
    expect(cellStyle(unselectedRow, "○")).toEqual(cellStyle(piTheme().fg("dim", "○"), "○"));
    expect(rows.filter(row => stripTerminalSequences(row).includes("Moderate reasoning"))).toHaveLength(1);
    const controls = rows.find(row => stripTerminalSequences(row).includes("Enter select"))!;
    expect(stripTerminalSequences(controls).trim()).toBe("Type search  Enter select  Space default  Esc close");
    expect(stripTerminalSequences(controls)).not.toContain("Ctrl+S");
    expect(stripTerminalSequences(controls)).not.toContain("Escape/Ctrl+C");
    expect(firstVisibleTextColumn(controls)).toBe(firstVisibleTextColumn(heading));
    expect(controls).not.toMatch(/[·•]/u);
    expect(cellStyle(controls, "T")).toEqual(cellStyle(piTheme().fg("dim", "T"), "T"));
    expect(cellStyle(controls, "E")).toEqual(cellStyle(piTheme().fg("dim", "E"), "E"));
    expect(cellStyle(controls, "s")).toEqual(cellStyle(piTheme().fg("muted", "s"), "s"));
    for (const width of [24, 32, 40]) expect(selector.render(width).every(row => visibleWidth(row) <= width)).toBe(true);

    selector.handleInput?.("low");
    selector.handleInput?.(" ");
    expect(saved).toHaveBeenCalledOnce();
    expect(saved).toHaveBeenCalledWith("low");
    const persistedLowRow = selector.render(100).map(stripTerminalSequences)
      .find(row => row.includes("Light reasoning"))!;
    expect(persistedLowRow.replace(/\s+/g, " ")).toContain("◉ low Light reasoning (~2k tokens)");
    expect(persistedLowRow).not.toContain("✓");
    const persistedSelectorRows = selector.render(100).map(stripTerminalSequences);
    expect(persistedSelectorRows.filter(row => row.includes("◉"))).toHaveLength(1);
    expect(persistedSelectorRows.join("\n")).not.toContain("unsaved");
    selector.handleInput?.("\r");
    expect(selected).toHaveBeenCalledWith("low");

    const customSaved = vi.fn();
    const custom = createPiShellThinkingSelector(
      "high",
      ["low", "high"],
      selected,
      canceled,
      customSaved,
      "low",
      { profile: "bare", cycleBinding: "alt+r" },
    );
    const customRows = custom.render(100).map(stripTerminalSequences);
    expect(customRows.join("\n"))
      .toContain(`${process.platform === "darwin" ? "Option" : "Alt"}+R cycles thinking levels in-session`);
    const customActiveRow = customRows.find(row => row.includes("Deep reasoning"))!;
    const customDefaultRow = customRows.find(row => row.includes("Light reasoning"))!;
    expect(customActiveRow.replace(/\s+/g, " ")).toContain("→ ○ high ✓ Deep reasoning (~16k tokens)");
    expect(customActiveRow).not.toContain("◉");
    expect(customDefaultRow.replace(/\s+/g, " ")).toContain("◉ low Light reasoning (~2k tokens)");
    expect(customDefaultRow).not.toContain("✓");
    expect(customActiveRow.indexOf("Deep reasoning")).toBe(customDefaultRow.indexOf("Light reasoning"));
    const initialDefaultColumn = customDefaultRow.indexOf("◉");
    custom.handleInput?.(" ");
    expect(customSaved).toHaveBeenCalledOnce();
    expect(customSaved).toHaveBeenCalledWith("high");
    const persistedRows = custom.render(100).map(stripTerminalSequences);
    const persistedDefaultRow = persistedRows.find(row => row.includes("Deep reasoning"))!;
    expect(persistedDefaultRow.replace(/\s+/g, " "))
      .toContain("→ ◉ high ✓ Deep reasoning (~16k tokens)");
    expect(persistedDefaultRow.indexOf("◉")).toBe(initialDefaultColumn);
    expect(persistedRows.filter(row => row.includes("◉"))).toHaveLength(1);
    expect(persistedRows.find(row => row.includes("Light reasoning"))).toContain("○");
    custom.handleInput?.("\x13");
    expect(customSaved).toHaveBeenCalledOnce();
    custom.handleInput?.("\x03");
    expect(canceled).toHaveBeenCalledOnce();
    custom.handleInput?.("\x1b");
    expect(canceled).toHaveBeenCalledTimes(2);
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

  it("dispatches bare-A1 Alt+Up across platforms while preserving overrides and pinned defaults", async () => {
    const owned = await editor();
    owned.input.setText("draft");
    owned.input.handleInput?.("\u001b[1;3A");
    expect(owned.dequeue).toHaveBeenCalledOnce();
    expect(owned.input.getText()).toBe("draft");
    expect(owned.input.keybindingConfig()["app.message.dequeue"]).toBe("alt+up");

    const custom = await editor("a1", { "app.message.dequeue": "alt+d" });
    custom.input.handleInput?.("\u001b[1;3A");
    expect(custom.dequeue).not.toHaveBeenCalled();
    custom.input.handleInput?.("\u001bd");
    expect(custom.dequeue).toHaveBeenCalledOnce();

    const pinned = await editor("pi");
    expect(pinned.input.keybindingConfig()["app.message.dequeue"])
      .toBe(useWindowsKeybindings() ? "alt+q" : "alt+up");
    pinned.input.handleInput?.("\u001b[1;3A");
    expect(pinned.dequeue).toHaveBeenCalledTimes(useWindowsKeybindings() ? 0 : 1);
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
    const ownedKeys = KeybindingsManager.fromOwnedBindings({ "tui.select.cancel": "alt+x" });
    expect(ownedKeys.getKeys("app.tree.filter.labeledOnly")).toEqual(["ctrl+l"]);
    expect(ownedKeys.getKeys("app.tree.filter.cycleForward")).toEqual(["tab"]);
    expect(ownedKeys.getKeys("tui.select.cancel")).toEqual(["alt+x"]);
    expect(ownedKeys.matches("\u001bx", "tui.select.cancel")).toBe(true);
    expect(ownedKeys.matches("\u0003", "tui.select.cancel")).toBe(true);
    expect(ownedKeys.getConflicts().some(conflict => conflict.keybindings.includes("app.model.select"))).toBe(false);
    expect(ownedKeys.getConflicts().some(conflict => conflict.keybindings.includes("app.message.dequeue"))).toBe(false);
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
    expect(lines.find(line => line.includes("to edit all queued messages")))
      .toContain(process.platform === "darwin" ? "option+up" : "alt+up");
    expect(lines.join("\n")).not.toContain("shift+tab");
    const hotkeys = stripTerminalSequences(createPiShellHotkeys(undefined, undefined, "a1").render(120).join("\n"));
    expect(hotkeys).toContain("Ctrl+L");
    expect(hotkeys).toContain(`${process.platform === "darwin" ? "Option" : "Alt"}+Up`);
    expect(hotkeys).toContain("Unbound (/models)");
    expect(hotkeys).toContain("Models dialog");
    expect(hotkeys).toContain("Reorder the cycling scope");
    expect(stripTerminalSequences(createPiShellHotkeys(undefined, undefined, "pi").render(120).join("\n"))).not.toContain("Models dialog");
    expect(hotkeys).not.toContain("Shift+Tab");
    keys = KeybindingsManager.fromOwnedBindings({
      "app.thinking.cycle": "ctrl+r", "app.model.select": "alt+m", "app.message.dequeue": "alt+d",
    });
    lines = header.render(100).map(stripTerminalSequences);
    expect(lines.find(line => line.includes("to cycle thinking level"))).toContain("ctrl+r");
    expect(keys.getKeys("app.model.select")).toEqual(["alt+m"]);
    expect(lines.find(line => line.includes("to select model"))).toContain(process.platform === "darwin" ? "option+m" : "alt+m");
    expect(lines.find(line => line.includes("to edit all queued messages")))
      .toContain(process.platform === "darwin" ? "option+d" : "alt+d");
    const customHotkeys = createPiShellHotkeys(keys.getEffectiveConfig(), undefined, "a1").render(120)
      .map(stripTerminalSequences);
    const restoreRow = customHotkeys.find(line => line.includes("Restore queued messages"));
    expect(restoreRow).toContain(`${process.platform === "darwin" ? "Option" : "Alt"}+D`);
    expect(restoreRow).not.toContain(`${process.platform === "darwin" ? "Option" : "Alt"}+Up`);
    const pinned = createPiShellHeader({ expanded: true }).render(100).map(stripTerminalSequences);
    expect(pinned.find(line => line.includes("to cycle thinking level"))).toContain("shift+tab");
    expect(pinned.find(line => line.includes("to select model"))).toContain("ctrl+l");
  });
});

describe("process keybindings host", () => {
  it("keeps the applied manager while footer, header, and info presenters build their chrome", async () => {
    const agentDir = await mkdtemp(join(tmpdir(), "a1-keybindings-host-"));
    try {
      const host = createPiKeybindingsHost({ profile: "a1", agentDir });
      expect(getKeybindings()).toBe(host.manager);
      createPiShellFooter(view(), "/WORK", "a1");
      createPiShellHeader({ expanded: true });
      createPiShellHotkeys(undefined, undefined, "a1");
      expect(getKeybindings()).toBe(host.manager);
      const editor = createPiShellEditor({ getColumns: () => 80, getRows: () => 24, requestRender() {}, onSubmit() {}, keybindingProfile: "a1", keybindings: host });
      expect(getKeybindings()).toBe(host.manager);
      expect(editor.keybindingConfig()["app.thinking.cycle"]).toBe("ctrl+l");
    } finally {
      await rm(agentDir, { recursive: true, force: true });
    }
  });

  it("re-reads the user's file into the same shared manager on reload", async () => {
    const agentDir = await mkdtemp(join(tmpdir(), "a1-keybindings-host-"));
    try {
      const host = createPiKeybindingsHost({ profile: "a1", agentDir });
      const editor = createPiShellEditor({ getColumns: () => 80, getRows: () => 24, requestRender() {}, onSubmit() {}, keybindingProfile: "a1", keybindings: host });
      await writeFile(join(agentDir, "keybindings.json"), JSON.stringify({ "app.thinking.cycle": "ctrl+t" }));
      editor.reloadKeybindings();
      expect(getKeybindings()).toBe(host.manager);
      expect(host.manager.getKeys("app.thinking.cycle")).toEqual(["ctrl+t"]);
    } finally {
      await rm(agentDir, { recursive: true, force: true });
    }
  });
});
