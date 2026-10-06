import { existsSync } from "node:fs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SessionInfo } from "@earendil-works/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";
import { applyPiTheme, createPiShellSessionSelector, piTheme } from "../../../../src/integrations/pi/components/index.js";
import { cellStyle } from "../../../support/ansi-cell-style.js";
import { firstVisibleTextColumn } from "../../../support/dialog-alignment.js";

function stripPortableTerminalSequences(value: string): string {
  return value
    .replace(/\u001b\][\s\S]*?(?:\u0007|\u001b\\)/g, "")
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
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
    expect(frame()).toContain("Filter: current folder | all  Name: all  Sort: threaded");
    expect(frame()).toContain("Current session");
    const initialRows = component.render(100);
    const plainInitialRows = initialRows.map(stripPortableTerminalSequences);
    const headingIndex = plainInitialRows.findIndex(row => row.includes("Resume Session"));
    const filterIndex = plainInitialRows.findIndex(row => row.includes("Filter: current folder"));
    const resultIndex = plainInitialRows.findIndex(row => row.includes("Current session"));
    const firstHintIndex = plainInitialRows.findIndex(row => row.includes("Tab scope"));
    const finalHintIndex = plainInitialRows.findIndex(row => row.includes("Ctrl+S sort"));
    const heading = initialRows[headingIndex]!;
    const filterRow = initialRows[filterIndex]!;
    expect(headingIndex).toBeLessThan(filterIndex);
    expect(filterIndex).toBeLessThan(resultIndex);
    expect(resultIndex).toBeLessThan(firstHintIndex);
    expect(firstHintIndex).toBeLessThan(finalHintIndex);
    expect(plainInitialRows[finalHintIndex + 1]).toMatch(/^─+$/u);
    expect(firstVisibleTextColumn(initialRows[firstHintIndex]!)).toBe(firstVisibleTextColumn(heading));
    expect(firstVisibleTextColumn(filterRow)).toBe(firstVisibleTextColumn(heading));
    expect(cellStyle(heading, "R")).toEqual(cellStyle(piTheme().fg("accent", piTheme().bold("R")), "R"));
    expect(filterRow).toContain(piTheme().fg("accent", "current folder"));
    expect(filterRow).toContain(piTheme().fg("dim", "all"));
    expect(filterRow).toContain(piTheme().fg("accent", "all"));
    expect(filterRow).toContain(piTheme().fg("accent", "threaded"));
    expect(plainInitialRows[firstHintIndex]).toContain('Tab scope  re:<pattern> regex  "phrase" exact');
    expect(initialRows.slice(firstHintIndex, finalHintIndex + 1).join("\n")).not.toMatch(/[·•]/u);

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

    input("\x1b[B");
    input("\x12");
    expect(frame()).toContain("Rename Session");
    const renameRows = component.render(100);
    const renameHeading = renameRows.find(row => stripPortableTerminalSequences(row).includes("Rename Session"))!;
    const renameHint = renameRows.find(row => stripPortableTerminalSequences(row).includes("to save"))!;
    expect(firstVisibleTextColumn(renameHint)).toBe(firstVisibleTextColumn(renameHeading));
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
    expect(confirmRows[confirmationIndex + 1]).toMatch(/^─+$/u);
    input("\r");
    await vi.waitFor(() => {
      expect(existsSync(otherPath)).toBe(false);
      expect(frame()).toMatch(/Session (moved to trash|deleted)/);
      const statusRows = component.render(100).map(stripPortableTerminalSequences);
      const statusIndex = statusRows.findIndex(row => /Session (moved to trash|deleted)/.test(row));
      expect(statusRows[statusIndex + 1]).toMatch(/^─+$/u);
    }, { timeout: 5000, interval: 25 });

    input("\t");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(frame()).toContain("Resume Session");
    expect(frame()).not.toContain("Resume Session (");
    expect(frame()).toContain("Filter: current folder | all");
    input("\x1b");
    expect(cancelled).toBe(1);
    expect(rendered).toBeGreaterThan(0);
  });

  it("keeps loading progress with the active filter and clips status below a stable title", async () => {
    applyPiTheme("dark", false, "truecolor");
    const value = session("D:/sessions/loading.jsonl", "loading", undefined, Date.now());
    let finishCurrent!: (sessions: SessionInfo[]) => void;
    const component = await createPiShellSessionSelector({
      currentSessionsLoader: progress => new Promise(resolve => {
        finishCurrent = resolve;
        progress?.(1, 2, [value]);
      }),
      allSessionsLoader: async () => [value],
      currentSessionFilePath: undefined,
      requestRender() {},
      renameSession: async () => {},
      onSelect() {},
      onCancel() {},
      onExit() {},
    });

    const loadingRows = component.render(100);
    const loadingPlain = loadingRows.map(stripPortableTerminalSequences);
    expect(loadingPlain).toContain(" Resume Session");
    expect(loadingPlain).toContain(" Filter: current folder (loading 1/2) | all  Name: all  Sort: threaded");
    expect(loadingRows.find(row => stripPortableTerminalSequences(row).includes("Filter:")))
      .toContain(piTheme().fg("accent", "current folder (loading 1/2)"));
    const narrow = component.render(28).map(stripPortableTerminalSequences);
    expect(narrow).toContain(" Resume Session");
    expect(narrow.find(row => row.includes("Filter:"))).toBe(" Filter: current folder (loa");
    finishCurrent([value]);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(stripPortableTerminalSequences(component.render(100).join("\n")))
      .toContain("Filter: current folder | all  Name: all  Sort: threaded");
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
    const filterIndex = rows.findIndex(row => row.includes("Filter: current folder | all"));
    const emptyIndex = rows.findIndex(row => row.includes("No sessions in current folder"));
    const errorIndex = rows.findIndex(row => row.includes("Failed to load sessions: catalog unavailable"));
    expect(titleIndex).toBeLessThan(filterIndex);
    expect(filterIndex).toBeLessThan(emptyIndex);
    expect(emptyIndex).toBeLessThan(errorIndex);
    expect(rows[errorIndex + 1]).toMatch(/^─+$/u);
  });
});
