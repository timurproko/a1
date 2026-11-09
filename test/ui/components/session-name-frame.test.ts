import { describe, expect, it, vi } from "vitest";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { sessionNameFrame } from "../../../src/ui/components/index.js";

function frame(elapsed: number, overrides = {}) {
  const paint = vi.fn((text: string, _brightness: number, _settled: number) => text);
  const result = sessionNameFrame({ from: "old-task", to: "new", elapsed, width: 20, truecolor: true,
    measure: visibleWidth, clip: (text, width) => truncateToWidth(text, width, ""), paint, dim: text => text, ...overrides });
  return { ...result, paint };
}

describe("secondary-accent name transition frames", () => {
  it("shimmers for 600ms, reveals at 45ms per grapheme, then settles for 300ms", () => {
    expect(frame(0).text).toBe("old-task");
    expect(frame(599).text).toBe("old-task");
    expect(frame(600).text).toBe("n       ");
    expect(frame(645).text).toBe("ne      ");
    expect(frame(690).text).toBe("new     ");
    const settling = frame(735 + 150);
    expect(settling.paint.mock.calls.every(call => call[2] === 0.5)).toBe(true);
    expect(frame(1035)).toMatchObject({ text: "new", done: true });
    expect(frame(0).paint.mock.calls[0]?.[1]).not.toBe(frame(300).paint.mock.calls[0]?.[1]);
  });

  it("uses plain typing without generated colors in palette mode", () => {
    const initial = frame(0, { truecolor: false });
    expect(initial.text).toBe("n       "); expect(initial.paint).not.toHaveBeenCalled();
    expect(frame(135, { truecolor: false })).toMatchObject({ text: "new", done: true });
  });

  it("clips before coloring and reveals whole combining or wide graphemes", () => {
    const options = { from: "long-old", to: "👩‍💻界é", width: 5 };
    expect(frame(600, options).text).toBe("👩‍💻   ");
    expect(frame(645, options).text).toBe("👩‍💻界 ");
    expect(frame(690, options).text).toBe("👩‍💻界é");
    for (const width of [0, 1, 2, 4, 5]) for (const elapsed of [0, 600, 645, 900, 1100]) {
      expect(visibleWidth(frame(elapsed, { ...options, width }).text)).toBeLessThanOrEqual(width);
    }
    expect(frame(0, { width: 0 })).toMatchObject({ text: "", done: true });
  });
});
