import { describe, expect, it } from "vitest";
import { applyTerminalDamage, type TerminalDamage, type TerminalSurface } from "../../src/domain/index.js";
import { renderTerminalDamage } from "../../src/presentation/terminal.js";

const modes = {
  applicationCursorKeys: false,
  applicationKeypad: false,
  alternateScroll: false,
  bracketedPaste: true,
  focusReporting: true,
  mouseTracking: "any" as const,
  mouseProtocol: "sgr" as const,
  synchronizedOutput: false,
  wraparound: true,
  keyboardProtocol: "kitty" as const,
  modifyOtherKeys: 0 as const,
  kittyKeyboardFlags: 7,
  win32InputMode: false,
};

const surface: TerminalSurface = {
  columns: 3,
  rows: 2,
  cells: [
    [{ character: "A", width: 1, attributes: 0 }, { character: " ", width: 1, attributes: 0 }, { character: " ", width: 1, attributes: 0 }],
    [{ character: " ", width: 1, attributes: 0 }, { character: " ", width: 1, attributes: 0 }, { character: " ", width: 1, attributes: 0 }],
  ],
  cursor: { column: 1, row: 0, visible: true, style: "block", blinking: true },
  activeScreen: "alternate",
  modes,
  outputSequence: 4,
  revision: 2,
  final: false,
};

const damage: TerminalDamage = {
  generationId: "generation-1",
  baseRevision: 2,
  revision: 5,
  outputSequence: 7,
  dimensions: { columns: 3, rows: 2 },
  spans: [{ row: 1, startColumn: 1, cells: [{ character: "B", width: 1, attributes: 0 }] }],
  cursor: { column: 2, row: 1, visible: false, style: "bar", blinking: false },
  activeScreen: "alternate",
  modes,
  synchronized: true,
  final: false,
};

describe("correlated terminal damage", () => {
  it("applies a synchronized revision jump without replacing unrelated cells", () => {
    const updated = applyTerminalDamage(surface, damage);
    expect(updated.cells[0]?.[0]?.character).toBe("A");
    expect(updated.cells[1]?.[1]?.character).toBe("B");
    expect(updated.revision).toBe(5);
    expect(updated.outputSequence).toBe(7);
  });

  it("applies normal-screen scroll damage before newly exposed rows", () => {
    const normal = {
      ...surface,
      activeScreen: "normal" as const,
      scrollbackBase: 4,
      cells: [
        [{ character: "A", width: 1, attributes: 0 }, { character: " ", width: 1, attributes: 0 }, { character: " ", width: 1, attributes: 0 }],
        [{ character: "B", width: 1, attributes: 0 }, { character: " ", width: 1, attributes: 0 }, { character: " ", width: 1, attributes: 0 }],
      ],
    };
    const updated = applyTerminalDamage(normal, {
      ...damage,
      activeScreen: "normal",
      scrollRows: 1,
      spans: [{ row: 1, startColumn: 0, cells: [{ character: "C", width: 1, attributes: 0 }] }],
    });
    expect(updated.cells[0]?.[0]?.character).toBe("B");
    expect(updated.cells[1]?.[0]?.character).toBe("C");
    expect(updated.scrollbackBase).toBe(5);
  });

  it("rejects gaps and renders only mediated host updates", () => {
    expect(() => applyTerminalDamage({ ...surface, revision: 1 }, damage)).toThrow(/damage gap/i);
    const ansi = renderTerminalDamage(damage);
    expect(ansi).toContain("\x1b[2;2H");
    expect(ansi).toContain("B");
    expect(ansi).not.toContain("\x1b[2J");
    expect(ansi).not.toContain("\x1b[?1049h");
    expect(ansi).not.toContain("\x1b[?1003h");
  });
});
