import { describe, expect, it } from "vitest";
import {
  menuRowAt,
  renderValueMenu,
  valueMenuFrame,
  type UiTheme,
  type ValueMenuState,
} from "../../../src/ui/components/index.js";

const PLAIN_THEME: UiTheme = {
  fg: (_token, text) => text,
  bold: text => text,
  plain: text => text,
  highlight: text => text,
  disabled: text => text,
  panel: text => text,
};

const NAMING_THEME: UiTheme = {
  fg: (token, text) => `<${token}>${text}</${token}>`,
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

    expect(rendered[0]).toContain("<panel><text>✓</text></panel><panel> auto");
    expect(rendered[1]).toContain("<active>  always");
    expect(rendered[2]).toContain("<panel>  hidden");
    expect(rendered.join("\n")).not.toContain("→");

    const activeCurrent = renderValueMenu(
      ["under zero", "under one", "under two"],
      { ...STATE, index: 0 },
      { top: 0, column: 2, width: 10, rows: 3 },
      NAMING_THEME,
    );
    expect(activeCurrent[0]).toContain("<active><text>✓</text></active><active> auto");
    expect(activeCurrent.join("\n")).not.toContain("<accent>✓</accent>");
  });

  it("aligns optional colored previews before labels without coloring the current mark", () => {
    const state = {
      choices: ["default", "blue"],
      previews: ["\u001b[35m■\u001b[39m", "\u001b[34m■\u001b[39m"],
      current: "default",
      index: 0,
    } satisfies ValueMenuState;
    const frame = valueMenuFrame(state, { screenRow: 1, valueColumn: 10 }, {
      bodyHeight: 8,
      surfaceWidth: 30,
      reservedRight: 2,
    });
    expect(frame).toEqual({ top: 1, column: 6, width: 13, rows: 2 });

    const rendered = renderValueMenu([" ".repeat(30), " ".repeat(30), " ".repeat(30), " ".repeat(30)], state, frame, NAMING_THEME);
    expect(rendered[frame.top]).toContain("<active><text>✓</text></active><active> \u001b[35m■\u001b[39m default");
    expect(rendered[frame.top + 1]).toContain("<panel>  \u001b[34m■\u001b[39m blue");
    expect(rendered.join("\n")).not.toContain("<accent>✓</accent>");
  });

  it("lays the value in effect over its anchor, shifting only at the body edges", () => {
    const aligned = valueMenuFrame(STATE, { screenRow: 1, valueColumn: 8 }, {
      bodyHeight: 8,
      surfaceWidth: 30,
      reservedRight: 2,
    });
    expect(aligned).toEqual({ top: 1, column: 6, width: 10, rows: 3 });
    const rendered = renderValueMenu([" ".repeat(30), " ".repeat(30), " ".repeat(30), " ".repeat(30), " ".repeat(30)], STATE, aligned, PLAIN_THEME);
    expect(rendered[aligned.top]?.indexOf("auto")).toBe(8);
    expect(rendered[aligned.top + 1]?.indexOf("always")).toBe(8);

    // Invariant: a later choice in effect pulls the menu up so it still lands on the anchor.
    expect(valueMenuFrame({ ...STATE, current: "hidden" }, { screenRow: 4, valueColumn: 8 }, {
      bodyHeight: 8,
      surfaceWidth: 30,
      reservedRight: 2,
    })).toEqual({ top: 2, column: 6, width: 10, rows: 3 });

    expect(valueMenuFrame(STATE, { screenRow: 5, valueColumn: 27 }, {
      bodyHeight: 7,
      surfaceWidth: 30,
      reservedRight: 2,
    })).toEqual({ top: 4, column: 18, width: 10, rows: 3 });

    // Invariant: fixed screen chrome is not available when the menu is pushed off an edge.
    expect(valueMenuFrame({ ...STATE, current: "hidden" }, { screenRow: 3, valueColumn: 8 }, {
      bodyTop: 2,
      bodyHeight: 4,
      surfaceWidth: 30,
      reservedRight: 2,
    })).toEqual({ top: 2, column: 6, width: 10, rows: 3 });
  });

  it("keeps pointer hit testing inside the visible menu cells", () => {
    const frame = { top: 2, column: 18, width: 10, rows: 3 };
    expect(menuRowAt(frame, 2, 19)).toBe(0);
    expect(menuRowAt(frame, 4, 28)).toBe(2);
    expect(menuRowAt(frame, 2, 18)).toBeNull();
    expect(menuRowAt(frame, 5, 19)).toBeNull();
  });
});
