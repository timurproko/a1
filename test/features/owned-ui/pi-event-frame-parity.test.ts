import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { getCapabilities } from "#pi-tui";
import { piTheme } from "../../../src/integrations/pi/components/index.js";
import { eventFrameDifference } from "./pi-event-frame-diagnostics.js";
import {
  buildEventFrameParityResult,
  EVENT_FRAME_PARITY_COLOR_MODE,
  SCRIPTED_PI_EVENTS,
  type EventFrameParityResult,
} from "./pi-event-frame-parity-fixture.js";
import {
  PI_PARITY_COLOR_MODES,
  withPiParityColorMode,
} from "../../support/pi-terminal-capabilities.js";

interface EventFrameFixture extends EventFrameParityResult {
  readonly schema: string;
  readonly generatedFrom: {
    readonly producer: "a1-diagnostic";
    readonly evidenceAuthority: false;
    readonly colorMode: "truecolor";
    readonly sourceCommit: string;
    readonly packages: Record<string, string>;
  };
  readonly tolerance: {
    readonly ignored: readonly string[];
    readonly preserved: readonly string[];
  };
  readonly eventStages: readonly string[];
}

describe("pinned Pi scripted event and terminal-frame parity", () => {
  it("matches A1 state transitions to the pinned Pi event sequence", async () => {
    const fixture = await readFixture();
    const result = await buildEventFrameParityResult();

    expect(fixture.schema).toBe("a1-pi-event-frame-parity-v1");
    expect(fixture.generatedFrom.producer).toBe("a1-diagnostic");
    expect(fixture.generatedFrom.evidenceAuthority).toBe(false);
    expect(fixture.generatedFrom.colorMode).toBe(EVENT_FRAME_PARITY_COLOR_MODE);
    expect(fixture.generatedFrom.sourceCommit).toBe("914cf1472e715297caa30db4b9535d534a9eb718");
    expect(fixture.generatedFrom.packages).toEqual({
      "@earendil-works/pi-coding-agent": "0.84.2",
      "@earendil-works/pi-tui": "0.84.2",
    });
    expect(fixture.eventStages).toEqual(["initial", ...SCRIPTED_PI_EVENTS.map(entry => entry.stage), "resized"]);
    expect(result.states).toEqual(fixture.states);
  });

  it("emits the same normalized captured terminal frames", async () => {
    const fixture = await readFixture();
    const result = await buildEventFrameParityResult();

    expect(fixture.tolerance).toEqual({
      ignored: ["synchronized-output envelope", "render timing", "file hyperlink availability and absolute targets", "declared product and path substitutions"],
      preserved: ["semantic ANSI", "reset boundaries", "rendered row payloads", "cursor visibility", "cursor addressing", "clearing and restoration order", "state transitions", "resize dimensions"],
    });
    expect(portableFrames(result.frames)).toEqual(portableFrames(fixture.frames));
    expect(result.frames.map(frame => frame.stage)).toEqual(["initial", "streaming", "tool-result", "completed", "resized"]);
    expect(result.frames.at(-1)).toMatchObject({ columns: 48, rows: 16 });
  });

  it.each(["normal", "delayed"] as const)("produces one truecolor diagnostic hash under opposing ambient capabilities (%s)", async timing => {
    const hashes: string[] = [];
    const first = await buildEventFrameParityResult();
    for (let repetition = 0; repetition < 12; repetition += 1) {
      for (const ambientMode of PI_PARITY_COLOR_MODES) {
        const result = await withPiParityColorMode(ambientMode, () => buildEventFrameParityResult(timing === "normal" ? {} : {
          beforeEvent: async stage => {
            await new Promise<void>(resolve => setImmediate(resolve));
            // Concurrency: cross the real 16 ms paint interval without advancing the declared workload clock.
            if (stage === "completed") Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
          },
        }));
        expect(eventFrameDifference(first, result), `repetition=${repetition} ambient=${ambientMode} timing=${timing}`).toBeUndefined();
        hashes.push(createHash("sha256")
          .update(JSON.stringify({ colorMode: EVENT_FRAME_PARITY_COLOR_MODE, result }))
          .digest("hex"));
      }
    }
    expect(new Set(hashes).size).toBe(1);
  });

  it.each([false, true])("restores capabilities, theme and timers after capture (failure=%s)", async fail => {
    const capabilities = getCapabilities();
    const theme = piTheme();
    const timers = { setTimeout, clearTimeout, setInterval, clearInterval, Date };
    const leaked = vi.fn();
    const result = buildEventFrameParityResult({ beforeEvent: stage => {
      if (stage !== "tool-start") return;
      setTimeout(leaked, 1);
      setInterval(leaked, 1);
      if (fail) throw new Error("capture interrupted");
    } });
    if (fail) await expect(result).rejects.toThrow("capture interrupted");
    else await result;
    expect(getCapabilities()).toBe(capabilities);
    expect(piTheme()).toBe(theme);
    expect({ setTimeout, clearTimeout, setInterval, clearInterval, Date }).toEqual(timers);
    await new Promise(resolve => timers.setTimeout(resolve, 5));
    expect(leaked).not.toHaveBeenCalled();
    expect((await buildEventFrameParityResult()).frames).toHaveLength(5);
  });
});

describe("event-frame divergence diagnostics", () => {
  it.each(["\x1b[38;2;1;2;3m", "\x1b[2J\x1b[H", "\x1b[?25h"])("preserves a meaningful ANSI mutation %j", mutation => {
    const before: EventFrameParityResult = { states: [], frames: [{ stage: "streaming", columns: 64, rows: 18, capturedAnsi: "\x1b[0mhello" }] };
    const after = { ...before, frames: [{ ...before.frames[0]!, capturedAnsi: mutation + "hello" }] };
    expect(eventFrameDifference(before, before)).toBeUndefined();
    const difference = eventFrameDifference(before, after)!;
    expect(difference).toContain("frames[0] stage=streaming");
    expect(difference).toContain("serialized offset=");
    expect(difference).toContain("\\u001b");
    expect(difference.length).toBeLessThan(500);
  });

  it("identifies a changed state or missing stage", () => {
    const before: EventFrameParityResult = { states: [{ stage: "completed", lifecycle: "ready", queued: [], transcript: [] }], frames: [] };
    expect(eventFrameDifference(before, { ...before, states: [] })).toContain("states[0] stage=completed");
  });
});

function portableFrames(frames: readonly EventFrameParityResult["frames"][number][]): readonly EventFrameParityResult["frames"][number][] {
  return frames.map(frame => ({
    ...frame,
    capturedAnsi: frame.capturedAnsi
      .replace(/\x1b]8;;[^\x07\x1b]*(?:\x07|\x1b\\)/g, "")
      .replace(/(?:~\/\S*\/)?D:\/parity/g, "D:/parity"),
  }));
}

async function readFixture(): Promise<EventFrameFixture> {
  return JSON.parse(await readFile(
    "test/features/owned-ui/fixtures/pi-event-frame-parity.json",
    "utf8",
  )) as EventFrameFixture;
}
