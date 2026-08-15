import { describe, expect, it } from "vitest";
import type { OwnedUiTranscriptBlock } from "../../../src/foundation/owned-ui-contracts/index.js";
import {
  createOwnedTranscriptRenderer,
  OwnedTranscriptHistory,
  renderOwnedTranscriptBlock,
  sanitizeDisplayText,
  wrapVisible,
} from "../../../src/features/owned-ui/index.js";

function block(kind: OwnedUiTranscriptBlock["kind"], text: string, status: "live" | "finalized" = "finalized"): OwnedUiTranscriptBlock {
  return {
    id: `${kind}-1`,
    kind,
    status,
    revision: 1,
    title: kind.startsWith("tool") ? "read" : null,
    text,
    payload: kind === "tool-result" ? { isError: false } : {},
  };
}

describe("owned transcript renderer", () => {
  it("renders user, assistant, thinking, tool, retry, compaction, error, and system blocks", () => {
    const renderer = createOwnedTranscriptRenderer();
    const blocks = [
      block("user", "Inspect"),
      block("assistant", "Done"),
      block("thinking", "Plan"),
      block("tool-call", "{ path: README.md }"),
      block("tool-result", "loaded"),
      block("retry", "again"),
      block("compaction", "summary"),
      block("error", "failed"),
      block("system", "notice"),
    ];
    const rendered = blocks.flatMap(value => renderer(value, 80));
    expect(rendered.join("\n")).toContain("you › Inspect");
    expect(rendered.join("\n")).toContain("thinking › Plan");
    expect(rendered.join("\n")).toContain("◆ read ›");
    expect(rendered.join("\n")).toContain("✓ read › loaded");
    expect(rendered.join("\n")).toContain("retry › again");
    expect(rendered.join("\n")).toContain("compact › summary");
    expect(rendered.join("\n")).toContain("error › failed");
    expect(rendered.join("\n")).toContain("system › notice");
  });

  it("sanitizes controls and wraps long and Unicode content at resize boundaries", () => {
    expect(sanitizeDisplayText("a\tb\x07c\r\nd")).toBe("a  bc\nd");
    expect(wrapVisible("hello world", 6)).toEqual(["hello", "world"]);
    const rows = renderOwnedTranscriptBlock(block("assistant", "alpha 界🙂 beta"), 12);
    for (const row of rows) expect(row.length).toBeLessThanOrEqual(12);

    const narrow = renderOwnedTranscriptBlock(block("assistant", "alpha beta gamma"), 8);
    const wide = renderOwnedTranscriptBlock(block("assistant", "alpha beta gamma"), 20);
    expect(narrow.length).toBeGreaterThan(wide.length);
  });

  it("preserves append-only history across streaming and resize", () => {
    const renderer = createOwnedTranscriptRenderer();
    const history = new OwnedTranscriptHistory(10, renderer);
    const user = block("user", "Run tests");
    const assistant = { ...block("assistant", "Running"), id: "assistant-live", status: "live" as const };

    const initial = history.render([user, assistant]);
    expect(initial.committedRows).toEqual(["you › Run ", "      test", "      s"]);
    expect(initial.liveRows).toEqual(["Running"]);

    const streamed = history.render([user, { ...assistant, text: "Running npm tests", revision: 2 }]);
    expect(streamed.committedRows).toEqual(initial.committedRows);
    expect(streamed.liveRows).toEqual(["Running", "npm tests"]);

    const resized = history.render([user, { ...assistant, text: "Running npm tests", revision: 2 }], 6);
    expect(resized.fullPaint).toBe(true);
    expect(resized.committedRows).toEqual(["you › ", "Run", "tests"]);
  });
});
