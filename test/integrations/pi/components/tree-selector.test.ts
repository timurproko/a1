import { CURSOR_MARKER, Input, stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { describe, expect, it, vi } from "vitest";
import { createPiShellTreeSelector, piTheme } from "../../../../src/integrations/pi/components/index.js";
import { cellBackgroundAt, cellStyle } from "../../../support/ansi-cell-style.js";

const REVERSE_TABS = ["\u001b[Z", "\u001b[9;2u", "\u001b[27;2;9~"] as const;

function tree() {
  return [{
    entry: {
      type: "message",
      id: "system-1",
      parentId: null,
      timestamp: new Date(0).toISOString(),
      message: { role: "system", content: "System prompt", timestamp: 0 },
    },
    children: [{
      entry: {
        type: "model_change",
        id: "model-1",
        parentId: "system-1",
        timestamp: new Date(1).toISOString(),
        provider: "openai-codex",
        modelId: "gpt-5.6-sol",
      },
      children: [],
    }, {
      entry: {
        type: "thinking_level_change",
        id: "thinking-1",
        parentId: "system-1",
        timestamp: new Date(2).toISOString(),
        thinkingLevel: "high",
      },
      children: [],
    }, {
      entry: {
        type: "message",
        id: "user-1",
        parentId: "system-1",
        timestamp: new Date(3).toISOString(),
        message: { role: "user", content: [{ type: "text", text: "QuestionABC" }], timestamp: 3 },
      },
      label: "hello",
      labelTimestamp: (() => {
        const timestamp = new Date();
        timestamp.setHours(14, 59, 0, 0);
        return timestamp.toISOString();
      })(),
      children: [{
        entry: {
          type: "message",
          id: "assistant-1",
          parentId: "user-1",
          timestamp: new Date(4).toISOString(),
          message: { role: "assistant", content: [{ type: "text", text: "ResponseXYZ" }], timestamp: 4 },
        },
        children: [{
          entry: {
            type: "label",
            id: "label-1",
            parentId: "assistant-1",
            timestamp: new Date(5).toISOString(),
            targetId: "user-1",
            label: "hello",
          },
          children: [],
        }],
      }],
    }],
  }];
}

async function selector(onCancel = vi.fn()) {
  return createPiShellTreeSelector({
    tree: tree(),
    currentLeafId: "assistant-1",
    terminalHeight: 24,
    onSelect: vi.fn(),
    onCancel,
    onLabelChange: vi.fn(),
  });
}

describe("bare-A1 session tree presentation", () => {
  it("uses compact Models-style chrome, search, selection, and footer roles", async () => {
    const component = await selector();
    component.setFocused?.(true);
    const rows = component.render(80);
    const plain = rows.map(row => stripTerminalSequences(row).trimEnd());

    expect(plain[0]).toMatch(/^─+$/u);
    expect(plain[1]).toBe(" Session Tree");
    expect(plain[2]).toBe(" Filter: all | no tools | user | labeled");
    expect(plain[3]).toBe("");
    expect(plain[4]).toBe(" >");
    expect(cellStyle(rows[2]!, "a")).toEqual(cellStyle(piTheme().fg("accent", "a"), "a"));
    expect(cellStyle(rows[2]!, "s")).toEqual(cellStyle(piTheme().fg("muted", "s"), "s"));
    expect(plain.some(row => row.includes("Type to search:"))).toBe(false);
    expect(plain.filter(row => /^─+$/u.test(row))).toHaveLength(2);

    const title = rows[1]!;
    expect(cellStyle(title, "S")).toEqual(cellStyle(piTheme().fg("accent", piTheme().bold("S")), "S"));

    const selected = rows.find(row => stripTerminalSequences(row).includes("assistant: ResponseXYZ"))!;
    expect(stripTerminalSequences(selected)).toContain("→ assistant: ResponseXYZ");
    expect(stripTerminalSequences(selected)).not.toContain("•");
    expect(selected).toContain("\u001b[48;");
    expect(selected).not.toContain("\u001b[1m");
    const selectedText = stripTerminalSequences(selected);
    const selectionBackground = cellBackgroundAt(piTheme().bg("selectedBg", "x"), 0);
    expect(cellBackgroundAt(selected, selectedText.indexOf("→"))).toBe(selectionBackground);
    expect(cellBackgroundAt(selected, selectedText.indexOf("X"))).toBe(selectionBackground);
    expect(cellStyle(selected, "→")).toEqual(cellStyle(piTheme().fg("accent", "→"), "→"));
    expect(cellStyle(selected, "a")).toEqual(cellStyle(piTheme().fg("warning", "a"), "a"));
    expect(cellStyle(selected, "X")).toEqual(cellStyle(piTheme().fg("muted", "X"), "X"));
    const unselected = rows.find(row => stripTerminalSequences(row).includes("user: QuestionABC"))!;
    expect(cellStyle(unselected, "h")).toEqual(cellStyle(piTheme().fg("accent", "h"), "h"));
    expect(cellStyle(unselected, "u")).toEqual(cellStyle(piTheme().fg("success", "u"), "u"));
    expect(cellStyle(unselected, "Q")).toEqual(cellStyle(piTheme().fg("muted", "Q"), "Q"));
    const session = rows.find(row => stripTerminalSequences(row).trim() === "session")!;
    expect(session).toBeDefined();
    expect(plain.join("\n")).not.toContain("system");
    expect(plain.join("\n")).not.toContain("[model:");
    expect(plain.join("\n")).not.toContain("[thinking:");
    expect(plain.join("\n")).not.toContain("[label:");
    expect(plain.some(row => row.includes("(3/3)"))).toBe(true);

    component.handleInput?.("\x1b[A");
    const movedRows = component.render(80);
    const unselectedAssistant = movedRows.find(row => stripTerminalSequences(row).includes("assistant: ResponseXYZ"))!;
    const selectedUser = movedRows.find(row => stripTerminalSequences(row).includes("user: QuestionABC"))!;
    expect(stripTerminalSequences(selectedUser)).toContain("→");
    expect(cellStyle(unselectedAssistant, "a")).toEqual(cellStyle(piTheme().fg("warning", "a"), "a"));
    expect(cellStyle(selectedUser, "u")).toEqual(cellStyle(piTheme().fg("success", "u"), "u"));

    component.handleInput?.("\x1b[H");
    const selectedSession = component.render(80).find(row => stripTerminalSequences(row).includes("→ session"))!;
    expect(cellStyle(selectedSession, "s")).toEqual(cellStyle(piTheme().fg("dim", "s"), "s"));
    expect(cellBackgroundAt(selectedSession, stripTerminalSequences(selectedSession).indexOf("s"))).toBe(selectionBackground);

    const hintIndex = plain.findIndex(row => row.includes("type to search"));
    expect(plain.slice(hintIndex, -1).every(row => row.length > 0)).toBe(true);
    expect(plain.at(-1)).toMatch(/^─+$/u);
    expect(cellStyle(rows[hintIndex]!, "↑")).toEqual(cellStyle(piTheme().fg("dim", "↑"), "↑"));
    expect(cellStyle(rows[hintIndex]!, "n")).toEqual(cellStyle(piTheme().fg("muted", "n"), "n"));
    const hints = plain.slice(hintIndex).join("\n");
    expect(hints.indexOf("type to search")).toBeLessThan(hints.indexOf("↑/↓ navigate"));
    expect(hints.indexOf("↑/↓ navigate")).toBeLessThan(hints.indexOf("Tab filter"));
    expect(hints).not.toContain("Enter select");
    expect(plain.some(row => row.includes("Tab filter"))).toBe(true);
    expect(plain.join("\n")).toContain("PgUp/PgDn page");
    expect(plain.join("\n")).toContain("Home/End first/last");
    expect(plain.join("\n")).toContain("←/→ branch");
    expect(plain.join("\n")).not.toContain("Ctrl+O");
    expect(rows.every(row => visibleWidth(row) <= 80)).toBe(true);
    const narrowUser = component.render(24).find(row => stripTerminalSequences(row).includes("user:"))!;
    expect(stripTerminalSequences(narrowUser)).toMatch(/…$/u);
    expect(stripTerminalSequences(narrowUser)).not.toContain("...");

    component.handleInput?.("\t");
    const cycledFilter = component.render(80).find(row => stripTerminalSequences(row).includes("Filter:"))!;
    expect(cellStyle(cycledFilter, "n")).toEqual(cellStyle(piTheme().fg("accent", "n"), "n"));
    expect(cellStyle(cycledFilter, "a")).toEqual(cellStyle(piTheme().fg("muted", "a"), "a"));

    component.handleInput?.("\x1b[F");
    expect(stripTerminalSequences(component.render(80).join("\n"))).toContain("→ assistant: ResponseXYZ");
    component.handleInput?.("\x1b[5~");
    expect(stripTerminalSequences(component.render(80).join("\n"))).toContain("→ session");
    component.handleInput?.("\x1b[6~");
    expect(stripTerminalSequences(component.render(80).join("\n"))).toContain("→ assistant: ResponseXYZ");
    component.handleInput?.("\x1b[H");
    expect(stripTerminalSequences(component.render(80).join("\n"))).toContain("→ session");
    component.handleInput?.("\x1b[F");
    expect(stripTerminalSequences(component.render(80).join("\n"))).toContain("→ assistant: ResponseXYZ");
    component.handleInput?.("\x1b[D");
    const collapsedTree = stripTerminalSequences(component.render(80).join("\n"));
    expect(collapsedTree).toMatch(/→ .*session/u);
    expect(collapsedTree).not.toContain("QuestionABC");
    component.handleInput?.("\x1b[C");
    expect(stripTerminalSequences(component.render(80).join("\n"))).toContain("QuestionABC");
    component.handleInput?.("T");
    const timestampedRows = component.render(80);
    const timestampedFrame = timestampedRows.map(stripTerminalSequences).join("\n");
    const timestampedLabel = timestampedRows.find(row => stripTerminalSequences(row).includes("[hello]"))!;
    expect(timestampedFrame).toMatch(/\(\d\/3\) label time/u);
    expect(timestampedFrame).not.toContain("[+label time]");
    expect(stripTerminalSequences(timestampedLabel)).toContain("[hello] [14:59] user:");
    expect(cellStyle(timestampedLabel, "1")).toEqual(cellStyle(piTheme().fg("accent", "1"), "1"));

    component.handleInput?.("L");
    const labelRows = component.render(80);
    const plainLabelRows = labelRows.map(row => stripTerminalSequences(row).trimEnd());
    const labelTitleIndex = plainLabelRows.findIndex(row => row.trim() === "Label");
    expect(labelTitleIndex).toBe(1);
    expect(cellStyle(labelRows[labelTitleIndex]!, "L")).toEqual(
      cellStyle(piTheme().fg("accent", piTheme().bold("L")), "L"),
    );
    expect(plainLabelRows[labelTitleIndex + 1]?.trim()).toBe("Empty to remove");
    expect(cellStyle(labelRows[labelTitleIndex + 1]!, "E")).toEqual(cellStyle(piTheme().fg("muted", "E"), "E"));
    expect(plainLabelRows[labelTitleIndex + 2]).toBe("");
    expect(plainLabelRows.filter(row => row.trimStart().startsWith(">")).length).toBe(1);
    expect(plainLabelRows.join("\n")).not.toContain("Session Tree");
    expect(plainLabelRows.join("\n")).not.toContain("Filter:");
    expect(plainLabelRows.join("\n")).not.toMatch(/\bmove\b/u);
    const labelHintIndex = plainLabelRows.findIndex(row => row.includes("save") && row.includes("cancel"));
    expect(plainLabelRows[labelHintIndex]).toContain("Enter save  Escape/Ctrl+C cancel");
    expect(plainLabelRows[labelHintIndex + 1]).toBe("─".repeat(80));

    component.handleInput?.("\x1b");
    const restored = component.render(80).map(stripTerminalSequences).join("\n");
    expect(restored).toContain("Session Tree");
    expect(restored).toContain("navigate");
  });

  it.each(REVERSE_TABS)("cycles filters backward for reverse Tab %j without advertising it", async reverseTab => {
    const component = await selector();
    component.handleInput?.(reverseTab);
    const reversedRows = component.render(80);
    const reversedFilter = reversedRows.find(row => stripTerminalSequences(row).includes("Filter:"))!;
    expect(cellStyle(reversedFilter, "b")).toEqual(cellStyle(piTheme().fg("accent", "b"), "b"));
    expect(stripTerminalSequences(reversedRows.join("\n"))).not.toContain("Shift+Tab");

    component.handleInput?.("\t");
    const restoredFilter = component.render(80).find(row => stripTerminalSequences(row).includes("Filter:"))!;
    expect(cellStyle(restoredFilter, "a")).toEqual(cellStyle(piTheme().fg("accent", "a"), "a"));
  });

  it("pages the visible result window with PageUp and PageDown", async () => {
    const children = Array.from({ length: 12 }, (_, index) => ({
      entry: {
        type: "message" as const,
        id: `user-${index}`,
        parentId: "system-page",
        timestamp: new Date(index + 1).toISOString(),
        message: { role: "user" as const, content: [{ type: "text" as const, text: `Question${index}` }], timestamp: index + 1 },
      },
      children: [],
    }));
    const component = await createPiShellTreeSelector({
      tree: [{
        entry: {
          type: "message",
          id: "system-page",
          parentId: null,
          timestamp: new Date(0).toISOString(),
          message: { role: "system", content: "System prompt", timestamp: 0 },
        },
        children,
      }],
      currentLeafId: "user-0",
      terminalHeight: 10,
      onSelect: vi.fn(),
      onCancel: vi.fn(),
      onLabelChange: vi.fn(),
    });

    expect(stripTerminalSequences(component.render(80).join("\n"))).not.toContain("Question5");
    component.handleInput?.("\x1b[6~");
    const nextPage = stripTerminalSequences(component.render(80).join("\n"));
    expect(nextPage).toMatch(/→ .*user: Question5/u);
    expect(nextPage).not.toContain("Question0");
    const clippedSelected = component.render(8).find(row => stripTerminalSequences(row).includes("→"))!;
    expect(stripTerminalSequences(clippedSelected)).toMatch(/^\s*→ ….*…$/u);
    expect(stripTerminalSequences(clippedSelected)).not.toContain("...");
    expect(clippedSelected).toContain("\u001b[48;");
    expect(cellStyle(clippedSelected, "…")).toEqual(
      cellStyle(piTheme().bg("selectedBg", piTheme().fg("muted", "…")), "…"),
    );
    component.handleInput?.("\x1b[5~");
    expect(stripTerminalSequences(component.render(80).join("\n"))).toMatch(/→ .*user: Question0/u);
  });

  it("preserves a bracketed tool row's closing delimiter after truncation", async () => {
    const component = await createPiShellTreeSelector({
      tree: [{
        entry: {
          type: "message",
          id: "tool-system",
          parentId: null,
          timestamp: new Date(0).toISOString(),
          message: { role: "system", content: "System prompt", timestamp: 0 },
        },
        children: [{
          entry: {
            type: "message",
            id: "tool-assistant",
            parentId: "tool-system",
            timestamp: new Date(1).toISOString(),
            message: {
              role: "assistant",
              content: [{ type: "toolCall", id: "call-1", name: "read", arguments: { path: "E:/a/very/long/path/to/a/file.ts" } }],
              stopReason: "toolUse",
              timestamp: 1,
            },
          },
          children: [{
            entry: {
              type: "message",
              id: "tool-result",
              parentId: "tool-assistant",
              timestamp: new Date(2).toISOString(),
              message: { role: "toolResult", toolCallId: "call-1", toolName: "read", content: [{ type: "text", text: "contents" }], timestamp: 2 },
            },
            children: [],
          }],
        }],
      }],
      currentLeafId: "tool-result",
      terminalHeight: 10,
      onSelect: vi.fn(),
      onCancel: vi.fn(),
      onLabelChange: vi.fn(),
    });

    const selected = component.render(24).find(row => stripTerminalSequences(row).includes("→"))!;
    expect(stripTerminalSequences(selected)).toMatch(/…\]$/u);
    expect(stripTerminalSequences(selected)).not.toContain("...");
    expect(selected).toContain("\u001b[48;");
  });

  it("mirrors action-aware typing through the standard input and omits the empty counter", async () => {
    const cancel = vi.fn();
    const component = await selector(cancel);
    component.setFocused?.(true);
    component.handleInput?.("missing");

    let rows = component.render(24);
    let plain = rows.map(row => stripTerminalSequences(row).trimEnd());
    const query = rows.find(row => stripTerminalSequences(row).includes("missing"))!;
    expect(query.indexOf(CURSOR_MARKER)).toBeGreaterThan(query.indexOf("missing"));
    const standard = new Input();
    standard.focused = true;
    standard.setValue("missing");
    expect(cellStyle(query, "m")).toEqual(cellStyle(standard.render(23)[0]!, "m"));
    expect(plain.some(row => row.includes("No entries found"))).toBe(true);
    expect(plain.join("\n")).not.toContain("(0/0)");
    expect(plain.join("\n")).not.toContain("Type to search:");
    expect(rows.every(row => visibleWidth(row) <= 24)).toBe(true);

    component.handleInput?.("\x7f");
    plain = component.render(24).map(row => stripTerminalSequences(row).trimEnd());
    expect(plain.some(row => row.includes("missin"))).toBe(true);
    component.handleInput?.("\x1b");
    plain = component.render(24).map(row => stripTerminalSequences(row).trimEnd());
    expect(plain.join("\n")).not.toContain("missin");
    expect(plain.join("\n")).toMatch(/assistant: Response.*…/u);
    expect(cancel).not.toHaveBeenCalled();
  });
});
