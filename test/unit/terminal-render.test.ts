import { describe, expect, it } from "vitest";
import { renderTerminalNormalSnapshot, renderTerminalSnapshot } from "../../src/presentation/terminal.js";
import type { TerminalSurface } from "../../src/domain/index.js";
import { TERMINAL_ATTRIBUTES } from "../../src/domain/index.js";

describe("styled terminal snapshot rendering", () => {
  it("restores colors, attributes, modes, and cursor without composite chrome", () => {
    const surface: TerminalSurface = {
      columns: 2,
      rows: 1,
      cells: [[
        {
          character: "A",
          width: 1,
          foreground: { mode: "rgb", value: 0x12_34_56 },
          background: { mode: "palette", value: 24 },
          attributes: TERMINAL_ATTRIBUTES.bold | TERMINAL_ATTRIBUTES.underline,
        },
        { character: "界", width: 2, attributes: TERMINAL_ATTRIBUTES.italic },
      ]],
      cursor: { column: 1, row: 0, visible: false, style: "bar", blinking: false },
      activeScreen: "alternate",
      modes: {
        applicationCursorKeys: true,
        applicationKeypad: true,
        alternateScroll: true,
        bracketedPaste: true,
        focusReporting: true,
        mouseTracking: "any",
        mouseProtocol: "sgr",
        synchronizedOutput: false,
        wraparound: true,
        keyboardProtocol: "kitty",
        modifyOtherKeys: 0,
        kittyKeyboardFlags: 7,
        win32InputMode: false,
      },
      outputSequence: 9,
      revision: 3,
      final: false,
    };

    const ansi = renderTerminalSnapshot(surface);
    expect(ansi).toContain("38;2;18;52;86;48;5;24m");
    expect(ansi).not.toContain("\x1b[?1049h");
    expect(ansi).not.toContain("\x1b[?2004h");
    expect(ansi).not.toContain("\x1b[?1004h");
    expect(ansi).not.toContain("\x1b[?1003h");
    expect(ansi).not.toContain("\x1b[?1006h");
    expect(ansi).not.toContain("\x1b[K");
    expect(ansi).toContain("\x1b[6 q\x1b[?25l");
    expect(ansi).not.toContain("[ + ]");

    const normal = renderTerminalNormalSnapshot({
      ...surface,
      activeScreen: "normal",
      scrollbackCells: [[{ character: "H", width: 1, attributes: 0 }, { character: "I", width: 1, attributes: 0 }]],
    });
    expect(normal.indexOf("H")).toBeLessThan(normal.indexOf("A"));
    expect(normal).toContain("\r\n");
    expect(normal).not.toContain("\x1b[?1049h");
  });
});
