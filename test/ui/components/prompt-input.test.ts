import { describe, expect, it } from "vitest";
import { LineInput, PLAIN_THEME, PromptInput, displayWidth, promptArrow, promptRule, renderInputRow, stripAnsi } from "../../../src/ui/components/index.js";

import { cellStyle } from "../../support/ansi-cell-style.js";

const theme = { ...PLAIN_THEME, fg: (_token: string, text: string) => `\u001b[38;2;201;202;203m${text}\u001b[39m` };


describe("shared prompt input presentation", () => {
  it.each([1, 2, 3, 8, 24, 80])("fits empty, filled, multiline and wide rows at width %i", width => {
    const input = new PromptInput(theme);
    for (const body of [[""], ["hello"], ["one", "two"], ["日本語🙂", "e\u0301"]]) {
      const rows = input.render(width, () => ({ rows: body }));
      expect(rows).toHaveLength(body.length + 2);
      expect(rows.every(row => displayWidth(row) === width)).toBe(true);
      expect(rows[0]).toBe(promptRule(width));
      expect(rows.at(-1)).toBe(promptRule(width));
    }
    expect(input.render(0, () => ({ rows: ["ignored"] }))).toEqual([]);
  });

  it("shares the search frame, prefix, caret, and quiet placeholder without dimming chrome", () => {
    const search = renderInputRow(new LineInput(""), 30, { placeholder: "Search settings", theme }).lines;
    expect(search[0]).toBe(promptRule(30));
    expect(search[2]).toBe(promptRule(30));
    expect(search[1]).toContain("\u001b[7mS\u001b[27m");
    expect(cellStyle(search[1]!, "❯")).toEqual(cellStyle(promptArrow("❯", theme), "❯"));
    expect(cellStyle(search[1]!, "❯").faint).toBe(false);
    expect(cellStyle(search[1]!, "e").faint).toBe(true);
    expect(cellStyle(search[2]!, "─")).toEqual({ foreground: "154;160;166", faint: false });
    expect(renderInputRow(new LineInput("hello"), 20, { ruled: false, theme }).lines).toHaveLength(1);
  });

  it("retains semantic annotations and aligns continuation and menu rows", () => {
    const input = new PromptInput(theme);
    const rows = input.render(20, innerWidth => {
      expect(innerWidth).toBe(18);
      return { rows: ["first", "second"], topRule: "─── 1/3 ─", bottomRule: "──↓ 2──", after: ["menu"] };
    }).map(stripAnsi);
    expect(rows[0]).toBe("─── 1/3 ────────────");
    expect(rows[1]?.trimEnd()).toBe("❯ first");
    expect(rows[2]?.trimEnd()).toBe("  second");
    expect(rows[3]).toContain("↓ 2");
    expect(rows[4]?.trimEnd()).toBe("  menu");
    expect(input.geometry(10, 2)).toEqual({ prefixWidth: 2, innerWidth: 8, paddingX: 2, contentWidth: 4, layoutWidth: 4 });
    expect(input.geometry(2, 3).contentWidth).toBe(3);
  });
});
