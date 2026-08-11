import { describe, expect, it } from "vitest";
import { FULL_VIEWPORT_NATIVE_PROJECTION, type TerminalProjectionPolicy, type TerminalRenderTransaction, type TerminalSurface } from "../../src/domain/index.js";
import { projectTerminalRenderTransaction, projectTerminalSnapshot, selectTerminalProjection } from "../../src/presentation/terminal-projection.js";

const modes = {
  applicationCursorKeys: false, applicationKeypad: false, alternateScroll: false,
  bracketedPaste: false, focusReporting: false, mouseTracking: "none" as const,
  mouseProtocol: "x10" as const, synchronizedOutput: false, wraparound: true,
  keyboardProtocol: "legacy" as const, modifyOtherKeys: 0 as const, kittyKeyboardFlags: 0, win32InputMode: false,
};
const surface: TerminalSurface = {
  columns: 4, rows: 3,
  cells: ["ABCD", "EFGH", "IJKL"].map(line => [...line].map(character => ({ character, width: 1, attributes: 0 }))),
  cursor: { column: 2, row: 1, visible: true, style: "block", blinking: true },
  activeScreen: "normal", modes, outputSequence: 1, revision: 1, final: false,
};
const transaction: TerminalRenderTransaction = {
  generationId: "g", baseRevision: 1, revision: 2, sourceSequence: { start: 2, end: 2 }, atomicBoundary: "io-turn",
  dimensions: { columns: 4, rows: 3 },
  operations: [
    { type: "scroll", top: 0, bottom: 2, rows: 1 },
    { type: "erase", row: 2, startColumn: 0, endColumn: 4 },
  ],
  dirtyRanges: [{ row: 2, startColumn: 0, cells: [..."MNOP"].map(character => ({ character, width: 1, attributes: 0 })) }],
  cursor: { column: 3, row: 2, visible: true, style: "bar", blinking: false }, activeScreen: "normal", modes, final: false,
};

describe("generic terminal projection", () => {
  it("selects one native projection solely from full geometry and session policy", () => {
    expect(selectTerminalProjection(FULL_VIEWPORT_NATIVE_PROJECTION, surface)).toMatchObject({ kind: "full-viewport-native" });
    expect(projectTerminalSnapshot(surface, selectTerminalProjection(FULL_VIEWPORT_NATIVE_PROJECTION, surface))).toBe(surface);
  });

  it("clips and translates snapshots, damage, scroll, erase, and cursor for future composition", () => {
    const policy: TerminalProjectionPolicy = { layout: "clipped-composited", screen: "isolated", preserveHostScrollback: false };
    const viewport = { top: 1, left: 1, columns: 2, rows: 2 };
    const plan = selectTerminalProjection(policy, surface, viewport);
    const projectedSurface = projectTerminalSnapshot(surface, plan);
    const projectedTransaction = projectTerminalRenderTransaction(transaction, plan);
    expect(plan.kind).toBe("clipped-composited");
    expect(projectedSurface.cells.map(row => row.map(cell => cell.character).join(""))).toEqual(["FG", "JK"]);
    expect(projectedSurface.cursor).toMatchObject({ column: 1, row: 0, visible: true });
    expect(projectedTransaction.dimensions).toEqual({ columns: 2, rows: 2 });
    expect(projectedTransaction.dirtyRanges[0]).toMatchObject({ row: 1, startColumn: 0 });
    expect(projectedTransaction.dirtyRanges[0]?.cells.map(cell => cell.character).join("")).toBe("NO");
    expect(projectedTransaction.operations).toContainEqual({ type: "scroll", top: 0, bottom: 1, rows: 1 });
    expect(projectedTransaction.operations).toContainEqual({ type: "erase", row: 1, startColumn: 0, endColumn: 2 });
    expect(projectedTransaction.cursor).toMatchObject({ column: 1, row: 1, visible: false });
  });
});
