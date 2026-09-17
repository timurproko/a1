import { describe, expect, it } from "vitest";
import {
  QUIT_OUTRO_EFFECTS,
  createQuitOutroPlan,
  isQuitOutroEffect,
  type QuitOutroCell,
} from "../../../../src/integrations/pi/session-ui/quit-outro-effects.js";
import {
  QUIT_OUTRO_GUARD_MS,
  QUIT_OUTRO_MAX_MS,
  QUIT_OUTRO_MAX_TICKS,
  QUIT_OUTRO_MIN_MS,
  captureQuitOutroFrame,
  clampQuitOutroDuration,
  createQuitOutroSurfaceFrame,
  playQuitOutro,
} from "../../../../src/integrations/pi/session-ui/quit-outro.js";

const SYNC_BEGIN = "\x1b[?2026h";
const SYNC_END = "\x1b[?2026l";
const GEOMETRIES: readonly (readonly number[])[] = [
  [12, 0, 7, 3],
  [80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80],
  [1],
  [0, 0, 5],
];

function withinBounds(cells: readonly QuitOutroCell[], rowWidths: readonly number[]): boolean {
  const width = Math.max(1, ...rowWidths);
  return cells.every(cell => Number.isInteger(cell.row) && Number.isInteger(cell.col)
    && cell.row >= 0 && cell.row < rowWidths.length && cell.col >= 0 && cell.col < width
    && cell.start >= 0 && cell.end <= 1 && cell.end >= cell.start && cell.glyph.length > 0);
}

describe("quit outro effects", () => {
  it("names exactly the four prototype effects", () => {
    expect([...QUIT_OUTRO_EFFECTS]).toEqual(["fall", "dissolve", "starburst", "waves"]);
    expect(isQuitOutroEffect("off")).toBe(false);
    expect(isQuitOutroEffect("fall")).toBe(true);
  });

  it.each(QUIT_OUTRO_EFFECTS)("plans %s deterministically inside the captured bounds", effect => {
    for (const rowWidths of GEOMETRIES) {
      const first = createQuitOutroPlan(effect, rowWidths, 42);
      const second = createQuitOutroPlan(effect, rowWidths, 42);
      expect(second).toEqual(first);
      expect(createQuitOutroPlan(effect, rowWidths, 43)).not.toEqual(first);
      expect(withinBounds(first.sparkles, rowWidths)).toBe(true);
      expect(withinBounds(first.clears, rowWidths)).toBe(true);
      expect(first.sparkles.every((cell, index) => index === 0 || first.sparkles[index - 1]!.start <= cell.start)).toBe(true);
      expect(first.clears.every((cell, index) => index === 0 || first.clears[index - 1]!.end <= cell.end)).toBe(true);
      // Every visible cell is cleared by the end of the plan.
      const cleared = new Set(first.clears.map(cell => `${cell.row}:${cell.col}`));
      for (let row = 0; row < rowWidths.length; row += 1) {
        for (let col = 0; col < rowWidths[row]!; col += 1) expect(cleared.has(`${row}:${col}`)).toBe(true);
      }
      // Every sparkle is eventually cleared, so the surface ends blank.
      for (const sparkle of first.sparkles) expect(cleared.has(`${sparkle.row}:${sparkle.col}`)).toBe(true);
      if (rowWidths.reduce((sum, width) => sum + width, 0) >= 20) expect(first.sparkles.length).toBeGreaterThan(0);
    }
  });
});

describe("quit outro capture", () => {
  it("truncates presented rows to the viewport and measures their visible widths", () => {
    const frame = captureQuitOutroFrame(["\x1b[1mhello\x1b[0m world", "", "x".repeat(20), "extra"], 10, 3);
    expect(frame).not.toBeNull();
    expect(frame!.lines).toHaveLength(3);
    expect(frame!.lines[0]).toBe("\x1b[1mhello\x1b[0m worl\x1b[0m");
    expect(frame!.rowWidths).toEqual([10, 0, 10]);
    expect(frame!.columns).toBe(10);
    expect(frame!.rows).toBe(3);
  });

  it("pads missing rows and skips a blank screen", () => {
    expect(captureQuitOutroFrame(["", "   "], 10, 4)).toEqual({
      lines: ["", "   ", "", ""], columns: 10, rows: 4, rowWidths: [0, 3, 0, 0],
    });
    expect(captureQuitOutroFrame(["", ""], 10, 4)).toBeNull();
    expect(captureQuitOutroFrame([], 10, 4)).toBeNull();
  });

  it("seeds the surface with a hidden cursor, one clear, and only the visible rows", () => {
    const frame = captureQuitOutroFrame(["top", "", "bottom"], 10, 3)!;
    const surface = createQuitOutroSurfaceFrame(frame);
    expect(surface.startsWith(`${SYNC_BEGIN}\x1b[?25l\x1b[2J\x1b[H\x1b[0m`)).toBe(true);
    expect(surface.endsWith(SYNC_END)).toBe(true);
    expect(surface).toContain("\x1b[1;1Htop\x1b[0m");
    expect(surface).toContain("\x1b[3;1Hbottom\x1b[0m");
    expect(surface).not.toContain("\x1b[2;1H");
  });
});

