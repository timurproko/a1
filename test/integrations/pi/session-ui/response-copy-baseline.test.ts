import { describe, expect, it } from "vitest";
import { TranscriptViewport } from "../../../../src/ui/components/transcript-viewport.js";

/** Synthetic phase attribution, never a reproduction of the user's physical terminal stall. */
describe("response-copy preparation baseline", () => {
  it.each([100, 100_000])("records selected-row reads independently of %i history rows", count => {
    let reads = 0;
    const rows = new Proxy(Array.from({ length: count }, (_, index) => `response-${index} alpha beta`), {
      get(target, key, receiver) {
        if (typeof key === "string" && /^\d+$/u.test(key)) reads++;
        return Reflect.get(target, key, receiver);
      },
    });
    const viewport = new TranscriptViewport();
    viewport.compose({ documentRows: rows, promptAnchors: [], dockRows: [], width: 80, height: 10 });
    viewport.pressSelection(1, 1, 0);
    viewport.extendSelection(8, 1, 1, false);
    viewport.releaseSelection();
    reads = 0;
    const start = performance.now();
    const text = viewport.selectedText();
    const elapsedMs = performance.now() - start;
    expect(text).toBe("response");
    console.info(JSON.stringify({ phase: "selected-text", historyRows: count, selectedRows: 1, reads, elapsedMs }));
  });
});
