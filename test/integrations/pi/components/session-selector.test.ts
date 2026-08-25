import { existsSync } from "node:fs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SessionInfo } from "@earendil-works/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";
import { applyPiTheme, createPiShellSessionSelector } from "../../../../src/integrations/pi/components/index.js";

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
    const component = createPiShellSessionSelector({
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
    expect(frame()).toContain("Resume Session (Current Folder)");
    expect(frame()).toContain("Current session");

    input("Prompt other");
    expect(frame()).toContain("Prompt other");
    expect(frame()).not.toContain("Current session");
    input("\x15");
    input("\x13");
    expect(frame()).toContain("Sort: Recent");
    input("\x0e");
    expect(frame()).toContain("Name: Named");
    expect(frame()).not.toContain("Prompt other");
    input("\x0e");
    input("\x10");
    expect(frame()).toContain("other.jsonl");

    input("\x04");
    expect(frame()).toContain("Cannot delete the currently active session");

    input("\x1b[B");
    input("\x12");
    expect(frame()).toContain("Rename Session");
    input("Renamed session");
    input("\r");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(renamed).toEqual([{ path: otherPath, name: "Renamed session" }]);
    expect(frame()).toContain("Renamed se");

    input("\x04");
    expect(frame()).toContain("Delete session?");
    input("\r");
    await vi.waitFor(() => {
      expect(existsSync(otherPath)).toBe(false);
      expect(frame()).toMatch(/Session (moved to trash|deleted)/);
    }, { timeout: 5000, interval: 25 });

    input("\t");
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(frame()).toContain("Resume Session (All)");
    input("\x1b");
    expect(cancelled).toBe(1);
    expect(rendered).toBeGreaterThan(0);
  });
});
