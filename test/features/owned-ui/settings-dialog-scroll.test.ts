import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentJsonValue, AgentSettingDescriptor, AgentSettingsPort } from "../../../src/contracts/agent-engine/index.js";
import { SettingsApp } from "../../../src/features/owned-ui/index.js";
import { OwnedSettingsManager } from "../../../src/ui/settings/index.js";
import { createSettingsSearchInputFactory } from "../../../src/composition/settings-search-input.js";
import { PLAIN_THEME, displayWidth, stripAnsi, type PaneMouseEvent, type ScrollbarAppearance, type ScrollbarSpeed, type ScrollbarStyle } from "../../../src/ui/components/index.js";
import { cellStyle } from "../../support/ansi-cell-style.js";

const PANEL = "\u001b[48;5;238m";
const THEME = { ...PLAIN_THEME,
  fg: (role: string, text: string) => role === "accent" ? `\u001b[36m${text}\u001b[39m` : role === "dim" ? `\u001b[90m${text}\u001b[39m` : text,
  panel: (text: string) => `${PANEL}${text}\u001b[49m`,
  highlight: (text: string) => `\u001b[48;5;24m${text}\u001b[49m`,
};
const cleanups: (() => void)[] = [];
afterEach(() => { for (const cleanup of cleanups.splice(0)) cleanup(); vi.useRealTimers(); });

async function fixture(options: { kind?: "thinking" | "default" | "generic"; appearance?: ScrollbarAppearance; style?: ScrollbarStyle; speed?: ScrollbarSpeed; height?: number } = {}) {
  const root = mkdtempSync(join(tmpdir(), "a1-dialog-scroll-"));
  const kind = options.kind ?? "thinking";
  const flags = Array.from({ length: 40 }, (_, index) => ({
    key: `provider/model-${String(index).padStart(2, "0")}`, label: `model-${String(index).padStart(2, "0")} [provider]`, description: "Configure this model",
    fallback: kind === "thinking" ? "default" : false,
    ...(kind === "thinking" ? { choices: ["default", "low", "medium", "high"] } : {}),
  }));
  const key = kind === "thinking" ? "modelThinkingLevels" : kind === "default" ? "defaultModel" : "warnings";
  const label = kind === "thinking" ? "Default thinking level per model" : kind === "default" ? "Default model" : "Warnings";
  let value: AgentJsonValue = kind === "default" ? flags[0]!.key : {};
  const writes: AgentJsonValue[] = [];
  const port: AgentSettingsPort = {
    capabilities: { write: true, flush: false },
    async listSettings(): Promise<readonly AgentSettingDescriptor[]> {
      return [{ key, label, valueType: kind === "default" ? "enum" : "json", writable: true,
        application: kind === "default" ? "next-session" : "live", owner: kind === "default" ? "startup" : "agent",
        available: true, limitationReason: null, storedValue: value, effectiveValue: value, flags,
        ...(kind === "default" ? { choices: flags.map(flag => flag.key) } : {}),
      }];
    },
    async readSetting() { return value; },
    async writeSetting(_key, next) { writes.push(next); value = next; return { status: "applied", application: "live", storedValue: next, effectiveValue: next, failure: null, limitationReason: null }; },
  };
  const session = new OwnedSettingsManager({ configDir: root, profileId: "scroll", agent: port });
  await session.load();
  for (const [id, setting] of Object.entries({ scrollbarAppearance: options.appearance ?? "always", scrollbarStyle: options.style ?? "thin", scrollbarSpeed: options.speed ?? "normal" })) await session.change("a1", id, setting);
  let width = 80, height = options.height ?? 48;
  const host = { getSize: () => ({ width, height }), requestRender: vi.fn(), close() {}, returnToPrevious() {}, exit() {}, interruptArmed: false, closeOnInterrupt: true, theme: THEME };
  const app = new SettingsApp(session, { searchInputFactory: createSettingsSearchInputFactory({ agentDir: root, cwd: root }), dialogPanel: THEME.panel });
  cleanups.push(() => { app.onClose(host); rmSync(root, { recursive: true, force: true }); });
  const frame = () => app.render({ width, height }, host);
  const plain = () => frame().map(stripAnsi);
  for (let index = 0; index < 100; index++) {
    const selected = plain().find(line => line.includes("→"));
    if (selected?.includes(label)) break;
    app.onInput("\u001b[B", host);
    if (index === 99) throw new Error(`Setting not found: ${label}`);
  }
  app.onInput("\r", host);
  const panel = () => frame().flatMap((line, index) => line.includes(PANEL) ? [{ source: line, plain: stripAnsi(line), content: stripAnsi(line).slice(Math.floor((width - Math.min(60, width)) / 2), Math.floor((width - Math.min(60, width)) / 2) + Math.min(60, width)), row: index + 1 }] : []);
  const modelRows = () => panel().filter(line => /model-\d\d \[provider\]/u.test(line.plain));
  const pointer = (kind: PaneMouseEvent["kind"], column: number, row: number, button = kind === "motion" ? 3 : 0) => app.onMouse({ kind, column, row, button }, host);
  const railColumn = () => Math.floor((width - Math.min(60, width)) / 2) + Math.min(60, width) - 2;
  const wheel = (direction: "wheel-down" | "wheel-up" = "wheel-down") => pointer(direction, Math.floor(width / 2), panel()[1]!.row);
  const resize = (columns: number, rows: number) => { width = columns; height = rows; };
  return { app, session, host, writes, frame, plain, panel, modelRows, pointer, railColumn, wheel, resize };
}

