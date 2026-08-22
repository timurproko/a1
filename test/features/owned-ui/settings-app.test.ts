import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AgentJsonValue, AgentSettingDescriptor, AgentSettingsPort } from "../../../src/foundation/agent-engine-contracts/index.js";
import { OwnedUiSettingsSession, OwnedUiSettingsStore } from "../../../src/foundation/owned-ui-settings/index.js";
import { SettingsApp } from "../../../src/features/owned-ui/index.js";
import type { AppHostServices } from "../../../src/foundation/ui-apps/index.js";

const ESC = String.fromCharCode(27);
const DOWN = `${ESC}[B`;
const ENTER = "\r";
const SPACE = " ";
const STYLE = new RegExp(`${ESC}\\[[0-9;]*m`, "g");

const WARNING_FLAGS = [
  { key: "anthropicExtraUsage", label: "Anthropic extra usage", description: "Warn about paid extra usage", fallback: true },
  { key: "unknownTools", label: "Unknown tools", description: "Warn about unknown tools", fallback: false },
] as const;

function port(): { port: AgentSettingsPort; writes: { key: string; value: AgentJsonValue }[] } {
  const values: Record<string, AgentJsonValue> = { warnings: {}, thinkingLevel: "low" };
  const writes: { key: string; value: AgentJsonValue }[] = [];
  return {
    writes,
    port: {
      capabilities: { write: true, flush: false },
      async listSettings(): Promise<readonly AgentSettingDescriptor[]> {
        return [
          { key: "warnings", valueType: "json", writable: true, label: "Warnings", flags: WARNING_FLAGS },
          { key: "thinkingLevel", valueType: "enum", writable: true, choices: ["low", "high"], label: "Thinking level" },
        ];
      },
      async readSetting(key: string): Promise<AgentJsonValue | undefined> {
        return values[key];
      },
      async writeSetting(key: string, value: AgentJsonValue): Promise<void> {
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

async function app(): Promise<{ app: SettingsApp; writes: { key: string; value: AgentJsonValue }[] }> {
  const backing = port();
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

    target.onMouse?.({ kind: "press", button: "left", row: row + 1, column: 6 }, HOST);
    expect(writes).toHaveLength(0);

    target.onMouse?.({ kind: "press", button: "left", row: row + 1, column: valueColumn }, HOST);
    expect(writes.at(-1)).toEqual({ key: "warnings", value: { anthropicExtraUsage: false, unknownTools: false } });
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
