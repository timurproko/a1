import { describe, expect, it, vi } from "vitest";
import { assertOwnedUiTranscriptBlock, type OwnedUiTranscriptBlock } from "../../../../src/contracts/owned-ui/index.js";
import { toolRenderingInput } from "../../../../src/integrations/pi/engine/tool-rendering.js";

const payload = { toolCallId: "test", toolName: "test", isError: false };
function prepare(args: unknown, result?: unknown) {
  return toolRenderingInput({ args, result, payload, image: () => undefined });
}
function block(rendering: ReturnType<typeof prepare>): OwnedUiTranscriptBlock {
  return { id: "tool-test", kind: "tool-result", status: "finalized", revision: 1, title: "test", payload, ...rendering };
}

describe("bounded authoritative tool rendering data", () => {
  it("preserves arrays beyond diagnostic limits, nested metadata, literal json arguments, and empty content boundaries", () => {
    const values = Array.from({ length: 150 }, (_, index) => ({ index }));
    const deep = Array.from({ length: 12 }).reduce<unknown>(value => ({ child: value }), "deep");
    const args = { json: { literalArgument: true }, values };
    const result = prepare(args, { content: [{ type: "text", text: "first" }, { type: "text", text: "" },
      { type: "text", text: "last" }], details: { values, deep } });
    expect(result.toolRendering.arguments).toEqual(args);
    expect(result.toolRendering.arguments).not.toBe(args);
    expect(result.toolRendering.result?.details).toEqual({ values, deep });
    expect(result.text).toBe("first\n\nlast");
    expect(result.toolRendering.result?.content).toEqual([
      { type: "text", start: 0, end: 5 }, { type: "text", start: 6, end: 6 }, { type: "text", start: 7, end: 11 },
    ]);
    values[0]!.index = -1;
    expect(result.toolRendering.result?.details).not.toEqual({ values, deep });
    expect(() => assertOwnedUiTranscriptBlock(block(result))).not.toThrow();
  });

  it.each(["x".repeat(70 * 1024), { invalid: () => {} }, 1n, Number.NaN])("shows a bounded fallback for unsupported/oversized metadata", details => {
    const result = prepare({ path: "valid" }, { content: [{ type: "text", text: "KEEP_RESULT" }], details });
    expect(result.text).toBe("KEEP_RESULT");
    expect(result.toolRendering.arguments).toEqual({ path: "valid" });
    expect(result.toolRendering.unavailable).toContain("Tool details unavailable");
    expect(result.toolRendering.result?.details).toBeUndefined();
    expect(() => assertOwnedUiTranscriptBlock(block(result))).not.toThrow();
  });

  it("rejects cycles without losing supported output", () => {
    const cycle: Record<string, unknown> = {}; cycle.self = cycle;
    const result = prepare(cycle, { content: [{ type: "text", text: "KEEP_RESULT" }], details: cycle });
    expect(result.toolRendering.unavailable).toContain("Tool arguments unavailable");
    expect(result.toolRendering.unavailable).toContain("Tool details unavailable");
    expect(result.text).toBe("KEEP_RESULT");
    expect(() => assertOwnedUiTranscriptBlock(block(result))).not.toThrow();
  });

  it("keeps the combined diagnostic/rendering metadata within the existing 64 KiB budget", () => {
    const largePayload = { summary: "s".repeat(30 * 1024) };
    const result = toolRenderingInput({ args: { value: "a".repeat(25 * 1024) },
      result: { content: [{ type: "text", text: "KEEP_RESULT" }], details: { value: "d".repeat(25 * 1024) } },
      payload: largePayload, image: () => undefined });
    expect(result.toolRendering.result?.details).toBeUndefined();
    expect(result.toolRendering.arguments).toEqual({ value: "a".repeat(25 * 1024) });
    expect(() => assertOwnedUiTranscriptBlock({ ...block(result), payload: largePayload })).not.toThrow();
  });

  it("does not serialize accumulated text or the raw result on partial or final conversion", () => {
    const text = "output".repeat(32_000);
    const raw = { content: [{ type: "text", text }], details: { count: 1 }, toJSON: vi.fn(() => null) };
    const stringify = vi.spyOn(JSON, "stringify");
    try {
      const result = prepare({}, raw);
      expect(result.text).toBe(text);
      expect(raw.toJSON).not.toHaveBeenCalled();
      expect(stringify.mock.calls.some(([value]) => value === text || value === raw || value === raw.content)).toBe(false);
      expect(JSON.stringify(result.toolRendering)).not.toContain(text);
    } finally { stringify.mockRestore(); }
  });

  it("validates references and charges renderer fields to the payload budget", () => {
    const value = block(prepare({}, { content: [{ type: "text", text: "abc" }] }));
    expect(() => assertOwnedUiTranscriptBlock({ ...value, toolRendering: { arguments: {}, result: {
      content: [{ type: "text", start: 0, end: 4 }],
    } } })).toThrow("text end");
    expect(() => assertOwnedUiTranscriptBlock({ ...value, toolRendering: { arguments: {}, result: {
      content: [{ type: "image", imageIndex: 0 }],
    } } })).toThrow("image index");
    expect(() => assertOwnedUiTranscriptBlock({ ...value, kind: "assistant" })).toThrow("requires a tool block");
    expect(() => assertOwnedUiTranscriptBlock({ ...value, toolRendering: { arguments: "x".repeat(64 * 1024) } })).toThrow("byte limit");
  });
});
