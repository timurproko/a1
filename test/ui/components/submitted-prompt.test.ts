import { describe, expect, it } from "vitest";
import {
  composeSubmittedPromptRows,
  displayWidth,
  submittedPromptLayout,
} from "../../../src/ui/components/index.js";

describe("submitted prompt rows", () => {
  it("uses a compact prefix, continuation indentation, and no trailing timestamp", () => {
    const rows = composeSubmittedPromptRows(["first row", "continued"], 34);
    expect(rows[0]).toBe(" ❯ first row");
    expect(rows[1]).toBe("   continued");
    expect(rows.every(row => displayWidth(row) <= 34)).toBe(true);
  });

  it("reserves only the prefix width for prompt content", () => {
    expect(submittedPromptLayout(14).contentWidth).toBe(11);
    expect(composeSubmittedPromptRows(["complete prompt"], 14)[0]).toBe(" ❯ complete pr");
  });

  it("keeps wide and styled content within the terminal width", () => {
    const rows = composeSubmittedPromptRows(["\u001b[36m界🙂 prompt\u001b[39m"], 28, {});
    expect(displayWidth(rows[0] ?? "")).toBeLessThanOrEqual(28);
    expect(composeSubmittedPromptRows(["resumed"], 20)).toEqual([" ❯ resumed"]);
  });
});