describe("bounded Settings configure-list scrolling", () => {
  it.each(["thinking", "default", "generic"] as const)("keeps a large %s list compact with fixed chrome and ten visible choices", async kind => {
    const value = await fixture({ kind, height: 60 });
    const panel = value.panel();
    expect(panel.length).toBeLessThanOrEqual(20);
    expect(value.modelRows()).toHaveLength(10);
    expect(panel[0]!.row).toBeGreaterThan(1);
    expect(panel.at(-1)!.row).toBeLessThan(60);
    expect(panel.map(line => line.plain).join("\n")).toContain("Esc close");
    expect(value.frame().every(line => displayWidth(line) === 80)).toBe(true);
    expect(value.writes).toEqual([]);
  });

  it.each([["normal", 3], ["fast", 6], ["high", 9]] as const)("uses live shared %s wheel distance without moving the Enter target", async (speed, distance) => {
    const value = await fixture({ speed });
    value.wheel();
    expect(value.modelRows()[0]!.plain).toContain(`model-${String(distance).padStart(2, "0")}`);
    expect(value.modelRows().some(row => row.content.includes("→"))).toBe(false);
    expect(value.writes).toEqual([]);
    value.app.onInput("\r", value.host);
    const second = value.panel().map(line => line.plain).join(" ");
    expect(second).toContain("step 2/2");
    expect(second.replace(/\s+/gu, " ")).toContain("model-00 [provider]");
    expect(value.writes).toEqual([]);
  });

  it.each(["thin", "thick"] as const)("drags the shared %s thumb outside the panel without dismissing or selecting", async style => {
    const value = await fixture({ style });
    const glyph = style === "thin" ? "┃" : "▐";
    const first = value.modelRows()[0]!;
    expect(value.panel().some(line => line.plain.includes(glyph))).toBe(true);
    const rail = value.railColumn();
    value.pointer("press", rail, first.row + 1);
    value.pointer("motion", rail, 40, 0);
    expect(value.modelRows().at(-1)!.plain).toContain("model-39");
    expect(value.panel().some(line => line.plain.includes("Thinking Level"))).toBe(true);
    expect(value.pointer("release", 1, 40)).toEqual({ consumed: true, render: true });
    expect(value.modelRows().some(row => row.content.includes("→"))).toBe(false);
    expect(value.writes).toEqual([]);
    const rows = value.modelRows();
    expect(cellStyle(rows.at(-1)!.source, glyph)).toEqual(cellStyle(THEME.fg("accent", glyph), glyph));
    expect(cellStyle(rows[0]!.source, glyph)).toEqual(cellStyle(THEME.fg("dim", glyph), glyph));
  });

  it("pages from the track and ignores non-primary rail presses", async () => {
    const value = await fixture();
    const first = value.modelRows()[0]!.row;
    const rail = value.railColumn();
    value.pointer("press", rail, first + 9, 2);
    value.pointer("release", rail, first + 9, 2);
    expect(value.modelRows()[0]!.plain).toContain("model-00");
    value.pointer("press", rail, first + 9);
    value.pointer("release", rail, first + 9);
    expect(value.modelRows()[0]!.plain).toContain("model-10");
    value.pointer("press", rail, first);
    value.pointer("release", rail, first);
    expect(value.modelRows()[0]!.plain).toContain("model-00");
    expect(value.writes).toEqual([]);
  });

  it("applies auto hover and scroll linger, then fades and stops its timer on close", async () => {
    const value = await fixture({ appearance: "auto" });
    vi.useFakeTimers();
    const hasRail = () => value.panel().some(line => /[┃▐]/u.test(line.plain));
    expect(hasRail()).toBe(false);
    const row = value.modelRows()[0]!.row;
    value.pointer("motion", value.railColumn(), row);
    expect(hasRail()).toBe(true);
    value.pointer("motion", 1, 1);
    expect(hasRail()).toBe(false);
    value.wheel();
    expect(hasRail()).toBe(true);
    await vi.advanceTimersByTimeAsync(926);
    expect(hasRail()).toBe(false);
    value.wheel();
    expect(hasRail()).toBe(true);
    value.app.onClose(value.host);
    value.host.requestRender.mockClear();
    await vi.advanceTimersByTimeAsync(926);
    expect(value.host.requestRender).not.toHaveBeenCalled();
  });

  it("honors hidden appearance and live appearance/style/speed changes", async () => {
    const value = await fixture({ appearance: "hidden" });
    value.wheel();
    expect(value.modelRows()[0]!.plain).toContain("model-03");
    expect(value.panel().some(line => /[┃▐]/u.test(line.plain))).toBe(false);
    await value.session.change("a1", "scrollbarAppearance", "always");
    await value.session.change("a1", "scrollbarStyle", "thick");
    await value.session.change("a1", "scrollbarSpeed", "high");
    expect(value.panel().some(line => line.plain.includes("▐"))).toBe(true);
    value.wheel();
    expect(value.modelRows()[0]!.plain).toContain("model-12");
    expect(value.writes).toEqual([]);
  });

  it("reprojects filtered choices after scrolling and clicks their current semantic row", async () => {
    const value = await fixture();
    value.wheel(); value.modelRows();
    value.app.onInput("model-39", value.host);
    const rows = value.modelRows();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.plain).toContain("→ model-39");
    expect(value.panel().some(line => /[┃▐]/u.test(line.plain))).toBe(false);
    value.pointer("press", rows[0]!.plain.indexOf("model-39") + 1, rows[0]!.row);
    expect(value.panel().map(line => line.plain).join(" ").replace(/\s+/gu, " ")).toContain("model-39 [provider]");
    expect(value.panel().map(line => line.plain).join(" ")).toContain("step 2/2");
    value.app.onInput("\r", value.host);
    expect(value.writes.at(-1)).toEqual({ "provider/model-39": "low" });
    expect(value.panel().map(line => line.plain).join(" ")).toContain("step 1/2");
  });

  it("reveals keyboard navigation after independent scrolling and drains a resized rail gesture", async () => {
    const value = await fixture();
    value.wheel(); value.modelRows();
    value.app.onInput("\u001b[B", value.host);
    expect(value.modelRows().find(line => line.content.includes("→"))!.content).toContain("model-01");
    const first = value.modelRows()[0]!.row;
    value.pointer("press", value.railColumn(), first);
    value.resize(48, 10);
    expect(value.frame().every(line => displayWidth(line) === 48)).toBe(true);
    expect(value.panel().map(line => line.plain).join(" ")).toContain("Esc close");
    value.pointer("motion", 1, 1, 0);
    value.pointer("release", 1, 1);
    expect(value.panel().map(line => line.plain).join(" ")).toContain("Thinking Level");
    expect(value.writes).toEqual([]);
  });

  it.each(["default", "generic"] as const)("activates the clicked visible %s row after wheel scrolling, not the keyboard row", async kind => {
    const value = await fixture({ kind });
    value.wheel();
    const first = value.modelRows()[0]!;
    expect(first.content).toContain("model-03");
    value.pointer("press", first.plain.indexOf("model-03") + 1, first.row);
    const expected = kind === "default" ? "provider/model-03"
      : Object.fromEntries(Array.from({ length: 40 }, (_, index) => [`provider/model-${String(index).padStart(2, "0")}`, index === 3]));
    await vi.waitFor(() => expect(value.writes).toEqual([expected]));
    if (kind === "default") expect(value.panel()).toEqual([]);
    else expect(value.modelRows()[0]!.content).toContain("model-03");
  });

  it("keeps outside wheel ownership with Settings instead of scrolling the dialog", async () => {
    const value = await fixture();
    const before = value.modelRows().map(line => line.plain);
    value.pointer("wheel-up", 1, 2);
    expect(value.modelRows().map(line => line.plain)).toEqual(before);
    expect(value.writes).toEqual([]);
  });
});
