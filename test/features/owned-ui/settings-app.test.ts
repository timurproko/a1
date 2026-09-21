import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentJsonValue, AgentSettingDescriptor, AgentSettingsPort } from "../../../src/contracts/agent-engine/index.js";
import { OWNED_UI_SETTING_DECLARATIONS, OwnedSettingsManager, type OwnedUiSettingDeclaration } from "../../../src/ui/settings/index.js";
import { SettingsApp } from "../../../src/features/owned-ui/index.js";
import type { AppHostServices } from "../../../src/ui/apps/index.js";
import { finalizeFrame, type UiTheme, type UiThemeToken } from "../../../src/ui/components/index.js";

const ESC = String.fromCharCode(27);
const DOWN = `${ESC}[B`;
const HOME = `${ESC}[H`;
const END = `${ESC}[F`;
const CTRL_HOME = `${ESC}[1;5H`;
const CTRL_END = `${ESC}[1;5F`;
const RXVT_CTRL_HOME = `${ESC}[7^`;
const RXVT_CTRL_END = `${ESC}[8^`;
const ENTER = "\r";
const SPACE = " ";
const STYLE = new RegExp(`${ESC}\\[[0-9;]*m`, "g");

const WARNING_FLAGS = [
  { key: "anthropicExtraUsage", label: "Anthropic extra usage", description: "Warn about paid extra usage", fallback: true },
  { key: "unknownTools", label: "Unknown tools", description: "Warn about unknown tools", fallback: false },
] as const;

function descriptor(
  key: string,
  valueType: AgentSettingDescriptor["valueType"],
  storedValue: AgentJsonValue,
  options: Partial<AgentSettingDescriptor> = {},
): AgentSettingDescriptor {
  return { key, valueType, writable: true, application: "live", owner: "shell", available: true, limitationReason: null, storedValue, effectiveValue: storedValue, ...options };
}

function port(failWrites = false): { port: AgentSettingsPort; writes: { key: string; value: AgentJsonValue }[] } {
  const values: Record<string, AgentJsonValue> = {
    warnings: {}, thinkingLevel: "low", editorPaddingX: 3, outputPad: 0,
    fullscreenScrollbar: "auto", quietStartup: false,
  };
  const writes: { key: string; value: AgentJsonValue }[] = [];
  return {
    writes,
    port: {
      capabilities: { write: true, flush: false },
      async listSettings(): Promise<readonly AgentSettingDescriptor[]> {
        return [
          descriptor("warnings", "json", values.warnings ?? null, { label: "Warnings", flags: WARNING_FLAGS, owner: "agent" }),
          descriptor("thinkingLevel", "enum", values.thinkingLevel ?? null, { choices: ["low", "high"], label: "Thinking level", description: "Reasoning depth", owner: "agent" }),
          descriptor("editorPaddingX", "number", values.editorPaddingX ?? null, { label: "Editor padding", minimum: 0, maximum: 3 }),
          descriptor("outputPad", "enum", values.outputPad ?? null, { choices: [0, 1], label: "Output padding" }),
          descriptor("fullscreenScrollbar", "enum", values.fullscreenScrollbar ?? null, { choices: ["auto", "always", "hidden"], label: "Fullscreen scrollbar", writable: false, available: false, limitationReason: "fixture reason must stay hidden" }),
          descriptor("quietStartup", "boolean", values.quietStartup ?? null, { label: "Quiet startup", owner: "startup", application: "next-start", writable: false, available: false, limitationReason: "fixture reason must stay hidden" }),
          descriptor("theme", "enum", "dark", { choices: ["dark", "light"], label: "Theme", writable: false, available: false, limitationReason: "fixture reason must stay hidden" }),
          descriptor("tuiMode", "enum", "fullscreen", { choices: ["regular", "fullscreen"], label: "TUI mode", writable: false, available: false, limitationReason: "fixture reason must stay hidden" }),
          descriptor("enableInstallTelemetry", "boolean", true, { label: "Install telemetry", owner: "installation", application: "next-start", writable: false, available: false, limitationReason: "fixture reason must stay hidden" }),
        ];
      },
      async readSetting(key: string): Promise<AgentJsonValue | undefined> {
        return values[key];
      },
      async writeSetting(key: string, value: AgentJsonValue) {
        if (failWrites) throw new Error("the engine refused");
        writes.push({ key, value });
        values[key] = value;
        return { status: "applied" as const, application: "live" as const, storedValue: value, effectiveValue: value, failure: null, limitationReason: null };
      },
    },
  };
}

const HOST: AppHostServices = {
  getSize: () => ({ width: 80, height: 24 }),
  requestRender: () => {},
  close: () => {},
  returnToPrevious: () => {},
  exit: () => {},
  interruptArmed: false,
  closeOnInterrupt: true,
};

/** Names every token it paints, so a screen line says which role each part took. */
const NAMING_THEME: UiTheme = Object.freeze({
  fg: (token: UiThemeToken, text: string) => `<${token}>${text}</${token}>`,
  bold: (text: string) => text,
  plain: (text: string) => text,
  highlight: (text: string) => `<highlight>${text}</highlight>`,
  disabled: (text: string) => `<disabled>${text}</disabled>`,
  panel: (text: string) => `<panel>${text}</panel>`,
});
const NAMING_HOST: AppHostServices = { ...HOST, theme: NAMING_THEME };
const BOLD_NAMING_HOST: AppHostServices = {
  ...HOST,
  theme: { ...NAMING_THEME, bold: (text: string) => `<b>${text}</b>` },
};

let root: string;

