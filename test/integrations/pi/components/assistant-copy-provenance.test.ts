import { describe, expect, it } from "vitest";
import { createPiShellTranscriptComponent } from "../../../../src/integrations/pi/components/shell-presenters-transcript.js";
import { stripAnsi } from "../../../../src/ui/components/text.js";
import { textSelectionText } from "../../../../src/ui/components/text-selection.js";
import type { OwnedUiTranscriptBlock } from "../../../../src/contracts/owned-ui/index.js";

const block = (text: string, revision = 1): OwnedUiTranscriptBlock => ({
  id: "assistant", kind: "assistant", text, status: "finalized", revision, title: null, payload: {},
});

function component(text: string, padding: 0 | 1 = 1) {
  return createPiShellTranscriptComponent(block(text), "/w", undefined, {
    layout: width => ({ contentWidth: width }), compose: rows => rows,
  }, padding);
}

function copied(value: ReturnType<typeof component>, width: number): string {
  const rendering = value.renderWithCopyMetadata!(width);
  expect(rendering.rows.join("\n")).not.toContain("a1-copy-");
  return textSelectionText({ start: { line: 0, column: 0 }, end: { line: rendering.rows.length - 1, column: 10000 } },
    rendering.rows, line => ({ excludedColumns: rendering.copyExclusions.get(line) ?? [] })).trim();
}

describe("assistant copy provenance", () => {
  it.each([0, 1] as const)("keeps rendered rows identical and excludes quote borders and padding (pad=%s)", padding => {
    const text = "> Diagnose the worker-close refusal and capture the exact error.\n>\n> Do not merge anything.";
    const owned = component(text, padding);
    const pinned = createPiShellTranscriptComponent(block(text), "/w", undefined, undefined, padding);
    for (const width of [20, 48, 80, 3, 8, 1]) {
      expect(owned.render(width)).toEqual(pinned.render(width));
      const result = copied(owned, width);
      expect(result).not.toContain("│");
      expect(result.split("\n").filter(Boolean).every(row => !row.startsWith(" "))).toBe(true);
    }
  });

  it("removes only code-renderer indentation, preserving nested source indentation and literal borders", () => {
    const value = component("```\nabcd\n    efgh\n  │ literal\n```\n\n> Quote with a literal │ border.\n>\n> ```\n> alpha\n>   beta\n> ```");
    expect(copied(value, 80)).toBe("```\nabcd\n    efgh\n  │ literal\n```\n\nQuote with a literal │ border.\n\n```\nalpha\n  beta\n```");
  });

  it("retains source-only list nesting and paragraphs", () => {
    const value = component("A paragraph with enough words to wrap across multiple rows.\n\n- first item\n  - nested item");
    const result = copied(value, 25);
    expect(result).toContain("A paragraph");
    expect(result).toContain("\n    - nested item");
    expect(result).not.toContain("\n A");
  });

  it("refreshes boundaries after streaming updates, width changes, padding changes, and invalidation", () => {
    const value = component("> old quote");
    expect(copied(value, 20)).toBe("old quote");
    value.update(block("```\nfirst\n    second\n```", 2));
    for (const width of [20, 40, 20]) expect(copied(value, width)).toBe("```\nfirst\n    second\n```");
    value.setOutputPad(0);
    expect(copied(value, 20)).toBe("```\nfirst\n    second\n```");
    value.invalidate();
    expect(copied(value, 20)).toBe("```\nfirst\n    second\n```");
    value.update(block("> new quote 界 é 👩‍💻", 3));
    expect(copied(value, 40)).toBe("new quote 界 é 👩‍💻");
  });

  it("does not interpret literal border text as renderer decoration", () => {
    expect(copied(component("Literal │ border\n\n```\n│ keep\n    │ also keep\n```"), 80))
      .toBe("Literal │ border\n\n```\n│ keep\n    │ also keep\n```");
  });

  it("leaves comparison-profile copy metadata empty", () => {
    const value = createPiShellTranscriptComponent(block("> quote"), "/w");
    const rendering = value.renderWithCopyMetadata!(20);
    expect(rendering.copyExclusions.size).toBe(0);
    expect(rendering.rows.map(stripAnsi).join("\n")).toContain(" │ quote");
  });
});
