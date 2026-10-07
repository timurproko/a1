import { existsSync } from "node:fs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DynamicBorder, type SessionInfo } from "@earendil-works/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";
import { applyPiTheme, createPiShellSessionSelector, piTheme } from "../../../../src/integrations/pi/components/index.js";
import { cellStyle } from "../../../support/ansi-cell-style.js";
import { firstVisibleTextColumn } from "../../../support/dialog-alignment.js";

function stripPortableTerminalSequences(value: string): string {
  return value
    .replace(/\u001b\][\s\S]*?(?:\u0007|\u001b\\)/g, "")
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
}

function selectedBackgroundCells(row: string): number {
  let selected = false;
  let cells = 0;
  for (const token of row.matchAll(/\u001b\[([\d;]*)m|([^\u001b])/gu)) {
    if (token[1] !== undefined) {
      const codes = token[1].split(";").map(Number);
      if (codes.includes(0) || codes.includes(49)) selected = false;
      if (codes.includes(48)) selected = true;
    } else if (selected) {
      cells += 1;
    }
  }
  return cells;
}

function cellBackground(row: string, target: string): string {
  let background = "default";
  for (const token of row.matchAll(/\u001b\[([\d;]*)m|([^\u001b])/gu)) {
    if (token[1] !== undefined) {
      const codes = token[1].split(";").map(Number);
      for (let index = 0; index < codes.length; index += 1) {
        const code = codes[index];
        if (code === 0 || code === 49) background = "default";
        else if (code === 48 && codes[index + 1] === 2) {
          background = codes.slice(index + 2, index + 5).join(";"); index += 4;
        } else if (code === 48 && codes[index + 1] === 5) {
          background = `palette:${codes[index + 2]}`; index += 2;
        }
      }
    } else if (token[2] === target) {
      return background;
    }
  }
  throw new Error(`Missing character ${target} in ${stripPortableTerminalSequences(row)}`);
}

function cellBold(row: string, target: string): boolean {
  let bold = false;
  for (const token of row.matchAll(/\u001b\[([\d;]*)m|([^\u001b])/gu)) {
    if (token[1] !== undefined) {
      const codes = token[1].split(";").map(Number);
      if (codes.includes(0) || codes.includes(22)) bold = false;
      if (codes.includes(1)) bold = true;
    } else if (token[2] === target) {
      return bold;
    }
  }
  throw new Error(`Missing character ${target} in ${stripPortableTerminalSequences(row)}`);
}

function session(path: string, id: string, name: string | undefined, modified: number): SessionInfo {
  return {
    path,
    id,
    cwd: "D:/work",
    ...(name === undefined ? {} : { name }),
    created: new Date(modified - 1_000),
    modified: new Date(modified),
    messageCount: 2,
    firstMessage: `Prompt ${id}`,
    allMessagesText: `Prompt ${id} response`,
  };
}

describe("owned pinned session selector", () => {
  it("preserves scope, search, rename, delete confirmation, current-session protection, and silent cancel", async () => {
    applyPiTheme("dark", false, "truecolor");
    const root = await mkdtemp(join(tmpdir(), "a1-ss-"));
    const currentPath = join(root, "current.jsonl");
    const otherPath = join(root, "other.jsonl");
    await Promise.all([writeFile(currentPath, "{}\n"), writeFile(otherPath, "{}\n")]);
    let values = [
      session(currentPath, "current", "Current session", Date.now()),
      session(otherPath, "other", undefined, Date.now() - 10_000),
    ];
    const renamed: Array<{ path: string; name: string | undefined }> = [];
    let cancelled = 0;
    let rendered = 0;
    const loadCurrent = async () => values.filter(value => existsSync(value.path));
    const loadAll = async (progress?: (loaded: number, total: number) => void) => {
      progress?.(values.length, values.length);
      return values.filter(value => existsSync(value.path));
    };
    const component = await createPiShellSessionSelector({
      currentSessionsLoader: loadCurrent,
      allSessionsLoader: loadAll,
      currentSessionFilePath: currentPath,
      requestRender: () => { rendered += 1; },
      renameSession: async (path, name) => {
        renamed.push({ path, name });
        values = values.map(value => value.path === path && name ? { ...value, name } : value);
      },
      onSelect() {},
      onCancel: () => { cancelled += 1; },
      onExit() {},
    });
    await new Promise(resolve => setTimeout(resolve, 0));

    const frame = () => stripPortableTerminalSequences(component.render(100).join("\n"));
    const input = (data: string) => component.handleInput?.(data);
    expect(frame()).toContain("Resume Session");
    expect(frame()).not.toContain("Resume Session (");
    expect(frame()).toContain("Filter: current | all  Name: all  Sort: threaded");
    expect(frame()).toContain("Current session");
    const initialRows = component.render(100);
    const plainInitialRows = initialRows.map(stripPortableTerminalSequences);
    const headingIndex = plainInitialRows.findIndex(row => row.includes("Resume Session"));
    const filterIndex = plainInitialRows.findIndex(row => row.includes("Filter: current | all"));
    const resultIndex = plainInitialRows.findIndex(row => row.includes("Current session"));
    const firstHintIndex = plainInitialRows.findIndex(row => row.includes("Tab scope"));
    const finalHintIndex = plainInitialRows.findIndex(row => row.includes("Ctrl+S sort"));
    const heading = initialRows[headingIndex]!;
    const filterRow = initialRows[filterIndex]!;
    const standardRule = new DynamicBorder().render(100)[0]!;
    const ruleRows = initialRows.filter(row => /^─+$/u.test(stripPortableTerminalSequences(row)));
    expect(ruleRows).toEqual([standardRule, standardRule]);
    expect(cellStyle(ruleRows[0]!, "─")).not.toEqual(cellStyle(heading, "R"));
    expect(headingIndex).toBeLessThan(filterIndex);
    expect(filterIndex).toBeLessThan(resultIndex);
    expect(resultIndex).toBeLessThan(firstHintIndex);
    expect(firstHintIndex).toBeLessThan(finalHintIndex);
    expect(plainInitialRows[finalHintIndex + 1]).toMatch(/^─+$/u);
    expect(firstVisibleTextColumn(initialRows[firstHintIndex]!)).toBe(firstVisibleTextColumn(heading));
    expect(firstVisibleTextColumn(filterRow)).toBe(firstVisibleTextColumn(heading));
    expect(cellStyle(heading, "R")).toEqual(cellStyle(piTheme().fg("accent", piTheme().bold("R")), "R"));
    expect(filterRow).toContain(piTheme().fg("accent", "current"));
    expect(filterRow).toContain(piTheme().fg("dim", "all"));
    expect(filterRow).toContain(piTheme().fg("accent", "all"));
    expect(filterRow).toContain(piTheme().fg("accent", "threaded"));
    expect(plainInitialRows[firstHintIndex]).toContain('Tab scope  re:<pattern> regex  "phrase" exact');
    expect(plainInitialRows[finalHintIndex]).toContain("Esc close");
    expect(stripPortableTerminalSequences(component.render(12).join("\n"))).toContain("Esc close");
    expect(initialRows.slice(firstHintIndex, finalHintIndex + 1).join("\n")).not.toMatch(/[·•]/u);
    expect(frame()).not.toContain("Shift+Tab");

    input("Prompt other");
    expect(frame()).toContain("Prompt other");
    expect(frame()).not.toContain("Current session");
    input("\x15");
    input("\x13");
    expect(frame()).toContain("Sort: recent");
    input("\x0e");
    expect(frame()).toContain("Name: named");
    expect(frame()).not.toContain("Prompt other");
    input("\x0e");
    input("\x10");
    expect(frame()).toContain("other.jsonl");

    input("\x04");
    expect(frame()).toContain("Cannot delete the currently active session");
    expect(frame()).toContain("Esc close");

    input("\x1b[B");
    input("\x12");
    expect(frame()).toContain("Rename Session");
    const renameRows = component.render(100);
    const renameHeading = renameRows.find(row => stripPortableTerminalSequences(row).includes("Rename Session"))!;
    const renameHint = renameRows.find(row => stripPortableTerminalSequences(row).includes("to save"))!;
    const renameRules = renameRows.filter(row => /^─+$/u.test(stripPortableTerminalSequences(row)));
    expect(renameRules).toEqual([standardRule, standardRule]);
    expect(stripPortableTerminalSequences(renameHint)).toContain("Enter to save  Esc close");
    expect(firstVisibleTextColumn(renameHint)).toBe(firstVisibleTextColumn(renameHeading));
    expect(stripPortableTerminalSequences(renameHint)).not.toContain("Ctrl+C");
    input("discarded rename");
    input("\u0003");
    expect(frame()).toContain("Resume Session");
    expect(frame()).not.toContain("Rename Session");
    expect(renamed).toEqual([]);
    expect(cancelled).toBe(0);
    input("\x12");
    input("Renamed session");
    input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(renamed).toEqual([{ path: otherPath, name: "Renamed session" }]);
    expect(frame()).toContain("Renamed se");

    input("\x04");
    expect(frame()).toContain("Delete session?");
    const confirmRows = component.render(100).map(stripPortableTerminalSequences);
    const confirmationIndex = confirmRows.findIndex(row => row.includes("Delete session?"));
    expect(confirmationIndex).toBeGreaterThan(confirmRows.findIndex(row => row.includes("Renamed session")));
    expect(confirmRows[confirmationIndex]).toContain("Esc close");
    expect(confirmRows[confirmationIndex + 1]).toMatch(/^─+$/u);
    input("\r");
    await vi.waitFor(() => {
      expect(existsSync(otherPath)).toBe(false);
      expect(frame()).toMatch(/Session (moved to trash|deleted)/);
      const statusRows = component.render(100).map(stripPortableTerminalSequences);
      const statusIndex = statusRows.findIndex(row => /Session (moved to trash|deleted)/.test(row));
      expect(statusRows[statusIndex + 1]).toMatch(/^─+$/u);
    }, { timeout: 5000, interval: 25 });

    for (const [reverseTab, scope] of [
      ["\x1b[Z", "all"],
      ["\x1b[9;2u", "current"],
      ["\x1b[27;2;9~", "all"],
    ] as const) {
      input(reverseTab);
      await new Promise(resolve => setTimeout(resolve, 0));
      const scopeRow = component.render(100).find(row => stripPortableTerminalSequences(row).includes("Filter: current | all"))!;
      expect(scopeRow).toContain(piTheme().fg("accent", scope));
      expect(frame()).toContain("Resume Session");
      expect(frame()).not.toContain("Resume Session (");
    }
    input("\t");
    await new Promise(resolve => setTimeout(resolve, 0));
    const currentScopeRow = component.render(100).find(row => stripPortableTerminalSequences(row).includes("Filter: current | all"))!;
    expect(currentScopeRow).toContain(piTheme().fg("accent", "current"));
    expect(frame()).toContain("Resume Session");
    expect(frame()).not.toContain("Resume Session (");
    input("\x1b");
    expect(cancelled).toBe(1);
    expect(rendered).toBeGreaterThan(0);
  });

  it("keeps the all filter stable while partial results grow the paging total", async () => {
    applyPiTheme("dark", false, "truecolor");
    const values = Array.from({ length: 15 }, (_, index) =>
      session(`D:/sessions/loading-${index}.jsonl`, `loading-${index}`, undefined, Date.now() - index));
    let reportAll!: (loaded: number, total: number, partial?: readonly SessionInfo[]) => void;
    let finishAll!: (sessions: SessionInfo[]) => void;
    const component = await createPiShellSessionSelector({
      currentSessionsLoader: async () => [],
      allSessionsLoader: progress => new Promise(resolve => {
        reportAll = progress!;
        finishAll = resolve;
      }),
      currentSessionFilePath: undefined,
      requestRender() {},
      renameSession: async () => {},
      onSelect() {},
      onCancel() {},
      onExit() {},
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    component.handleInput?.("\t");

    reportAll(12, 100, values.slice(0, 12));
    let rows = component.render(100);
    let plain = rows.map(stripPortableTerminalSequences);
    expect(plain).toContain(" Resume Session");
    expect(plain).toContain(" Filter: current | all  Name: all  Sort: threaded");
    expect(plain.find(row => row.includes("Filter:"))).not.toContain("loading");
    expect(plain.some(row => row.trim() === "(1/12)")).toBe(true);
    expect(rows.find(row => stripPortableTerminalSequences(row).includes("Filter:")))
      .toContain(piTheme().fg("accent", "all"));

    reportAll(15, 100, values);
    plain = component.render(100).map(stripPortableTerminalSequences);
    expect(plain.some(row => row.trim() === "(1/15)")).toBe(true);
    expect(plain.join("\n")).not.toContain("15/100");
    const narrow = component.render(28).map(stripPortableTerminalSequences);
    expect(narrow).toContain(" Resume Session");
    expect(narrow.find(row => row.includes("Filter:"))).toBe(" Filter: current | all  Name");
    finishAll(values);
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  it("aligns result metadata columns and keeps every selected row full width", async () => {
    applyPiTheme("dark", false, "truecolor");
    const now = Date.now();
    const values = [
      { ...session("D:/sessions/short.jsonl", "short", "Short title", now), cwd: "D:/short", messageCount: 7 },
      { ...session("D:/sessions/long.jsonl", "long", "A title long enough to truncate before the reserved path column", now - 1), cwd: "D:/a/very/long/project/path/that/must/truncate/inside/its/column", messageCount: 22 },
      { ...session("D:/sessions/medium.jsonl", "medium", "Medium title", now - 2), cwd: "D:/medium/path", messageCount: 333 },
    ];
    const component = await createPiShellSessionSelector({
      currentSessionsLoader: async () => [],
      allSessionsLoader: async () => values,
      currentSessionFilePath: undefined,
      requestRender() {},
      renameSession: async () => {},
      onSelect() {},
      onCancel() {},
      onExit() {},
    });
    await new Promise(resolve => setTimeout(resolve, 0));
    component.handleInput?.("\t");
    await new Promise(resolve => setTimeout(resolve, 0));

    let rawRows = component.render(100);
    let rows = rawRows.map(stripPortableTerminalSequences);
    const shortIndex = rows.findIndex(row => row.includes("Short title"));
    const longIndex = rows.findIndex(row => row.includes("A title long"));
    const mediumIndex = rows.findIndex(row => row.includes("Medium title"));
    const pathStarts = [
      rows[shortIndex]!.indexOf("D:/short"),
      rows[longIndex]!.indexOf("D:/a/very"),
      rows[mediumIndex]!.indexOf("D:/medium/path"),
    ];
    expect(new Set(pathStarts).size).toBe(1);
    expect(rows[longIndex]).toMatch(/A title long.*…  D:\/a\/very.*…  +22 now$/u);
    expect(new Set([shortIndex, longIndex, mediumIndex].map(index => rows[index]!.lastIndexOf(" now"))).size).toBe(1);
    const selectedShort = rawRows[shortIndex]!;
    expect(stripPortableTerminalSequences(selectedShort)).toMatch(/^ → Short title/u);
    expect(cellStyle(selectedShort, "→"))
      .toEqual(cellStyle(piTheme().bg("selectedBg", piTheme().fg("accent", "→")), "→"));
    expect(cellStyle(selectedShort, "S"))
      .toEqual(cellStyle(piTheme().bg("selectedBg", piTheme().fg("success", "S")), "S"));
    expect(cellStyle(selectedShort, "D"))
      .toEqual(cellStyle(piTheme().bg("selectedBg", piTheme().fg("muted", "D")), "D"));
    expect(cellBold(selectedShort, "S")).toBe(false);
    expect(cellBackground(selectedShort, "→"))
      .toBe(cellBackground(piTheme().bg("selectedBg", "→"), "→"));
    expect(selectedBackgroundCells(selectedShort)).toBe(99);

    component.handleInput?.("\x1b[B");
    rawRows = component.render(100);
    rows = rawRows.map(stripPortableTerminalSequences);
    expect(selectedBackgroundCells(rawRows.find(row => stripPortableTerminalSequences(row).includes("Short title"))!)).toBe(0);
    expect(selectedBackgroundCells(rawRows.find(row => stripPortableTerminalSequences(row).includes("A title long"))!)).toBe(99);

    const narrowRows = component.render(52);
    const narrowSelected = narrowRows.find(row => stripPortableTerminalSequences(row).includes("A title"))!;
    expect(stripPortableTerminalSequences(narrowSelected)).toMatch(/^ → A title.*…  D:\/a\/very.*…  +22 now$/u);
    expect(selectedBackgroundCells(narrowSelected)).toBe(51);
  });

  it("places load failures in the bottom feedback area", async () => {
    applyPiTheme("dark", false, "truecolor");
    const component = await createPiShellSessionSelector({
      currentSessionsLoader: async () => { throw new Error("catalog unavailable"); },
      allSessionsLoader: async () => [],
      currentSessionFilePath: undefined,
      requestRender() {},
      renameSession: async () => {},
      onSelect() {},
      onCancel() {},
      onExit() {},
    });
    await new Promise(resolve => setTimeout(resolve, 0));

    const rows = component.render(100).map(stripPortableTerminalSequences);
    const titleIndex = rows.findIndex(row => row.includes("Resume Session"));
    const filterIndex = rows.findIndex(row => row.includes("Filter: current | all"));
    const emptyIndex = rows.findIndex(row => row.includes("No sessions in current folder"));
    const errorIndex = rows.findIndex(row => row.includes("Failed to load sessions: catalog unavailable"));
    expect(titleIndex).toBeLessThan(filterIndex);
    expect(filterIndex).toBeLessThan(emptyIndex);
    expect(emptyIndex).toBeLessThan(errorIndex);
    expect(rows[errorIndex]).toContain("Esc close");
    expect(rows[errorIndex + 1]).toMatch(/^─+$/u);
  });
});