// Rationale: fixed numbered rows verify exact wheel distances independently of the product's settings inventory.
const WHEEL_ROWS: readonly OwnedUiSettingDeclaration[] = Array.from({ length: 20 }, (_, index) => ({
  id: `wheelRow${index + 1}`, label: `Wheel row ${String(index + 1).padStart(2, "0")}`,
  section: { id: "wheel-test", title: "Wheel test" }, description: "Numbered wheel fixture.",
  application: "live" as const, defaultValue: false, allowedValues: [false, true],
}));
const WHEEL_SETTINGS: readonly OwnedUiSettingDeclaration[] = [
  { ...OWNED_UI_SETTING_DECLARATIONS.find(setting => setting.id === "scrollbarSpeed")!, section: { id: "wheel-test", title: "Wheel test" } },
  ...WHEEL_ROWS,
];
// Rationale: the three Scroll settings ahead of the numbered rows, so the rail can be changed from the screen it draws on.
const RAIL_SETTINGS: readonly OwnedUiSettingDeclaration[] = [
  ...["scrollbarAppearance", "scrollbarStyle", "scrollbarSpeed"].map(id => ({
    ...OWNED_UI_SETTING_DECLARATIONS.find(setting => setting.id === id)!,
    section: { id: "wheel-test", title: "Wheel test" },
  })),
  ...WHEEL_ROWS,
];
const RAIL_RECT = { width: 80, height: 12 };
const RAIL_COLUMN = RAIL_RECT.width;
const SETTINGS_BODY_TOP = 2;
const RAIL_CONTENT_HEIGHT = RAIL_RECT.height - 2;
const INITIAL_RAIL_SCREEN_ROW = SETTINGS_BODY_TOP - 1;
const RAIL_LAST_EVENT_ROW = RAIL_CONTENT_HEIGHT;

/** Converts a zero-based screen row to the terminal's one-based row. */
function railEventRow(screenRow: number): number {
  return screenRow + 1;
}

/** The rows of a rail-sized frame, with styling taken off. */
function railScreen(target: SettingsApp): string[] {
  return target.render(RAIL_RECT, HOST).map(line => line.replace(STYLE, ""));
}

/** The rail cells of a rail-sized frame, top to bottom. */
function railCells(target: SettingsApp): string[] {
  return railScreen(target)
    .slice(0, RAIL_CONTENT_HEIGHT)
    .map(line => {
      const cell = line.length >= RAIL_COLUMN ? line.charAt(RAIL_COLUMN - 1) : " ";
      return cell === "│" || cell === "┃" ? cell : " ";
    });
}

async function app(
  failWrites = false,
  scrollbarSpeed?: "normal" | "fast" | "high",
  declarations: readonly OwnedUiSettingDeclaration[] = OWNED_UI_SETTING_DECLARATIONS,
  stored: Readonly<Record<string, string>> = {},
): Promise<{ app: SettingsApp; session: OwnedSettingsManager; writes: { key: string; value: AgentJsonValue }[] }> {
  const backing = port(failWrites);
  const seed = new OwnedSettingsManager({ configDir: root, profileId: "profile", declarations, migrations: [] });
  if (scrollbarSpeed !== undefined) await seed.change("a1", "scrollbarSpeed", scrollbarSpeed);
  for (const [id, value] of Object.entries(stored)) await seed.change("a1", id, value);
  const session = new OwnedSettingsManager({ configDir: root, profileId: "profile", declarations, migrations: [], agent: backing.port });
  await session.load();
  return { app: new SettingsApp(session), session, writes: backing.writes };
}

/** The rows the app draws, with styling escapes taken back off. */
function screen(target: SettingsApp): string[] {
  return target.render({ width: 80, height: 24 }, HOST).map(line => line.replace(STYLE, "").trimEnd());
}

function find(target: SettingsApp, needle: string): string {
  return screen(target).find(line => line.includes(needle)) ?? "";
}

