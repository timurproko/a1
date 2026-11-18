import { describe, expect, it } from "vitest";
import { DialogPointer, PLAIN_THEME, renderDialogPanel, renderSteppedDialogPanel } from "../../../src/ui/components/index.js";

describe("semantic dialog pointer targets", () => {
  it("reserves the shared rail gap/cell without making either a row action", () => {
    const pointer = new DialogPointer<number>();
    let firstRow = 0;
    const lines = renderSteppedDialogPanel({ title: "Choose", rows: [{ label: "a long clipped choice 東京", value: "" }], index: 0, hint: [], pointer,
      onChoiceLayout: layout => { firstRow = layout.firstRow; expect(layout.railColumn).toBe(18); },
      choiceRail: () => " ┃",
    }, 20, PLAIN_THEME);
    expect(lines.every(line => line.length <= 20)).toBe(true);
    expect(lines[firstRow - 1]).toContain(" ┃  ");
    expect(pointer.handle({ kind: "press", button: 0, row: firstRow, column: 18 })).toBeUndefined();
    expect(pointer.handle({ kind: "press", button: 0, row: firstRow, column: 17 })).toBeUndefined();
    expect(pointer.handle({ kind: "press", button: 0, row: firstRow, column: 5 })).toBe(0);
  });

  it("keeps hover separate from keyboard state and activates only primary presses", () => {
    const pointer = new DialogPointer<string>();
    pointer.replace([{ key: "B", row: 3, columnStart: 5, columnEnd: 8 }]);
    expect(pointer.handle({ kind: "motion", button: 3, column: 6, row: 3 })).toBeUndefined();
    expect(pointer.hovered).toBe("B");
    expect(pointer.handle({ kind: "wheel-down", button: 0, column: 6, row: 3 })).toBeUndefined();
    expect(pointer.handle({ kind: "press", button: 2, column: 6, row: 3 })).toBeUndefined();
    expect(pointer.handle({ kind: "press", button: 0, column: 6, row: 3 })).toBe("B");
    pointer.replace([{ key: "B", row: 4, columnStart: 5, columnEnd: 8 }]);
    expect(pointer.hovered).toBeUndefined();
    expect(pointer.handle({ kind: "press", button: 0, column: 6, row: 3 })).toBeUndefined();
    pointer.invalidate();
    expect(pointer.handle({ kind: "press", button: 0, column: 6, row: 4 })).toBeUndefined();
  });

  it.each([false, true])("shares exact row geometry with the stepped panel (compact %s)", compact => {
    const pointer = new DialogPointer<number>();
    const state = { title: "Choose", rows: [{ label: "Alpha", value: "" }, { label: "東京", value: "" }], index: 0, hint: [], compact, pointer };
    const lines = renderSteppedDialogPanel(state, 20, PLAIN_THEME);
    const row = lines.findIndex(line => line.includes("東京")) + 1;
    expect(pointer.handle({ kind: "motion", button: 3, column: 5, row })).toBeUndefined();
    expect(pointer.hovered).toBe(1);
    expect(state.index).toBe(0);
    expect(pointer.handle({ kind: "press", button: 0, column: 8, row })).toBe(1);
    expect(pointer.handle({ kind: "press", button: 0, column: 9, row })).toBeUndefined();
    expect(pointer.handle({ kind: "press", button: 0, column: 4, row })).toBeUndefined();
  });

  it("paints only hovered text while retaining the keyboard row and metadata roles", () => {
    const pointer = new DialogPointer<number>();
    const theme = { ...PLAIN_THEME, hover: (role: string, text: string) => `[hover:${role}:${text}]`, highlight: (text: string) => `[active:${text}]` };
    const state = { title: "Configure", rows: [{ label: "A", value: "on" }, { label: "B", value: "off" }], index: 0, hint: [], pointer };
    const before = renderDialogPanel(state, 80, theme);
    const row = before.findIndex(line => line.includes("B")) + 1;
    pointer.handle({ kind: "motion", button: 3, column: 5, row });
    const after = renderDialogPanel(state, 80, theme);
    expect(after.find(line => line.includes("→"))).toBe(before.find(line => line.includes("→")));
    expect(after[row - 1]).toContain("[hover:text:B]");
    expect(after[row - 1]).toContain("[hover:muted:off]");
    expect(state.index).toBe(0);
    pointer.clearHover();
    expect(renderDialogPanel(state, 80, theme)).toEqual(before);
  });
});
