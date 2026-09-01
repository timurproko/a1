import { describe, expect, it } from "vitest";
import {
  classifyTerminalPaint,
  replayTerminalCheckpoints,
  replayTerminalPaint,
  type TimedTerminalWrite,
} from "../../../support/rendering/terminal-paint-evidence.js";

const SYNC_BEGIN = "\u001b[?2026h";
const SYNC_END = "\u001b[?2026l";

function frame(data: string, atMs = 0, cause = "stream"): TimedTerminalWrite {
  return { data: `${SYNC_BEGIN}${data}${SYNC_END}`, atMs, cause };
}

describe("terminal paint evidence", () => {
  it("classifies full clears, addressed row paints, scroll regions, scroll movement, cursor placement, and causes", () => {
    const result = classifyTerminalPaint([
      frame("\u001b[2J\u001b[1;1H\u001b[2Kone", 10, "initial"),
      frame("\u001b[2;8r\u001b[2S\u001b[r\u001b[8;1H\u001b[2Ktail\u001b[9;4H", 43),
      frame("\u001b[2;8r\u001b[1T\u001b[r", 76, "navigation"),
    ]);

    expect(result).toMatchObject({
      writes: 3,
      frames: 3,
      durationMs: 66,
      fullScreenClears: 1,
      rowClears: 2,
      scrollUpRows: 2,
      scrollDownRows: 1,
      synchronizedUpdates: { begins: 3, ends: 3, balanced: true },
      causes: { initial: 1, stream: 1, navigation: 1 },
    });
    expect(result.addressedRowWrites).toEqual([1, 8]);
    expect(result.scrollRegions).toEqual([{ top: 2, bottom: 8 }, { top: 2, bottom: 8 }]);
    expect(result.cursorPositions.at(-1)).toEqual({ row: 9, column: 4 });
  });

  it("honors synchronized output as one state and exposes intermediate erase states when ignored", async () => {
    const writes = [
      frame("\u001b[2J\u001b[1;1H\u001b[2Kstable\u001b[2;1H\u001b[2Kold"),
      frame("\u001b[2;1H\u001b[2Knew", 33),
    ];

    const honored = await replayTerminalPaint(writes, { columns: 12, rows: 3, synchronizedUpdates: "honor" });
    const ignored = await replayTerminalPaint(writes, { columns: 12, rows: 3, synchronizedUpdates: "ignore" });

    expect(honored.states).toHaveLength(2);
    expect(honored.final.rows.slice(0, 2)).toEqual(["stable", "new"]);
    expect(ignored.states.length).toBeGreaterThan(honored.states.length);
    expect(ignored.states.some(state => state.rows[1] === "")).toBe(true);
    expect(ignored.final).toEqual(honored.final);
  });

  it("rejects malformed synchronized streams and evidence beyond its byte bound", async () => {
    expect(() => classifyTerminalPaint([{ data: SYNC_END, atMs: 0 }])).toThrow(/without a begin/);
    expect(() => classifyTerminalPaint([{ data: `${SYNC_BEGIN}unfinished`, atMs: 0 }])).toThrow(/ends inside/);
    expect(() => classifyTerminalPaint([{ data: "12345", atMs: 0 }], { maxBytes: 4 })).toThrow(/exceeds 4 byte/);
    await expect(replayTerminalPaint([{ data: `${SYNC_BEGIN}unfinished`, atMs: 0 }], {
      columns: 10,
      rows: 2,
      synchronizedUpdates: "ignore",
    })).rejects.toThrow(/ends inside/);
  });

  it("retains bounded head and tail diagnostics with byte-limited excerpts", () => {
    const writes = Array.from({ length: 10 }, (_, index) => ({ data: `write-${index}-${"x".repeat(20)}`, atMs: index }));
    const result = classifyTerminalPaint(writes, { maxCapturedWrites: 4, maxExcerptBytes: 10 });

    expect(result.captureTruncated).toBe(true);
    expect(result.capturedWrites.map(write => write.index)).toEqual([0, 1, 8, 9]);
    expect(result.capturedWrites.every(write => Buffer.byteLength(write.excerpt) <= 13)).toBe(true);
    expect(result.capturedWrites.every(write => write.truncated)).toBe(true);
  });

  it("captures complete cell frames at declared write boundaries and geometry", async () => {
    const writes = [frame("\u001b[1;1H\u001b[2Kone"), frame("\u001b[2;1H\u001b[2Ktwo", 1)];
    const checkpoints = await replayTerminalCheckpoints(writes, [
      { writeEnd: 1, columns: 8, rows: 2 },
      { writeEnd: 2, columns: 10, rows: 3 },
    ]);
    expect(checkpoints.map(checkpoint => checkpoint.rows)).toEqual([
      ["one", ""],
      ["one", "two", ""],
    ]);
    await expect(replayTerminalCheckpoints(writes, [{ writeEnd: 3, columns: 8, rows: 2 }])).rejects.toThrow(/write boundary/);
  });

  it("rejects invalid limits and timestamps", () => {
    expect(() => classifyTerminalPaint([], { maxBytes: 0 })).toThrow(/maxBytes/);
    expect(() => classifyTerminalPaint([{ data: "x", atMs: Number.NaN }])).toThrow(/timestamp/);
  });
});