/** Walks the selection down to the named setting the way a reader would. */
function selectRow(target: SettingsApp, label: string): void {
  for (let step = 0; step < 40; step++) {
    if (find(target, label).trimStart().startsWith("→")) return;
    target.onInput?.(DOWN, HOST);
  }
  throw new Error(`never reached ${label}`);
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "a1-settings-app-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("the settings screen", () => {
  it("frames settings chrome in border, accent, and heading roles", async () => {
    const { app: target } = await app();
    const lines = target.render({ width: 80, height: 24 }, BOLD_NAMING_HOST);
    const rule = "─".repeat(80);
    expect(lines).toHaveLength(24);
    expect(lines[0]).toBe(`<border>${rule}</border>`);
    expect(lines[1]?.trimEnd()).toBe(" <b><accent>Settings</accent></b>");
    expect(lines[2]?.trimEnd()).toBe("");
    expect(lines[3]).toContain("Generic");
    expect(lines[4]).toContain("Quit animation");
    expect(lines.find(line => line.includes("Generic"))?.startsWith(" ")).toBe(true);
    expect(lines.find(line => line.includes("Generic"))).toContain("<mdHeading><b>Generic</b></mdHeading>");
    expect(lines.find(line => line.includes("Quit animation"))?.startsWith(" <accent>→ ")).toBe(true);
    expect(lines.at(-2)).toBe(`<border>${rule}</border>`);
    expect(lines.at(-1)?.startsWith(" <dim>")).toBe(true);

    target.onMouse?.({ kind: "wheel-down", button: 0, row: 3, column: 40 }, BOLD_NAMING_HOST);
    const scrolled = target.render({ width: 80, height: 24 }, BOLD_NAMING_HOST);
    expect(scrolled.at(-2)).toBe(lines.at(-2));
  });

  it("scrolls the main title away while pinning the active section", async () => {
    const { app: target } = await app(false, undefined, WHEEL_SETTINGS);
    const rect = { width: 80, height: 8 };
    const initial = target.render(rect, HOST).map(line => line.replace(STYLE, "").trimEnd());
    expect(initial[0]).toBe("─".repeat(rect.width));
    expect(initial[1]).toBe(" Settings");

    target.onMouse?.({ kind: "wheel-down", button: 0, row: 1, column: 40 }, HOST);
    const scrolled = target.render(rect, HOST).map(line => line.replace(STYLE, "").trimEnd());
    expect(scrolled.join("\n")).not.toContain("Settings");
    expect(scrolled[0]).toBe(initial[0]);
    expect(scrolled[1]).toContain(" Wheel Test");

    target.onMouse?.({ kind: "wheel-up", button: 0, row: 1, column: 40 }, HOST);
    const restored = target.render(rect, HOST).map(line => line.replace(STYLE, "").trimEnd());
    expect(restored[0]).toBe(initial[0]);
    expect(restored[1]).toContain(" Settings");
  });

  it("keeps exact frame geometry when the chrome exhausts the rectangle", async () => {
    const { app: target, writes } = await app();
    for (const rect of [{ width: 0, height: 0 }, { width: 3, height: 1 }, { width: 5, height: 2 }, { width: 1, height: 3 }, { width: 12, height: 4 }]) {
      const lines = target.render(rect, HOST);
      expect(lines).toHaveLength(rect.height);
      expect(() => finalizeFrame(lines, rect, "settings")).not.toThrow();
      expect(finalizeFrame(lines, rect, "settings")).toEqual(lines);
    }
    target.render({ width: 80, height: 3 }, HOST);
    target.onMouse?.({ kind: "press", button: 0, row: 3, column: 30 }, HOST);
    expect(writes).toHaveLength(0);
  });

  it("groups concise scrollbar controls with defaults but no default wording", async () => {
    const { app: target } = await app();
    const lines = screen(target);
    expect(lines.findIndex(line => line.trim() === "Generic")).toBeLessThan(lines.findIndex(line => line.trim() === "Scroll"));
    expect(lines.some(line => line.includes("Quit animation") && line.includes("yes"))).toBe(true);
    expect(lines.some(line => line.trim() === "Scroll")).toBe(true);
    expect(lines.some(line => line.includes("Scrollbar mode") && line.includes("auto"))).toBe(true);
    expect(lines.some(line => line.includes("Fullscreen scrollbar"))).toBe(false);
    expect(lines.some(line => line.includes("Quiet startup"))).toBe(false);
    expect(lines.join("\n")).not.toContain("fixture reason must stay hidden");
    expect(lines.some(line => line.includes("Scrollbar style") && line.includes("thin"))).toBe(true);
    expect(lines.some(line => line.includes("Speed") && line.includes("normal"))).toBe(true);
    expect(lines.some(line => line.trim() === "Quit")).toBe(false);
    expect(lines.some(line => /\bEffect\b/.test(line))).toBe(false);
    expect(lines.some(line => /\bDuration\b/.test(line))).toBe(false);
    expect(lines.some(line => line.includes("Fullscreen exit output"))).toBe(false);
    expect(lines.some(line => line.trim() === "A1")).toBe(false);
    expect(lines.filter(line => line.trim() === "Agent")).toHaveLength(1);
    expect(lines.filter(line => line.includes("Prompt suggestions"))).toHaveLength(1);
    expect(lines.some(line => line.includes("Prompt suggestions") && line.includes("yes"))).toBe(true);
    expect(lines.findIndex(line => line.includes("Prompt suggestions"))).toBeGreaterThan(lines.findIndex(line => line.includes("Output padding")));
    expect(lines.join("\n")).not.toContain("(default)");
    expect(lines.join("\n")).not.toContain("When the session transcript scrollbar is visible.");
  });

  // Rationale: the selected value once regressed to the accent through pinned-row parity;
  // the screen itself now pins that only the cursor and label take the selection colour.
  it("paints the selected row's label in the accent and its value like every other value", async () => {
    const { app: target } = await app();
    const named = () => target.render({ width: 80, height: 24 }, NAMING_HOST).map(line => line.trimEnd());
    const lines = named();
    const selectedRow = lines.findIndex(line => line.includes("<accent>→ </accent>"));
    expect(selectedRow).toBeGreaterThanOrEqual(0);
    const selected = lines[selectedRow]!;
    expect(selected).toContain("<accent>Quit animation");
    expect(selected).toContain("<muted>yes</muted>");
    expect(selected).not.toContain("<accent>yes");
    const unselected = lines.find(line => line.includes("Scrollbar style"))!;
    expect(unselected).toContain("<muted>thin</muted>");
    expect(unselected).not.toContain("<accent>");

    const valueColumn = screen(target)[selectedRow]!.indexOf("yes") + 1;
    target.onMouse?.({ kind: "motion", button: 0, row: selectedRow + 1, column: valueColumn }, NAMING_HOST);
    const pointed = named()[selectedRow]!;
    expect(pointed).toContain("<accent>Quit animation");
    expect(pointed).toMatch(/\s+yes$/);
    expect(pointed).not.toContain("<muted>yes");
    expect(pointed).not.toContain("<accent>yes");
  });

  it("keeps the moved control stable through section jumps, search, refresh, keyboard, and pointer changes", async () => {
    const { app: target, session, writes } = await app();
    screen(target);
    expect(find(target, "Quit animation").trimStart()).toMatch(/^→/);
    target.onInput?.(`${ESC}[1;2B`, HOST);
    target.onInput?.(`${ESC}[1;2B`, HOST);
    expect(find(target, "Persistent history").trimStart()).toMatch(/^→/);
    target.onInput?.(`${ESC}[1;2B`, HOST);
    expect(find(target, "Warnings").trimStart()).toMatch(/^→/);
    selectRow(target, "Prompt suggestions");
    target.onInput?.(ENTER, HOST);
    await session.load();
    expect(session.value("promptSuggestions")).toBe(false);
    // Rationale: the second owned Agent row overflows the 24-row frame by one, so the rail follows each row.
    expect(find(target, "Prompt suggestions").trimStart()).toMatch(/^→.*no\s*│?$/);
    expect(find(target, "Skills").trimStart()).toMatch(/^\s*Skills\s+collapse\s*│?$/);
    expect(writes).toEqual([]);

    for (const query of ["Agent", "Prompt suggestions"]) {
      target.onInput?.("/", HOST);
      for (const letter of query) target.onInput?.(letter, HOST);
      expect(screen(target).filter(line => line.trim() === "Agent")).toHaveLength(1);
      expect(screen(target).filter(line => line.includes("Prompt suggestions") && !line.includes("❯"))).toHaveLength(1);
      expect(find(target, "Prompt suggestions").trimStart()).toMatch(/^→/);
      if (query === "Agent") target.onInput?.(ESC, HOST);
    }
    const lines = screen(target);
    const row = lines.findIndex(line => line.includes("Prompt suggestions") && !line.includes("❯"));
    const column = lines[row]!.lastIndexOf("no") + 1;
    target.onMouse?.({ kind: "press", button: 0, row: row + 1, column }, HOST);
    const menu = screen(target);
    expect(menu.some(line => line.includes("✓ no"))).toBe(true);
    const yesRow = menu.findIndex(line => /\byes\b/.test(line));
    expect(yesRow).toBeGreaterThanOrEqual(0);
    target.onMouse?.({ kind: "press", button: 0, row: yesRow + 1, column: menu[yesRow]!.indexOf("yes") + 1 }, HOST);
    await session.load();
    expect(session.value("promptSuggestions")).toBe(true);
    expect(writes).toEqual([]);
    target.onInput?.(ESC, HOST);
    expect(find(target, "Prompt suggestions").trimStart()).toMatch(/^→.*yes\s*│?$/);
    expect(screen(target).filter(line => line.includes("Prompt suggestions"))).toHaveLength(1);

    // Invariant: the Skills row is the same kind of owned Agent control: search finds it, Enter cycles it, nothing reaches the engine.
    target.onInput?.("/", HOST);
    for (const letter of "Skills") target.onInput?.(letter, HOST);
    expect(screen(target).filter(line => line.trim() === "Agent")).toHaveLength(1);
    expect(find(target, "Skills").trimStart()).toMatch(/^→.*collapse/);
    target.onInput?.(ESC, HOST);
    selectRow(target, "Skills");
    expect(find(target, "Skills").trimStart()).toMatch(/^→.*collapse/);
    target.onInput?.(ENTER, HOST);
    await session.load();
    expect(session.value("skillsPresentation")).toBe("expand");
    expect(find(target, "Skills").trimStart()).toMatch(/^→.*expand/);
    expect(screen(target).filter(line => line.includes("Skills"))).toHaveLength(1);
    expect(writes).toEqual([]);
  });

  it.each(["absent", "failed", "read-only", "empty"] as const)("renders an editable Agent suggestion row with %s engine settings", async state => {
    const backing = port();
    const agent: AgentSettingsPort | null = state === "absent" ? null : {
      ...backing.port,
      capabilities: { write: state !== "read-only", flush: false },
      async listSettings() {
        if (state === "failed") throw new Error("engine unavailable");
        return state === "empty" ? [] : await backing.port.listSettings();
      },
    };
    const session = new OwnedSettingsManager({ configDir: root, profileId: "profile", agent });
    await session.load();
    const target = new SettingsApp(session);
    const shown = screen(target);
    expect(shown.filter(line => line.trim() === "Agent")).toHaveLength(1);
    expect(shown.filter(line => line.includes("Prompt suggestions"))).toHaveLength(1);
    expect(shown.join("\n")).not.toContain("unavailable");
    expect(shown.some(line => line.includes("Thinking level"))).toBe(false);
    selectRow(target, "Prompt suggestions");
    target.onInput?.(ENTER, HOST);
    expect(session.value("promptSuggestions")).toBe(false);
    expect(backing.writes).toEqual([]);
  });

  it("retains descriptions as metadata without rendering selected-entry details", async () => {
    const { app: target } = await app();
    selectRow(target, "Thinking level");
    expect(screen(target).join("\n")).not.toContain("Reasoning depth");
  });

  it("keeps unavailable options and their explanatory copy out of search", async () => {
    const { app: target } = await app();
    for (const [query, label] of [
      ["theme", "Theme"],
      ["tui mode", "TUI mode"],
      ["install telemetry", "Install telemetry"],
      ["fullscreen scrollbar", "Fullscreen scrollbar"],
      ["quiet startup", "Quiet startup"],
    ] as const) {
      target.onInput?.("/", HOST);
      for (const letter of query) target.onInput?.(letter, HOST);
      const shown = screen(target);
      expect(shown.some(line => line.includes(label))).toBe(false);
      expect(shown.join("\n")).not.toContain("fixture reason must stay hidden");
      target.onInput?.(ESC, HOST);
    }
  });

  it("steps to the next value on enter", async () => {
    const { app: target, writes } = await app();
    selectRow(target, "Thinking level");
    target.onInput?.(ENTER, HOST);
    expect(writes).toEqual([{ key: "thinkingLevel", value: "high" }]);
  });

  it("stops at the end of a range instead of reporting a rejected write", async () => {
    const { app: target, writes } = await app();
    selectRow(target, "Editor padding");

    // Invariant: already at the top of what the engine accepts: the step is not taken, and
    // nothing is said about it.
    target.onInput?.(`${ESC}[C`, HOST);
    expect(writes).toHaveLength(0);
    expect(find(target, "Could not save")).toBe("");

    target.onInput?.(`${ESC}[D`, HOST);
    expect(writes).toEqual([{ key: "editorPaddingX", value: 2 }]);
  });

  it("steps a number offered as a list, without a menu or a message", async () => {
    const { app: target, writes } = await app();
    selectRow(target, "Output padding");

    const lines = screen(target);
    const row = lines.findIndex(line => line.includes("Output padding"));
    const valueColumn = (lines[row] ?? "").indexOf("0") + 1;
    target.onMouse?.({ kind: "press", button: 0, row: row + 1, column: valueColumn }, HOST);
    expect(writes).toHaveLength(0);
    expect(find(target, "cannot be changed")).toBe("");

    target.onInput?.(`${ESC}[C`, HOST);
    expect(writes).toEqual([{ key: "outputPad", value: 1 }]);
    // Invariant: one and zero are its ends: there is nowhere above one to go.
    target.onInput?.(`${ESC}[C`, HOST);
    expect(writes).toHaveLength(1);
  });

  it("opens the dialog for a structured setting and answers from what it is editing", async () => {
    const { app: target, writes } = await app();
    selectRow(target, "Warnings");
    target.onInput?.(ENTER, HOST);

    // Invariant: the declaration decides what a flag shows before anything is stored.
    expect(find(target, "Anthropic extra usage")).toContain("true");
    expect(find(target, "Unknown tools")).toContain("false");
    expect(find(target, "Enter/Space to change")).toContain("Esc to cancel");

    target.onInput?.(SPACE, HOST);
    expect(find(target, "Anthropic extra usage")).toContain("false");
    expect(writes.at(-1)).toEqual({ key: "warnings", value: { anthropicExtraUsage: false, unknownTools: false } });

    // Invariant: a second press steps from what the dialog shows, not from the snapshot it
    // was opened with.
    target.onInput?.(SPACE, HOST);
    expect(find(target, "Anthropic extra usage")).toContain("true");
    expect(writes.at(-1)).toEqual({ key: "warnings", value: { anthropicExtraUsage: true, unknownTools: false } });
  });

  it("adjusts a flag with the arrows, as the list adjusts a value", async () => {
    const { app: target, writes } = await app();
    selectRow(target, "Warnings");
    target.onInput?.(ENTER, HOST);
    target.onInput?.(`${ESC}[C`, HOST);
    expect(writes.at(-1)).toEqual({ key: "warnings", value: { anthropicExtraUsage: false, unknownTools: false } });
    target.onInput?.(`${ESC}[D`, HOST);
    expect(writes.at(-1)).toEqual({ key: "warnings", value: { anthropicExtraUsage: true, unknownTools: false } });
  });

  it("acts on the dialog's value and leaves its label alone", async () => {
    const { app: target, writes } = await app();
    selectRow(target, "Warnings");
    target.onInput?.(ENTER, HOST);

    const lines = screen(target);
    const row = lines.findIndex(line => line.includes("Anthropic extra usage"));
    const valueColumn = (lines[row] ?? "").indexOf("true") + 1;

    target.onMouse?.({ kind: "press", button: 0, row: row + 1, column: 6 }, HOST);
    expect(writes).toHaveLength(0);

    target.onMouse?.({ kind: "press", button: 0, row: row + 1, column: valueColumn }, HOST);
    expect(writes.at(-1)).toEqual({ key: "warnings", value: { anthropicExtraUsage: false, unknownTools: false } });
  });

  it("moves through what the search found instead of typing the arrows", async () => {
    const { app: target } = await app();
    target.onInput?.("/", HOST);
    target.onInput?.("t", HOST);
    const before = find(target, "❯").replace(/\s+$/, "");

    target.onInput?.(DOWN, HOST);
    const after = screen(target);
    expect(after.find(line => line.includes("❯"))?.replace(/\s+$/, "")).toBe(before);
    expect(after.some(line => line.trimStart().startsWith("→"))).toBe(true);
  });

  it("allows the mouse wheel to reveal the final row while search preserves the list height", async () => {
    const { app: target } = await app();
    target.onInput?.("/", HOST);
    const render = () => target.render({ width: 80, height: 13 }, HOST).map(line => line.replace(STYLE, "").trimEnd());
    let lines = render();
    const visited = new Set<string>();
    for (let step = 0; step < 20; step++) {
      for (const label of ["Persistent history", "History limit", "Thinking level", "Output padding", "Prompt suggestions", "Skills"]) {
        if (lines.some(line => line.includes(label))) visited.add(label);
      }
      // Rationale: wheel over the whole list pane, including otherwise blank space beside rows.
      target.onMouse?.({ kind: "wheel-down", button: 0, row: 3, column: 70 }, HOST);
      const next = render();
      if (next.join("\n") === lines.join("\n")) break;
      lines = next;
    }
    const searchRow = lines.findIndex(line => line.includes("search settings"));
    expect(searchRow).toBeGreaterThanOrEqual(2);
    expect(lines.some(line => line.includes("Skills"))).toBe(true);
    expect([...visited].sort()).toEqual(["History limit", "Output padding", "Persistent history", "Prompt suggestions", "Skills", "Thinking level"]);
  });

  it("restores the opening spacer when Ctrl+Home returns to the beginning during search", async () => {
    const { app: target } = await app();
    target.onInput?.("/", HOST);
    target.render({ width: 80, height: 13 }, HOST);
    target.onMouse?.({ kind: "wheel-down", button: 0, row: 3, column: 70 }, HOST);
    target.render({ width: 80, height: 13 }, HOST);

    target.onInput?.(CTRL_HOME, HOST);
    const lines = target.render({ width: 80, height: 13 }, HOST).map(line => line.replace(STYLE, "").trimEnd());
    expect(lines[0]).toBe("─".repeat(80));
    expect(lines[1]).toContain(" Settings");
    expect(lines[2]?.replace(/[│┃]$/u, "").trimEnd()).toBe("");
    expect(lines[3]).toContain("Generic");
    expect(lines[4]?.trimStart()).toMatch(/^→\s+Quit animation/);
  });

  it("moves the last result onto the final body row when Ctrl+End is used during search", async () => {
    const { app: target } = await app();
    target.onInput?.("/", HOST);
    target.onInput?.(CTRL_END, HOST);

    const lines = target.render({ width: 80, height: 10 }, HOST).map(line => line.replace(STYLE, "").trimEnd());
    const searchRow = lines.findIndex(line => line.includes("search settings"));
    expect(searchRow, JSON.stringify(lines)).toBeGreaterThanOrEqual(0);
    expect(lines.find(line => line.includes("Skills"))?.trimStart()).toMatch(/^→/);
    // Invariant: the ruled input's top line replaces the divider after the final body row.
    expect(lines[searchRow - 3]).toContain("Skills");
  });

  it("jumps to the first and last setting on Ctrl+Home and Ctrl+End in either encoding", async () => {
    const { app: target } = await app(false, undefined, WHEEL_SETTINGS);
    const arrowRow = () => screen(target).find(line => line.trimStart().startsWith("→")) ?? "";

    // Invariant: the Agent section follows the wheel rows, so its last entry is the very last setting.
    target.onInput?.(CTRL_END, HOST);
    expect(arrowRow()).toContain("Output padding");
    target.onInput?.(CTRL_HOME, HOST);
    expect(arrowRow()).toContain("Speed");
    target.onInput?.(RXVT_CTRL_END, HOST);
    expect(arrowRow()).toContain("Output padding");
    target.onInput?.(RXVT_CTRL_HOME, HOST);
    expect(arrowRow()).toContain("Speed");
  });

  it("leaves the list alone on plain Home and End", async () => {
    const { app: target } = await app(false, undefined, WHEEL_SETTINGS);
    target.render(RAIL_RECT, HOST);
    target.onMouse?.({ kind: "wheel-down", button: 0, row: 3, column: 70 }, HOST);
    const before = target.render(RAIL_RECT, HOST).map(line => line.replace(STYLE, "").trimEnd());

    expect(target.onInput?.(HOME, HOST)).toEqual({ consumed: false });
    expect(target.onInput?.(END, HOST)).toEqual({ consumed: false });
    expect(target.render(RAIL_RECT, HOST).map(line => line.replace(STYLE, "").trimEnd())).toEqual(before);
  });

  it("moves the search cursor on plain Home and End without moving the selection", async () => {
    const { app: target } = await app();
    target.onInput?.("/", HOST);
    for (const character of "cr") target.onInput?.(character, HOST);
    target.onInput?.(DOWN, HOST);
    expect(find(target, "→")).toContain("Scrollbar style");

    target.onInput?.(HOME, HOST);
    target.onInput?.("s", HOST);
    target.onInput?.(END, HOST);
    target.onInput?.("o", HOST);
    expect(screen(target).some(line => line.includes("scro"))).toBe(true);
    expect(find(target, "→")).toContain("Scrollbar style");
  });

  it("jumps a section from the search, as the arrows move through it", async () => {
    const { app: target } = await app();
    target.onInput?.("/", HOST);
    const before = find(target, "❯").replace(/s+$/, "");

    target.onInput?.(`${ESC}[1;2B`, HOST);
    const after = screen(target);
    expect(after.find(line => line.includes("❯"))?.replace(/s+$/, "")).toBe(before);
    expect(after.some(line => line.trimStart().startsWith("→"))).toBe(true);
  });

  it("shows a whole section when the search names it", async () => {
    const { app: target } = await app();
    target.onInput?.("/", HOST);
    for (const letter of "agen") target.onInput?.(letter, HOST);

    const shown = screen(target);
    for (const label of ["Warnings", "Thinking level", "Editor padding", "Output padding", "Prompt suggestions"]) {
      expect(shown.some(line => line.includes(label))).toBe(true);
    }
  });

  it("swallows the arrows when the search found nothing", async () => {
    const { app: target } = await app();
    target.onInput?.("/", HOST);
    for (const letter of "zzzz") target.onInput?.(letter, HOST);
    target.onInput?.(DOWN, HOST);
    target.onInput?.(`${ESC}[1;2B`, HOST);
    expect(find(target, "❯")).toContain("zzzz");
    expect(screen(target).some(line => line.trimStart().startsWith("→"))).toBe(false);
    expect(screen(target).join("\n")).toContain("No settings found.");
    expect(screen(target).join("\n")).not.toContain("Loading settings");
  });

  it("leaves the dialog on escape", async () => {
    const { app: target } = await app();
    selectRow(target, "Warnings");
    target.onInput?.(ENTER, HOST);
    expect(find(target, "Anthropic extra usage")).not.toBe("");
    target.onInput?.(ESC, HOST);
    expect(find(target, "Anthropic extra usage")).toBe("");
  });
});

