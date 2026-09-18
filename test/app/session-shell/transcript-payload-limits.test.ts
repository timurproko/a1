import { afterEach, describe, expect, it, vi } from "vitest";
import { Text } from "@earendil-works/pi-tui";
import { assertOwnedUiTranscriptBlock } from "../../../src/contracts/owned-ui/index.js";
import { assistantCall, transcriptLifecycleFixture } from "../../support/rendering/transcript-lifecycle-fixture.js";

const active: Awaited<ReturnType<typeof transcriptLifecycleFixture>>[] = [];
afterEach(async () => { for (const fixture of active.splice(0)) await fixture.dispose(); });

async function fixture() {
  const renderResult = vi.fn(() => new Text("VISIBLE_RESULT", 0, 0));
  const value = await transcriptLifecycleFixture({ messages: [{ role: "user", timestamp: 1, content: "STABLE_HISTORY" }],
    definitions: new Map([["payload", { name: "payload", renderResult }]]) });
  active.push(value);
  return { ...value, renderResult };
}

describe("renderer payload delivery limits", () => {
  it.each([false, true])("bounds large accumulated payloads without serializing raw output (final=%s)", async final => {
    const value = await fixture();
    const args = { input: "a".repeat(10_000) };
    const text = "output ".repeat(30_000);
    const details = { frame: 0, values: Array.from({ length: 300 }, (_, index) => ({ index, text: "detail" })) };
    const result = { content: [{ type: "text", text }], details, toJSON: vi.fn(() => { throw new Error("raw result serialized"); }) };
    await value.emit({ type: "message_end", message: assistantCall("payload", "payload", args) },
      { type: "tool_execution_start", toolCallId: "payload", toolName: "payload", args });
    const stringify = vi.spyOn(JSON, "stringify");
    try {
      for (let n = 0; n < 128; n++) {
        details.frame = n;
        value.session.emit({ type: "tool_execution_update", toolCallId: "payload", toolName: "payload", partialResult: result });
      }
      if (final) value.session.emit({ type: "tool_execution_end", toolCallId: "payload", toolName: "payload", result, isError: false });
      await value.backend.flushEvents();
      expect(result.toJSON).not.toHaveBeenCalled();
      expect(stringify.mock.calls.some(([input]) => input === text || input === result || input === result.content)).toBe(false);
    } finally { stringify.mockRestore(); }
    const block = value.backend.view().transcript.at(-1)!;
    expect(block.text).toBe(text);
    expect(block.toolRendering?.arguments).toEqual(args);
    expect(block.toolRendering?.result?.details).toEqual(details);
    expect(block.toolRendering?.unavailable).toBeUndefined();
    expect(block.status).toBe(final ? "finalized" : "live");
    expect(() => assertOwnedUiTranscriptBlock(block)).not.toThrow();
    expect(value.renderResult).toHaveBeenLastCalledWith({ content: result.content, details },
      expect.objectContaining({ isPartial: !final }), expect.anything(), expect.objectContaining({ args }));
    const pressure = value.backend.deliveryDiagnostics();
    expect(pressure.peakNodes).toBeLessThanOrEqual(1024);
    expect(pressure.peakBytes).toBeLessThanOrEqual(8 * 1024 * 1024);
    expect(pressure.superseded).toBeGreaterThan(100);
    expect(pressure.overloads).toBe(0);
  });

  it("publishes an oversized-text fallback while preserving history, other result parts, details, and error disposition", async () => {
    const value = await fixture();
    await value.emit({ type: "tool_execution_end", toolCallId: "payload", toolName: "payload", args: {}, isError: true,
      result: { content: [{ type: "text", text: "x".repeat(300_000) }, { type: "text", text: "KEEP_RESULT" }], details: { errorCode: 7 } } });
    const block = value.backend.snapshot().view.transcript.at(-1)!;
    expect(block.text).toBe("KEEP_RESULT");
    expect(block.toolState?.execution).toBe("failed");
    expect(block.toolRendering?.result?.details).toEqual({ errorCode: 7 });
    const rows = value.shell.root.render(80).join("\n");
    expect(rows).toContain("Tool text unavailable");
    expect(rows).toContain("STABLE_HISTORY");
    expect(rows).toContain("VISIBLE_RESULT");
  });
});
