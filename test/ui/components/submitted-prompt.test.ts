import { describe, expect, it } from "vitest";
import {
  composeSubmittedPromptRows,
  displayWidth,
  formatSubmittedPromptTime,
  submittedPromptLayout,
} from "../../../src/ui/components/index.js";

describe("submitted prompt rows", () => {
  it("uses the source time, a compact prefix, and continuation indentation", () => {
    const source = new Date(2026, 3, 2, 9, 7);
    const rows = composeSubmittedPromptRows(["first row", "continued"], 32, source);
    expect(formatSubmittedPromptTime(source)).toBe("09:07");
    expect(rows[0]).toMatch(/^❯ first row\s+09:07$/);
    expect(rows[1]).toBe("  continued");
    expect(rows.every(row => displayWidth(row) <= 32)).toBe(true);
  });

  it("omits only the timestamp when width cannot leave useful prompt content", () => {
    const source = new Date(2026, 3, 2, 9, 7);
    expect(submittedPromptLayout(14, source).timestamp).toBeNull();
    expect(composeSubmittedPromptRows(["complete prompt"], 14, source)[0]).toBe("❯ complete pro");
  });

  it("measures styled and wide-character content by terminal columns", () => {
    const source = new Date(2026, 3, 2, 23, 5);
    const rows = composeSubmittedPromptRows(["\u001b[36m界🙂 prompt\u001b[39m"], 28, source);
    expect(rows[0]).toContain("23:05");
    expect(displayWidth(rows[0] ?? "")).toBeLessThanOrEqual(28);
  });

  it("rejects an invalid resumed timestamp without changing the text", () => {
    expect(formatSubmittedPromptTime(Number.NaN)).toBeNull();
    expect(composeSubmittedPromptRows(["resumed"], 20, Number.NaN)).toEqual(["❯ resumed"]);
  });
});
