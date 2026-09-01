import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AgentJsonValue, AgentSettingDescriptor, AgentSettingsPort } from "../../../src/contracts/agent-engine/index.js";
import { OWNED_UI_SETTING_DECLARATIONS, OwnedUiSettingsSession, OwnedUiSettingsStore } from "../../../src/ui/settings/index.js";
import { SettingsApp } from "../../../src/features/owned-ui/index.js";
import type { AppHostServices } from "../../../src/ui/apps/index.js";

const ESC = String.fromCharCode(27);
const DOWN = `${ESC}[B`;
const HOME = `${ESC}[H`;
const END = `${ESC}[F`;
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

let root: string;

async function app(
  failWrites = false,
  scrollbarSpeed?: "normal" | "fast" | "high",
): Promise<{ app: SettingsApp; writes: { key: string; value: AgentJsonValue }[] }> {
  const backing = port(failWrites);
  const store = new OwnedUiSettingsStore({
    configDir: root,
    profileId: "profile",
    declarations: OWNED_UI_SETTING_DECLARATIONS,
    migrations: [],
  });
  if (scrollbarSpeed !== undefined) store.write(store.read(), "scrollbarSpeed", scrollbarSpeed);
  const session = new OwnedUiSettingsSession({ store, agent: backing.port });
  await session.load();
  return { app: new SettingsApp(session), writes: backing.writes };
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
  it("groups concise scrollbar controls with defaults but no default wording", async () => {
    const { app: target } = await app();
    const lines = screen(target);
    expect(lines.some(line => line.trim() === "Scroll")).toBe(true);
    expect(lines.some(line => line.includes("Scrollbar mode") && line.includes("auto"))).toBe(true);
    expect(lines.some(line => line.includes("Fullscreen scrollbar"))).toBe(false);
    expect(lines.some(line => line.includes("Quiet startup"))).toBe(false);
    expect(lines.join("\n")).not.toContain("fixture reason must stay hidden");
    expect(lines.some(line => line.includes("Scrollbar style") && line.includes("thin"))).toBe(true);
    expect(lines.some(line => line.includes("Speed") && line.includes("normal"))).toBe(true);
    expect(lines.some(line => line.trim() === "A1")).toBe(false);
    expect(lines.join("\n")).not.toContain("(default)");
    expect(lines.join("\n")).not.toContain("When the session transcript scrollbar is visible.");
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

  it("allows the mouse wheel to reveal the final row after search reduces the list height", async () => {
    const { app: target } = await app();
    target.onInput?.("/", HOST);
    target.render({ width: 80, height: 13 }, HOST);

    // Rationale: wheel over otherwise blank list space, not over a setting row.
    target.onMouse?.({ kind: "wheel-down", button: 0, row: 1, column: 70 }, HOST);
    const lines = target.render({ width: 80, height: 13 }, HOST).map(line => line.replace(STYLE, "").trimEnd());
    const searchRow = lines.findIndex(line => line.includes("search settings"));
    expect(lines[searchRow - 2]).toContain("Output padding");
  });

  it("restores the opening blank row when Home returns to the beginning during search", async () => {
    const { app: target } = await app();
    target.onInput?.("/", HOST);
    target.render({ width: 80, height: 13 }, HOST);
    target.onMouse?.({ kind: "wheel-down", button: 0, row: 1, column: 70 }, HOST);
    target.render({ width: 80, height: 13 }, HOST);

    target.onInput?.(HOME, HOST);
    const lines = target.render({ width: 80, height: 13 }, HOST).map(line => line.replace(STYLE, "").trimEnd());
    expect(lines[0]).toBe("");
    expect(lines[1]).toContain("Scroll");
    expect(lines[2]?.trimStart()).toMatch(/^→\s+Scrollbar mode/);
  });

  it("moves the last result onto the final body row when End is used during search", async () => {
    const { app: target } = await app();
    target.onInput?.("/", HOST);
    target.onInput?.(END, HOST);

    const lines = target.render({ width: 80, height: 8 }, HOST).map(line => line.replace(STYLE, "").trimEnd());
    const searchRow = lines.findIndex(line => line.includes("search settings"));
    expect(searchRow, JSON.stringify(lines)).toBeGreaterThanOrEqual(0);
    expect(lines.find(line => line.includes("Output padding"))?.trimStart()).toMatch(/^→/);
    // Invariant: the ruled search footer leaves its final result on the last body row.
    expect(lines[searchRow - 2]).toContain("Output padding");
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
    for (const label of ["Warnings", "Thinking level", "Editor padding", "Output padding"]) {
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
  it("opens the shared ruled search input only when slash invokes it", async () => {
    const { app: target } = await app();
    expect(target.onInput?.("t", HOST)).toMatchObject({ consumed: false });
    expect(screen(target).join("\n")).not.toContain("search settings");

    target.onInput?.("/", HOST);
    const painted = target.render({ width: 80, height: 24 }, HOST);
    const searchRow = painted.findIndex(line => line.replace(STYLE, "").includes("search settings"));
    expect(painted[searchRow]).toContain(String.fromCharCode(27) + "[7m");
    expect(painted[searchRow]?.replace(STYLE, "")).toContain("❯ search settings");
    expect(painted[searchRow - 1]?.replace(STYLE, "")).toMatch(/^─+$/u);
    expect(painted[searchRow + 1]?.replace(STYLE, "")).toMatch(/^─+$/u);
  });

  it("derives the complete standing status from active shortcut declarations", async () => {
    const { app: target } = await app();
    const wide = target.render({ width: 200, height: 24 }, HOST).map(line => line.replace(STYLE, ""));
    const hint = wide.find(line => line.includes("/ to search")) ?? "";
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
      const { app: target } = await app(false, speed);
      target.render({ width: 80, height: 3 }, HOST);
      target.onMouse?.({ kind: "wheel-down", button: 0, row: 1, column: 70 }, HOST);
      return target.render({ width: 80, height: 3 }, HOST).map(line => line.replace(STYLE, "")).join("\n");
    };

    const normal = await visibleAfterWheel("normal");
    const fast = await visibleAfterWheel("fast");
    const high = await visibleAfterWheel("high");
    expect(normal).toContain("Agent");
    expect(normal).not.toContain("Thinking level");
    expect(fast).toContain("Thinking level");
    expect(fast).not.toContain("Output padding");
    expect(high).toContain("Output padding");
    expect(new Set([normal, fast, high]).size).toBe(3);
  });

  it("uses an accepted live speed before its source reflection settles", async () => {
    const { app: target } = await app();
    selectRow(target, "Speed");
    target.onInput?.(ENTER, HOST);
    target.render({ width: 80, height: 3 }, HOST);
    target.onMouse?.({ kind: "wheel-down", button: 0, row: 1, column: 70 }, HOST);
    const visible = target.render({ width: 80, height: 3 }, HOST).map(line => line.replace(STYLE, "")).join("\n");
    expect(visible).toContain("Warnings");
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