describe("quit outro playback", () => {
  it("clamps the duration into the supported range", () => {
    expect(clampQuitOutroDuration(0)).toBe(QUIT_OUTRO_MIN_MS);
    expect(clampQuitOutroDuration(299)).toBe(QUIT_OUTRO_MIN_MS);
    expect(clampQuitOutroDuration(800.9)).toBe(800);
    expect(clampQuitOutroDuration(5000)).toBe(QUIT_OUTRO_MAX_MS);
    expect(clampQuitOutroDuration(Number.NaN)).toBe(QUIT_OUTRO_MIN_MS);
  });

  it.each(QUIT_OUTRO_EFFECTS)("plays %s as synchronized ticks that end with a blank screen", async effect => {
    const frame = captureQuitOutroFrame(["one two three", "four", "", "five six"], 14, 4)!;
    const writes: string[] = [];
    let clock = 0;
    const played = await playQuitOutro(frame, effect, 600, {
      write: data => writes.push(data),
      now: () => clock,
      sleep: async ms => { clock += ms; },
      seed: 11,
    });
    expect(played).toBe(true);
    expect(writes[0]).toBe(createQuitOutroSurfaceFrame(frame));
    expect(writes.every(write => write.startsWith(SYNC_BEGIN) && write.endsWith(SYNC_END))).toBe(true);
    expect(writes.slice(1).every(write => write.startsWith(`${SYNC_BEGIN}\x1b[0m`))).toBe(true);
    expect(writes.at(-1)).toContain("\x1b[2J\x1b[H\x1b[0m");
    expect(writes.slice(1, -1).some(write => write.includes("\x1b[2J"))).toBe(false);
    expect(writes.join("")).toContain("\x1b[38;2;238;238;238m");
    expect(writes.length).toBeGreaterThan(3);
    // Playback ends once the last clear lands, never later than the duration plus one tick.
    expect(clock).toBeGreaterThan(300);
    expect(clock).toBeLessThanOrEqual(600 + 1000 / 30);
  });

  it("abandons remaining ticks once the guard elapses on a slow terminal", async () => {
    const frame = captureQuitOutroFrame(["slow terminal"], 20, 1)!;
    const writes: string[] = [];
    let clock = 0;
    await playQuitOutro(frame, "dissolve", 300, {
      write: data => writes.push(data),
      now: () => clock,
      // A clock that never advances cannot reach the duration; the tick ceiling ends playback.
      sleep: async () => { clock += 0; },
      seed: 3,
    });
    expect(writes.length).toBe(QUIT_OUTRO_MAX_TICKS + 1);
    expect(writes.at(-1)).toContain("\x1b[2J\x1b[H");

    const stalled: string[] = [];
    let stalledClock = 0;
    await playQuitOutro(frame, "dissolve", 300, {
      write: data => { stalled.push(data); stalledClock += 250; },
      now: () => stalledClock,
      sleep: async () => {},
      seed: 3,
    });
    expect(stalledClock).toBeLessThanOrEqual(300 + QUIT_OUTRO_GUARD_MS + 250);
    expect(stalled.at(-1)).toContain("\x1b[2J\x1b[H");
  });

  it("propagates a failing write so the caller can skip the effect", async () => {
    const frame = captureQuitOutroFrame(["broken"], 10, 1)!;
    await expect(playQuitOutro(frame, "fall", 300, {
      write: () => { throw new Error("terminal closed"); },
      now: () => 0,
      sleep: async () => {},
    })).rejects.toThrow("terminal closed");
  });
});
