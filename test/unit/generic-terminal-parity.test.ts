import { describe, expect, it } from "vitest";
import type { TerminalSurface } from "../../src/domain/index.js";
import { compareTerminalParity, type CommittedTerminalFrame, type TerminalParityObservation } from "../../src/test-harness/generic-terminal-parity.js";

const modes = {
  applicationCursorKeys: false, applicationKeypad: false, alternateScroll: false,
  bracketedPaste: false, focusReporting: false, mouseTracking: "none" as const,
  mouseProtocol: "x10" as const, synchronizedOutput: false, wraparound: true,
  keyboardProtocol: "legacy" as const, modifyOtherKeys: 0 as const, kittyKeyboardFlags: 0, win32InputMode: false,
};
function surface(character: string, revision: number): TerminalSurface {
  return {
    columns: 2, rows: 1,
    cells: [[{ character, width: 1, foreground: { mode: "rgb", value: 0x123456 }, attributes: 1 }, { character: " ", width: 1, attributes: 0 }]],
    scrollbackCells: [], cursor: { column: 1, row: 0, visible: true, style: "bar", blinking: false },
    activeScreen: "normal", modes, outputSequence: revision, revision, final: false,
  };
}
function frame(sourceCommitId: string, committedAtMs: number, character: string, complete = true): CommittedTerminalFrame {
  return { sourceCommitId, committedAtMs, surface: surface(character, committedAtMs), complete };
}
function observation(frames: readonly CommittedTerminalFrame[], overrides: Partial<TerminalParityObservation> = {}): TerminalParityObservation {
  return { frames, inputToFrameLatencyMs: [2, 3], sourceBytes: 20, hostBytes: 80, idleHostWriteCount: 0, finalRestorationPassed: true, ...overrides };
}

describe("generic direct-versus-hosted terminal parity comparator", () => {
  it("accepts equivalent committed timelines and reports workload-independent metrics", () => {
    const direct = observation([frame("one", 5, "A"), frame("two", 10, "B")]);
    const hosted = observation([frame("one", 7, "A"), frame("two", 12, "B")], { inputToFrameLatencyMs: [4, 5] });
    const verdict = compareTerminalParity(direct, hosted);
    expect(verdict.passed).toBe(true);
    expect(verdict.failures).toEqual([]);
    expect(verdict.metrics).toMatchObject({
      directFrameCount: 2, hostedFrameCount: 2, maxHostedFramesPerSourceCommit: 1, outputAmplification: 4,
    });
  });

  it("rejects duplicate, partial, blank, stale/different, amplified, idle, slow, jittery, and unrestored hosted output", () => {
    const direct = observation([frame("one", 5, "A"), frame("two", 10, "B")]);
    const hosted = observation([
      frame("one", 20, "A"),
      frame("one", 21, "A", false),
      frame("two", 100, " "),
    ], {
      inputToFrameLatencyMs: [50, 70], sourceBytes: 10, hostBytes: 200,
      idleHostWriteCount: 2, finalRestorationPassed: false,
    });
    const verdict = compareTerminalParity(direct, hosted);
    expect(verdict.passed).toBe(false);
    expect(verdict.failures.join("\n")).toMatch(/produced 2 hosted frames/);
    expect(verdict.failures.join("\n")).toMatch(/partial|differs/);
    expect(verdict.failures.join("\n")).toMatch(/duplicate unchanged/);
    expect(verdict.failures.join("\n")).toMatch(/intermediate blank/);
    expect(verdict.failures.join("\n")).toMatch(/idle frames/);
    expect(verdict.failures.join("\n")).toMatch(/restoration failed/);
    expect(verdict.failures.join("\n")).toMatch(/latency overhead/);
    expect(verdict.failures.join("\n")).toMatch(/jitter overhead/);
    expect(verdict.failures.join("\n")).toMatch(/output amplification/);
  });
});
