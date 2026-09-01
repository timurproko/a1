import { describe, expect, it } from "vitest";
import { progressStatusText } from "../../../src/ui/components/index.js";

describe("progress status text", () => {
  it.each([
    ["Working", "Working..."],
    ["Compacting…", "Compacting..."],
    ["Retrying.", "Retrying..."],
    ["Indexing......", "Indexing..."],
    ["Already...", "Already..."],
    ["Keeps… interior text", "Keeps… interior text..."],
    ["Keeps.periods.inside", "Keeps.periods.inside..."],
  ])("normalizes %j to one three-period progress marker", (input, expected) => {
    const rendered = progressStatusText(input);
    expect(rendered).toBe(expected);
    expect(rendered.endsWith("...")).toBe(true);
    expect(rendered.endsWith("....")).toBe(false);
  });
});