describe("the list view behind the screen", () => {
  it("begins every value at one column, however wide the labels are", async () => {
    const { app: target } = await app();
    const rows = screen(target).filter(line => /\b(true|false|low|high|3|0)\s*$/.test(line) && line.includes(" "));
    const columns = new Set(rows.map(line => line.search(/\S+\s*$/)));
    expect(columns.size, `values start at ${[...columns].join(", ")}`).toBe(1);
  });

  it("reads the pointer as a label, a value, or a control beside it", async () => {
    const { app: target, writes } = await app();
    const lines = screen(target);
    const row = lines.findIndex(line => line.includes("Thinking level"));
    const valueColumn = (lines[row] ?? "").indexOf("low") + 1;
    const selectedBefore = lines.find(line => line.trimStart().startsWith("→"));

    // Invariant: pointer presses do not move the keyboard selection arrow.
    target.onMouse?.({ kind: "press", button: 0, row: row + 1, column: 8 }, HOST);
    expect(writes).toHaveLength(0);
    expect(screen(target).find(line => line.trimStart().startsWith("→"))).toBe(selectedBefore);

    // Compatibility: the value opens its shared dropdown without moving the row selection.
    target.onMouse?.({ kind: "press", button: 0, row: row + 1, column: valueColumn }, HOST);
    expect(writes).toHaveLength(0);
    expect(screen(target).some(line => line.includes("✓ low"))).toBe(true);
    expect(screen(target).find(line => line.trimStart().startsWith("→"))).toBe(selectedBefore);
  });

  it("raises working minus/plus controls over a number, and only over its value", async () => {
    const { app: target, writes } = await app();
    const lines = screen(target);
    const row = lines.findIndex(line => line.includes("Editor padding"));
    const valueColumn = (lines[row] ?? "").indexOf("3") + 1;

    target.onMouse?.({ kind: "motion", button: 0, row: row + 1, column: 8 }, HOST);
    expect(find(target, "Editor padding")).not.toContain("+");

    target.onMouse?.({ kind: "motion", button: 0, row: row + 1, column: valueColumn }, HOST);
    const stepped = find(target, "Editor padding");
    expect(stepped).toContain("+");
    const minusColumn = stepped.indexOf("-") + 1;
    target.onMouse?.({ kind: "press", button: 0, row: row + 1, column: minusColumn }, HOST);
    expect(writes.at(-1)).toEqual({ key: "editorPaddingX", value: 2 });

    const next = find(target, "Editor padding");
    const plusColumn = next.lastIndexOf("+") + 1;
    target.onMouse?.({ kind: "press", button: 0, row: row + 1, column: plusColumn }, HOST);
    expect(writes.at(-1)).toEqual({ key: "editorPaddingX", value: 3 });
  });
});

