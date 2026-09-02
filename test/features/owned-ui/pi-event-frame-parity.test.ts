import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
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

  it("produces one truecolor diagnostic hash under opposing ambient capabilities", async () => {
    const hashes: string[] = [];
    for (const ambientMode of PI_PARITY_COLOR_MODES) {
      hashes.push(await withPiParityColorMode(ambientMode, async () => createHash("sha256")
        .update(JSON.stringify({ colorMode: EVENT_FRAME_PARITY_COLOR_MODE, result: await buildEventFrameParityResult() }))
        .digest("hex")));
    }
    expect(new Set(hashes).size).toBe(1);
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
