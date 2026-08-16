import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  buildEventFrameParityResult,
  SCRIPTED_PI_EVENTS,
  type EventFrameParityResult,
} from "./pi-event-frame-parity-fixture.js";

interface EventFrameFixture extends EventFrameParityResult {
  readonly schema: string;
  readonly generatedFrom: {
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
  it("matches AddOne state transitions to the pinned Pi event sequence", async () => {
    const fixture = await readFixture();
    const result = await buildEventFrameParityResult();

    expect(fixture.schema).toBe("addone-pi-event-frame-parity-v1");
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
      ignored: ["cursor visibility", "synchronized-output envelope", "render timing"],
      preserved: ["rendered row payloads", "cursor addressing", "state transitions", "resize dimensions"],
    });
    expect(result.frames).toEqual(fixture.frames);
    expect(result.frames.map(frame => frame.stage)).toEqual(["initial", "streaming", "tool-result", "completed", "resized"]);
    expect(result.frames.at(-1)).toMatchObject({ columns: 48, rows: 16 });
  });
});

async function readFixture(): Promise<EventFrameFixture> {
  return JSON.parse(await readFile(
    "test/features/owned-ui/fixtures/pi-event-frame-parity.json",
    "utf8",
  )) as EventFrameFixture;
}
