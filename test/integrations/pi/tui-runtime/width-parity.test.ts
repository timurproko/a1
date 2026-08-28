import { visibleWidth } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";
import { displayWidth, padToWidth, truncateToWidth } from "../../../../src/ui/components/index.js";

/**
 * The runtime adapter rejects any row wider than the width it handed out, and it
 * measures with the Pi TUI ruler. A1 owns its own transcript rows and measures
 * them with `displayWidth`, so the two rulers have to agree on every cluster a
 * session can print: a single column of disagreement pads a row one cell too far
 * and takes the session down with a RangeError.
 */
const CLUSTERS = [
  "a",
  " ",
  "—",
  "…",
  "│",
  "é",
  "é",
  "界",
  "한",
  "Ａ",
  "⚡",
  "✅",
  "❌",
  "⭐",
  "✨",
  "🚀",
  "🔧",
  "🟢",
  "🩹",
  "🫠",
  "😀",
  "🧠",
  "⚠️",
  "▶️",
  "☀️",
  "♻️",
  "❤️",
  "✔️",
  "➡️",
  "🛠️",
  "🇺🇸",
  "👩‍💻",
  "👍🏽",
  "1️⃣",
];

const STYLED = (text: string) => `[31m${text}[0m`;

describe("owned width measurement against the Pi TUI ruler", () => {
  it("measures every printable cluster the same way", () => {
    const disagreements = CLUSTERS.filter(cluster => displayWidth(cluster) !== visibleWidth(cluster));
    expect(disagreements).toEqual([]);
  });

  it("measures styled and mixed rows the same way", () => {
    for (const cluster of CLUSTERS) {
      const row = `run ${cluster} done`;
      expect(displayWidth(row)).toBe(visibleWidth(row));
      expect(displayWidth(STYLED(row))).toBe(visibleWidth(STYLED(row)));
    }
  });

  it("pads a row to exactly the width the runtime handed out", () => {
    for (const cluster of CLUSTERS) {
      for (const width of [10, 11, 24]) {
        expect(visibleWidth(padToWidth(`x ${cluster} y`, width))).toBe(width);
      }
    }
  });

  it("never truncates a row past the width the runtime handed out", () => {
    for (const cluster of CLUSTERS) {
      for (const width of [1, 2, 3, 8]) {
        expect(visibleWidth(truncateToWidth(`${cluster}${cluster}${cluster}`, width))).toBeLessThanOrEqual(width);
      }
    }
  });
});
