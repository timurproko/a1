import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AgentJsonValue, AgentSettingDescriptor, AgentSettingsPort } from "../../../src/contracts/agent-engine/index.js";
import { OwnedUiSettingsSession, OwnedUiSettingsStore } from "../../../src/ui/settings/index.js";
import { SettingsApp } from "../../../src/features/owned-ui/index.js";
import type { AppHostServices } from "../../../src/ui/apps/index.js";

const ESC = String.fromCharCode(27);
const DOWN = `${ESC}[B`;
const ENTER = "\r";
const SPACE = " ";
const STYLE = new RegExp(`${ESC}\\[[0-9;]*m`, "g");

const WARNING_FLAGS = [
  { key: "anthropicExtraUsage", label: "Anthropic extra usage", description: "Warn about paid extra usage", fallback: true },
  { key: "unknownTools", label: "Unknown tools", description: "Warn about unknown tools", fallback: false },
] as const;

function port(failWrites = false): { port: AgentSettingsPort; writes: { key: string; value: AgentJsonValue }[] } {
  const values: Record<string, AgentJsonValue> = { warnings: {}, thinkingLevel: "low", editorPaddingX: 3, outputPad: 0 };
  const writes: { key: string; value: AgentJsonValue }[] = [];
  return {
    writes,
    port: {
      capabilities: { write: true, flush: false },
      async listSettings(): Promise<readonly AgentSettingDescriptor[]> {
        return [
          { key: "warnings", valueType: "json", writable: true, label: "Warnings", flags: WARNING_FLAGS },
          { key: "thinkingLevel", valueType: "enum", writable: true, choices: ["low", "high"], label: "Thinking level" },
          { key: "editorPaddingX", valueType: "number", writable: true, label: "Editor padding", minimum: 0, maximum: 3 },
          { key: "outputPad", valueType: "enum", writable: true, choices: [0, 1], label: "Output padding" },
        ];
      },
      async readSetting(key: string): Promise<AgentJsonValue | undefined> {
        return values[key];
      },
      async writeSetting(key: string, value: AgentJsonValue): Promise<void> {
        if (failWrites) throw new Error("the engine refused");
        writes.push({ key, value });
        values[key] = value;
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

async function app(failWrites = false): Promise<{ app: SettingsApp; writes: { key: string; value: AgentJsonValue }[] }> {
  const backing = port(failWrites);
  const store = new OwnedUiSettingsStore({ configDir: root, profileId: "profile", declarations: [], migrations: [] });
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
  it("steps to the next value on enter", async () => {
    const { app: target, writes } = await app();
    selectRow(target, "Thinking level");
    target.onInput?.(ENTER, HOST);
    expect(writes).toEqual([{ key: "thinkingLevel", value: "high" }]);
  });

  it("stops at the end of a range instead of reporting a rejected write", async () => {
    const { app: target, writes } = await app();
    selectRow(target, "Editor padding");

    // Already at the top of what the engine accepts: the step is not taken, and
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
    // One and zero are its ends: there is nowhere above one to go.
    target.onInput?.(`${ESC}[C`, HOST);
    expect(writes).toHaveLength(1);
  });

  it("opens the dialog for a structured setting and answers from what it is editing", async () => {
    const { app: target, writes } = await app();
    selectRow(target, "Warnings");
    target.onInput?.(ENTER, HOST);

    // The declaration decides what a flag shows before anything is stored.
    expect(find(target, "Anthropic extra usage")).toContain("true");
    expect(find(target, "Unknown tools")).toContain("false");
    expect(find(target, "Enter/Space to change")).toContain("Esc to cancel");

    target.onInput?.(SPACE, HOST);
    expect(find(target, "Anthropic extra usage")).toContain("false");
    expect(writes.at(-1)).toEqual({ key: "warnings", value: { anthropicExtraUsage: false, unknownTools: false } });

    // A second press steps from what the dialog shows, not from the snapshot it
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

    // The label selects and changes nothing.
    target.onMouse?.({ kind: "press", button: 0, row: row + 1, column: 8 }, HOST);
    expect(writes).toHaveLength(0);

    // The value acts.
    target.onMouse?.({ kind: "press", button: 0, row: row + 1, column: valueColumn }, HOST);
    expect(screen(target).some(line => line.includes("✓"))).toBe(true);
  });

  it("raises the stepper over a number, and only over its value", async () => {
    const { app: target } = await app();
    const lines = screen(target);
    const row = lines.findIndex(line => line.includes("Editor padding"));
    const valueColumn = (lines[row] ?? "").indexOf("3") + 1;

    target.onMouse?.({ kind: "motion", button: 0, row: row + 1, column: 8 }, HOST);
    expect(find(target, "Editor padding")).not.toContain("+");

    target.onMouse?.({ kind: "motion", button: 0, row: row + 1, column: valueColumn }, HOST);
    expect(find(target, "Editor padding")).toContain("+");
  });
});

describe("the value menu behind the screen", () => {
  async function openMenu(height = 24): Promise<{ target: SettingsApp; row: number; lines: string[] }> {
    const { app: target } = await app();
    const drawn = (): string[] => target.render({ width: 80, height }, HOST).map(line => line.replace(STYLE, "").trimEnd());
    const lines = drawn();
    const row = lines.findIndex(line => line.includes("Thinking level"));
    const valueColumn = (lines[row] ?? "").indexOf("low") + 1;
    target.onMouse?.({ kind: "press", button: 0, row: row + 1, column: valueColumn }, HOST);
    return { target, row, lines: drawn() };
  }

  it("opens under the row it was opened from and marks the value in effect", async () => {
    const { row, lines } = await openMenu();
    expect(lines[row + 1]).toContain("✓ low");
    expect(lines[row + 2]).toContain("high");
  });

  it("highlights nothing until a key or the pointer picks an entry", async () => {
    const { target, row } = await openMenu();
    const painted = target.render({ width: 80, height: 24 }, HOST)[row + 1] ?? "";
    expect(painted).not.toContain(String.fromCharCode(27) + "[48");
  });

  it("closes on a press outside it, without acting on what is behind", async () => {
    const { app: target, writes } = await app();
    const lines = screen(target);
    const row = lines.findIndex(line => line.includes("Thinking level"));
    const valueColumn = (lines[row] ?? "").indexOf("low") + 1;
    target.onMouse?.({ kind: "press", button: 0, row: row + 1, column: valueColumn }, HOST);
    expect(screen(target).some(line => line.includes("✓"))).toBe(true);

    target.onMouse?.({ kind: "press", button: 0, row: 2, column: 2 }, HOST);
    expect(screen(target).some(line => line.includes("✓"))).toBe(false);
    expect(writes).toHaveLength(0);
  });

  // The row the menu came from is still the thing being changed, so it keeps
  // reading as the one under the pointer while the reader moves over the menu.
  it("keeps the row it came from looking pointed at while the pointer is in the menu", async () => {
    const { target, row } = await openMenu();
    const painted = (): string => target.render({ width: 80, height: 24 }, HOST)[row] ?? "";
    const pointedAtValue = painted();

    target.onMouse?.({ kind: "motion", button: 0, row: row + 2, column: 6 }, HOST);

    expect(painted()).toBe(pointedAtValue);
  });
});

describe("the input row and status line behind the screen", () => {
  it("shows the placeholder with the caret over its first cell", async () => {
    const { app: target } = await app();
    target.onInput?.("/", HOST);
    const painted = target.render({ width: 80, height: 24 }, HOST).find(line => line.includes("earch settings")) ?? "";
    expect(painted).toContain(String.fromCharCode(27) + "[7m");
    expect(painted.replace(STYLE, "")).toContain("❯ search settings");
  });

  it("says one thing at a time, reporting over the standing hint", async () => {
    const { app: target } = await app();
    // The hint is one line; at a width that fits it, it names every key.
    const wide = target.render({ width: 200, height: 24 }, HOST).map(line => line.replace(STYLE, ""));
    expect(wide.find(line => line.includes("to search"))).toContain("Esc to cancel");
  });

  it("reports a failed write instead of the hint", async () => {
    const { app: target } = await app(true);
    selectRow(target, "Thinking level");
    target.onInput?.(ENTER, HOST);
    // The write is reported once it has been attempted, not on the keypress.
    await new Promise(resolve => setTimeout(resolve, 0));
    const wide = target.render({ width: 200, height: 24 }, HOST).map(line => line.replace(STYLE, ""));
    expect(wide.find(line => line.includes("Could not save"))).toContain("Thinking level");
  });
});