describe("the value dropdown behind the screen", () => {
  it("opens from the value and applies the chosen row", async () => {
    const { app: target, writes } = await app();
    const lines = screen(target);
    const row = lines.findIndex(line => line.includes("Thinking level"));
    const valueColumn = (lines[row] ?? "").indexOf("low") + 1;
    target.onMouse?.({ kind: "press", button: 0, row: row + 1, column: valueColumn }, HOST);
    expect(screen(target).some(line => line.includes("✓ low"))).toBe(true);

    target.onInput?.(DOWN, HOST);
    expect(screen(target).some(line => line.includes("✓ low"))).toBe(true);
    target.onInput?.(ENTER, HOST);
    expect(writes.at(-1)).toEqual({ key: "thinkingLevel", value: "high" });
  });

  it("applies the choice pressed inside the shared menu", async () => {
    const { app: target, writes } = await app();
    const lines = screen(target);
    const row = lines.findIndex(line => line.includes("Thinking level"));
    const valueColumn = (lines[row] ?? "").indexOf("low") + 1;
    target.onMouse?.({ kind: "press", button: 0, row: row + 1, column: valueColumn }, HOST);

    const menu = screen(target);
    const highRow = menu.findIndex(line => line.includes("high"));
    const highColumn = (menu[highRow] ?? "").indexOf("high") + 1;
    target.onMouse?.({ kind: "press", button: 0, row: highRow + 1, column: highColumn }, HOST);
    expect(writes.at(-1)).toEqual({ key: "thinkingLevel", value: "high" });
  });
});

