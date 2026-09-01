import { describe, expect, it } from "vitest";
import {
  menuRowAt,
  renderValueMenu,
  valueMenuFrame,
  type UiTheme,
  type ValueMenuState,
} from "../../../src/ui/components/index.js";

const NAMING_THEME: UiTheme = {
  fg: (_token, text) => text,
  bold: text => text,
  plain: text => text,
  highlight: text => `<active>${text}</active>`,
  disabled: text => text,
  panel: text => `<panel>${text}</panel>`,
};

const STATE: ValueMenuState = {
  choices: ["auto", "always", "hidden"],
  current: "auto",
  index: 1,
};

describe("shared value menu", () => {
  it("separates the effective mark from the active-row treatment", () => {
    const rendered = renderValueMenu(
      ["under zero", "under one", "under two"],
      STATE,
      { top: 0, column: 2, width: 10, rows: 3 },
      NAMING_THEME,
    );

    expect(rendered[0]).toContain("<panel>✓ auto");
    expect(rendered[1]).toContain("<active>  always");
    expect(rendered[2]).toContain("<panel>  hidden");
    expect(rendered.join("\n")).not.toContain("→");
  });

  it("places below when possible and flips above while clipping at the right rail", () => {
    expect(valueMenuFrame(STATE, { screenRow: 1, valueColumn: 8 }, {
      bodyHeight: 8,
      surfaceWidth: 30,
      reservedRight: 2,
    })).toEqual({ top: 2, column: 8, width: 10, rows: 3 });

    expect(valueMenuFrame(STATE, { screenRow: 5, valueColumn: 27 }, {
      bodyHeight: 7,
      surfaceWidth: 30,
      reservedRight: 2,
    })).toEqual({ top: 2, column: 18, width: 10, rows: 3 });
  });

  it("keeps pointer hit testing inside the visible menu cells", () => {
    const frame = { top: 2, column: 18, width: 10, rows: 3 };
    expect(menuRowAt(frame, 2, 19)).toBe(0);
    expect(menuRowAt(frame, 4, 28)).toBe(2);
    expect(menuRowAt(frame, 2, 18)).toBeNull();
    expect(menuRowAt(frame, 5, 19)).toBeNull();
  });
});
