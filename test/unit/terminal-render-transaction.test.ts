import { describe, expect, it } from "vitest";
import { applyTerminalRenderTransaction, type TerminalRenderTransaction, type TerminalSurface } from "../../src/domain/index.js";

const modes = {
  applicationCursorKeys: false, applicationKeypad: false, alternateScroll: false,
  bracketedPaste: false, focusReporting: false, mouseTracking: "none" as const,
  mouseProtocol: "x10" as const, synchronizedOutput: false, wraparound: true,
  keyboardProtocol: "legacy" as const, modifyOtherKeys: 0 as const,
  kittyKeyboardFlags: 0, win32InputMode: false,
};
const surface: TerminalSurface = {
  columns: 2, rows: 2,
  cells: [
    [{ character: "A", width: 1, attributes: 0 }, { character: " ", width: 1, attributes: 0 }],
    [{ character: "B", width: 1, attributes: 0 }, { character: " ", width: 1, attributes: 0 }],
  ],
  cursor: { column: 0, row: 1, visible: true, style: "default", blinking: true },
  activeScreen: "normal", modes, scrollbackBase: 0, outputSequence: 2, revision: 3, final: false,
};

function transaction(overrides: Partial<TerminalRenderTransaction> = {}): TerminalRenderTransaction {
  return {
    generationId: "generation-1", baseRevision: 3, revision: 4,
    sourceSequence: { start: 3, end: 5 }, atomicBoundary: "synchronized-output",
    dimensions: { columns: 2, rows: 2 },
    operations: [{ type: "scroll", top: 0, bottom: 1, rows: 1 }],
    dirtyRanges: [{ row: 1, startColumn: 0, cells: [{ character: "C", width: 1, attributes: 0 }] }],
    cursor: { column: 1, row: 1, visible: true, style: "bar", blinking: false },
    activeScreen: "normal", modes, final: false,
    ...overrides,
  };
}

describe("TerminalRenderTransaction contract", () => {
  it("correlates a complete source range with ordered operations, dirty ranges, cursor, modes, and final state", () => {
    const updated = applyTerminalRenderTransaction(surface, transaction());
    expect(updated.cells[0]?.[0]?.character).toBe("B");
    expect(updated.cells[1]?.[0]?.character).toBe("C");
    expect(updated.cursor.style).toBe("bar");
    expect(updated.outputSequence).toBe(5);
    expect(updated.revision).toBe(4);
  });

  it("rejects reversed source sequence ranges", () => {
    expect(() => applyTerminalRenderTransaction(surface, transaction({ sourceSequence: { start: 6, end: 5 } }))).toThrow(/sequence range is reversed/i);
  });
});
