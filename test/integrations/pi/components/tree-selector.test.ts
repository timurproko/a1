import { CURSOR_MARKER, Input, stripTerminalSequences, visibleWidth } from "@earendil-works/pi-tui";
import { describe, expect, it, vi } from "vitest";
import { createPiShellTreeSelector, piTheme } from "../../../../src/integrations/pi/components/index.js";
import { cellStyle } from "../../../support/ansi-cell-style.js";

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
        type: "message",
        id: "user-1",
        parentId: "system-1",
        timestamp: new Date(1).toISOString(),
        message: { role: "user", content: [{ type: "text", text: "QuestionABC" }], timestamp: 1 },
      },
      children: [{
        entry: {
          type: "message",
          id: "assistant-1",
          parentId: "user-1",
          timestamp: new Date(2).toISOString(),
          message: { role: "assistant", content: [{ type: "text", text: "ResponseXYZ" }], timestamp: 2 },
        },
        children: [],
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
    expect(plain[2]).toBe("");
    expect(plain[3]).toBe(" >");
    expect(plain.some(row => row.includes("Type to search:"))).toBe(false);
    expect(plain.filter(row => /^─+$/u.test(row))).toHaveLength(2);

    const title = rows[1]!;
    expect(cellStyle(title, "S")).toEqual(cellStyle(piTheme().fg("accent", piTheme().bold("S")), "S"));

    const selected = rows.find(row => stripTerminalSequences(row).includes("assistant: ResponseXYZ"))!;
    expect(stripTerminalSequences(selected)).toContain("→ assistant: ResponseXYZ");
    expect(stripTerminalSequences(selected)).not.toContain("•");
    expect(selected).not.toContain("\u001b[48;");
    expect(selected).not.toContain("\u001b[1m");
    expect(cellStyle(selected, "→")).toEqual(cellStyle(piTheme().fg("accent", "→"), "→"));
    expect(cellStyle(selected, "a")).toEqual(cellStyle(piTheme().fg("accent", "a"), "a"));
    expect(cellStyle(selected, "X")).toEqual(cellStyle(piTheme().fg("muted", "X"), "X"));
    const unselected = rows.find(row => stripTerminalSequences(row).includes("user: QuestionABC"))!;
    expect(cellStyle(unselected, "u")).toEqual(cellStyle(piTheme().fg("success", "u"), "u"));
    expect(cellStyle(unselected, "Q")).toEqual(cellStyle(piTheme().fg("muted", "Q"), "Q"));
    const system = rows.find(row => stripTerminalSequences(row).trim() === "system")!;
    expect(system).toBeDefined();
    expect(plain.join("\n")).not.toContain("[system]");
    expect(plain.some(row => row.includes("(3/3)"))).toBe(true);

    component.handleInput?.("\x1b[A");
    const movedRows = component.render(80);
    const unselectedAssistant = movedRows.find(row => stripTerminalSequences(row).includes("assistant: ResponseXYZ"))!;
    expect(cellStyle(unselectedAssistant, "a")).toEqual(cellStyle(piTheme().fg("warning", "a"), "a"));

    const hintIndex = plain.findIndex(row => row.includes("move"));
    expect(plain.slice(hintIndex, -1).every(row => row.length > 0)).toBe(true);
    expect(plain.at(-1)).toMatch(/^─+$/u);
    expect(cellStyle(rows[hintIndex]!, "↑")).toEqual(cellStyle(piTheme().fg("dim", "↑"), "↑"));
    expect(cellStyle(rows[hintIndex]!, "m")).toEqual(cellStyle(piTheme().fg("muted", "m"), "m"));
    expect(rows.every(row => visibleWidth(row) <= 80)).toBe(true);
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
    expect(plain.join("\n")).toContain("assistant: Response");
    expect(cancel).not.toHaveBeenCalled();
  });
});