describe("the input row and status line behind the screen", () => {
  it("uses the shared ruled search input in place of the ordinary divider", async () => {
    const { app: target } = await app();
    expect(target.onInput?.("t", HOST)).toMatchObject({ consumed: false });
    expect(screen(target).join("\n")).not.toContain("search settings");

    target.onInput?.("/", HOST);
    const painted = target.render({ width: 80, height: 24 }, HOST);
    const visible = painted.map(line => line.replace(STYLE, "").trimEnd());
    const searchRow = visible.findIndex(line => line.includes("search settings"));
    expect(painted[searchRow]).toContain(String.fromCharCode(27) + "[7m");
    expect(visible[searchRow]?.startsWith("❯ search settings")).toBe(true);
    expect(visible[searchRow - 1]).toMatch(/^─+$/u);
    expect(visible[searchRow + 1]).toMatch(/^─+$/u);
    expect(searchRow).toBe(visible.length - 3);
  });

  it("derives the complete standing status from active shortcut declarations", async () => {
    const { app: target } = await app();
    const wide = target.render({ width: 200, height: 24 }, HOST).map(line => line.replace(STYLE, ""));
    const hint = wide.find(line => line.includes("/ to search")) ?? "";
    expect(hint.startsWith(" ")).toBe(true);
    expect(hint).toContain("↑↓ to navigate");
    expect(hint).toContain("Shift+↑↓ to jump");
    expect(hint).toContain("Enter/Space to change");
    expect(hint).toContain("←→ to adjust");
    expect(hint).toContain("Esc to cancel");
    expect(hint).not.toContain("Type to search");

    const narrow = target.render({ width: 24, height: 8 }, HOST).map(line => line.replace(STYLE, ""));
    expect(narrow.at(-1)).toHaveLength(24);
  });

  it("uses the configured live scrollbar speed for settings-list wheel movement", async () => {
    const visibleAfterWheel = async (speed: "normal" | "fast" | "high"): Promise<string> => {
      const { app: target } = await app(false, speed, WHEEL_SETTINGS);
      target.render({ width: 80, height: 7 }, HOST);
      target.onMouse?.({ kind: "wheel-down", button: 0, row: 3, column: 70 }, HOST);
      return target.render({ width: 80, height: 7 }, HOST).map(line => line.replace(STYLE, "")).join("\n");
    };

    const normal = await visibleAfterWheel("normal");
    const fast = await visibleAfterWheel("fast");
    const high = await visibleAfterWheel("high");
    expect(normal).toContain("Wheel row 03");
    expect(fast).toContain("Wheel row 06");
    expect(high).toContain("Wheel row 09");
    expect(new Set([normal, fast, high]).size).toBe(3);
  });

  it("uses an accepted live speed before its source reflection settles", async () => {
    const { app: target, session } = await app(false, "normal", WHEEL_SETTINGS);
    const change = vi.spyOn(session, "change").mockReturnValue(new Promise(() => {}));
    target.render({ width: 80, height: 7 }, HOST);
    target.onInput?.(ENTER, HOST);
    expect(change).toHaveBeenCalledWith("a1", "scrollbarSpeed", "fast");
    expect(session.value("scrollbarSpeed")).toBe("normal");
    target.onMouse?.({ kind: "wheel-down", button: 0, row: 3, column: 70 }, HOST);
    const visible = target.render({ width: 80, height: 7 }, HOST).map(line => line.replace(STYLE, "")).join("\n");
    expect(visible).toContain("Wheel row 06");
  });

  it("keeps the rail blank under auto until the pointer reaches it", async () => {
    const { app: target } = await app(false, undefined, RAIL_SETTINGS);
    const blank = railCells(target);
    expect(blank.every(cell => cell === " ")).toBe(true);

    target.onMouse?.({ kind: "motion", button: 0, row: railEventRow(INITIAL_RAIL_SCREEN_ROW), column: RAIL_COLUMN }, HOST);
    const revealed = railCells(target);
    expect(revealed).toContain("│");
    expect(revealed).toContain("┃");
    // Invariant: the rail is not a row: pointing at it lights nothing in the list.
    expect(railScreen(target).some(line => line.includes("❯"))).toBe(false);

    target.onMouse?.({ kind: "motion", button: 0, row: railEventRow(INITIAL_RAIL_SCREEN_ROW), column: 10 }, HOST);
    expect(railCells(target).every(cell => cell === " ")).toBe(true);
  });

  it("lights the rail under auto while the list scrolls and lets it fade as the transcript does", async () => {
    vi.useFakeTimers();
    try {
      const { app: target } = await app(false, undefined, RAIL_SETTINGS);
      const requestRender = vi.fn();
      const host = { ...HOST, requestRender };
      const cells = () => target.render(RAIL_RECT, host)
        .slice(0, RAIL_CONTENT_HEIGHT)
        .map(line => line.replace(STYLE, ""))
        .map(line => {
          const cell = line.length >= RAIL_COLUMN ? line.charAt(RAIL_COLUMN - 1) : " ";
          return cell === "│" || cell === "┃" ? cell : " ";
        });
      expect(cells().every(cell => cell === " ")).toBe(true);

      target.onMouse?.({ kind: "wheel-down", button: 0, row: 3, column: 40 }, host);
      const lit = cells();
      expect(lit).toContain("│");
      expect(lit).not.toContain("┃");

      // Invariant: the rail stays lit for the shared linger, then one repaint takes it away.
      vi.advanceTimersByTime(800);
      expect(cells()).toContain("│");
      expect(requestRender).not.toHaveBeenCalled();
      vi.advanceTimersByTime(200);
      expect(requestRender).toHaveBeenCalledTimes(1);
      expect(cells().every(cell => cell === " ")).toBe(true);

      target.onInput?.(CTRL_END, host);
      expect(cells()).toContain("│");
      target.onClose?.(host);
      vi.advanceTimersByTime(2000);
      expect(requestRender).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("draws the rail whenever the list overflows under always, in the configured style", async () => {
    const thin = await app(false, undefined, RAIL_SETTINGS, { scrollbarAppearance: "always" });
    const thinCells = railCells(thin.app);
    expect(thinCells[INITIAL_RAIL_SCREEN_ROW]).toBe("│");
    expect(thinCells).toContain("│");
    expect(thinCells).not.toContain("┃");

    const thick = await app(false, undefined, RAIL_SETTINGS, { scrollbarAppearance: "always", scrollbarStyle: "thick" });
    const thickCells = railCells(thick.app);
    expect(thickCells).toContain("┃");
    expect(thickCells).not.toContain("│");
  });

  it("draws no rail and gives the rows its columns under hidden", async () => {
    const { app: target } = await app(false, undefined, RAIL_SETTINGS, { scrollbarAppearance: "hidden" });
    const lines = target.render(RAIL_RECT, HOST).map(line => line.replace(STYLE, ""));
    expect(lines.join("\n")).not.toMatch(/[│┃]/);
    target.onMouse?.({ kind: "motion", button: 0, row: railEventRow(INITIAL_RAIL_SCREEN_ROW), column: RAIL_COLUMN }, HOST);
    expect(target.render(RAIL_RECT, HOST).map(line => line.replace(STYLE, "")).join("\n")).not.toMatch(/[│┃]/);

    // Invariant: the former rail column is ordinary list space; pressing it pages nothing.
    const before = screen(target);
    target.onMouse?.({ kind: "press", button: 0, row: RAIL_RECT.height - 1, column: RAIL_COLUMN }, HOST);
    expect(screen(target)).toEqual(before);

    // Rationale: at 23 columns the value only reaches the screen when the rail gives its columns back.
    const reserved = (await app(false, undefined, RAIL_SETTINGS, { scrollbarAppearance: "auto" })).app;
    const modeRow = (candidate: SettingsApp) => candidate.render({ width: 23, height: 12 }, HOST)
      .map(line => line.replace(STYLE, "").trimEnd())
      .find(line => line.includes("Scrollbar mode")) ?? "";
    expect(modeRow(target)).toBe(" → Scrollbar mode     h");
    expect(modeRow(reserved)).toBe(" → Scrollbar mode");
  });

  it("follows a mode changed on the screen before the store reflects it", async () => {
    const { app: target, session } = await app(false, undefined, RAIL_SETTINGS);
    const change = vi.spyOn(session, "change").mockReturnValue(new Promise(() => {}));
    expect(railCells(target).every(cell => cell === " ")).toBe(true);

    target.onInput?.(ENTER, HOST);
    expect(change).toHaveBeenCalledWith("a1", "scrollbarAppearance", "always");
    expect(session.value("scrollbarAppearance")).toBe("auto");
    expect(railCells(target)).toContain("│");

    target.onInput?.(ENTER, HOST);
    expect(change).toHaveBeenCalledWith("a1", "scrollbarAppearance", "hidden");
    expect(target.render(RAIL_RECT, HOST).join("\n")).not.toMatch(/[│┃]/);
  });

  it("scrolls the list by dragging the thumb and pages from the track", async () => {
    const { app: target } = await app(false, undefined, RAIL_SETTINGS, { scrollbarAppearance: "always" });
    const visible = () => railScreen(target).join("\n");
    // Rationale: the rows without the rail, whose thumb changes glyph as the drag ends.
    const content = () => railScreen(target).map(line => line.slice(0, RAIL_COLUMN - 2)).join("\n");
    const arrow = () => railScreen(target).find(line => line.trimStart().startsWith("→"));
    expect(visible()).toContain("Scrollbar mode");
    expect(arrow()).toContain("Scrollbar mode");

    // Invariant: the thumb starts after the list's one-row sticky-header inset.
    const initialThumb = railCells(target).indexOf("│");
    expect(initialThumb).toBeGreaterThanOrEqual(1);
    target.onMouse?.({ kind: "press", button: 0, row: railEventRow(initialThumb), column: RAIL_COLUMN }, HOST);
    target.onMouse?.({ kind: "motion", button: 0, row: RAIL_LAST_EVENT_ROW, column: RAIL_COLUMN }, HOST);
    const dragged = content();
    expect(dragged).not.toContain("Scrollbar mode");
    expect(dragged).toContain("Wheel row 20");
    expect(railCells(target)).toContain("┃");
    target.onMouse?.({ kind: "release", button: 0, row: RAIL_LAST_EVENT_ROW, column: RAIL_COLUMN }, HOST);
    target.onMouse?.({ kind: "motion", button: 0, row: railEventRow(1), column: 40 }, HOST);
    expect(content()).toBe(dragged);
    expect(railCells(target)).not.toContain("┃");
    // Invariant: the selection stays where it was, off screen for now.
    expect(arrow()).toBeUndefined();

    // Rationale: pointing at the rail thickens the thumb, which says where to grab it for the way back up.
    target.onMouse?.({ kind: "motion", button: 0, row: RAIL_LAST_EVENT_ROW, column: RAIL_COLUMN }, HOST);
    const thumbRow = railCells(target).indexOf("┃");
    expect(thumbRow).toBeGreaterThan(1);
    target.onMouse?.({ kind: "press", button: 0, row: railEventRow(thumbRow), column: RAIL_COLUMN }, HOST);
    target.onMouse?.({ kind: "motion", button: 0, row: railEventRow(1), column: RAIL_COLUMN }, HOST);
    target.onMouse?.({ kind: "release", button: 0, row: railEventRow(1), column: RAIL_COLUMN }, HOST);
    expect(visible()).toContain("Scrollbar mode");
    expect(arrow()).toContain("Scrollbar mode");

    // Invariant: the track below the thumb pages down by the rows in view.
    target.onMouse?.({ kind: "press", button: 0, row: RAIL_LAST_EVENT_ROW, column: RAIL_COLUMN }, HOST);
    target.onMouse?.({ kind: "release", button: 0, row: RAIL_LAST_EVENT_ROW, column: RAIL_COLUMN }, HOST);
    const paged = visible();
    expect(paged).not.toContain("Scrollbar mode");
    expect(paged).toContain("Wheel row 10");
  });

  it("reports a failed write instead of the hint", async () => {
    const { app: target } = await app(true);
    selectRow(target, "Thinking level");
    target.onInput?.(ENTER, HOST);
    // Invariant: the write is reported once it has been attempted, not on the keypress.
    await new Promise(resolve => setTimeout(resolve, 0));
    const wide = target.render({ width: 200, height: 24 }, HOST).map(line => line.replace(STYLE, ""));
    expect(wide.find(line => line.includes("Could not save"))).toContain("Thinking level");
  });
});
