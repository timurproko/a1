import { describe, expect, it } from "vitest";
import {
  OwnedUiDiagnosticsRecorder,
  redactDiagnosticMessage,
} from "../../../src/features/owned-ui/index.js";

describe("owned UI diagnostics recorder", () => {
  it("bounds and redacts diagnostics without carrying raw engine payloads", () => {
    const recorder = new OwnedUiDiagnosticsRecorder(2);
    recorder.record("warning", "First", "api_key=sk-secret-token-value", true);
    recorder.record("error", "Second", "C:\\Users\\person\\secret", true);
    recorder.record("info", "Third", "ordinary", true);

    const snapshot = recorder.snapshot();
    expect(snapshot.entries).toHaveLength(2);
    expect(JSON.stringify(snapshot)).not.toContain("sk-secret-token-value");
    expect(JSON.stringify(snapshot)).not.toContain("C:\\Users\\person");
    expect(redactDiagnosticMessage("token=abc secret=def")).toBe("token=[redacted] secret=[redacted]");
  });

  it("tracks frames, resources, and terminal restoration failures with bounded values", () => {
    const recorder = new OwnedUiDiagnosticsRecorder();
    recorder.noteFrame(120);
    recorder.noteFrame(64, true);
    recorder.noteResources({ cpuUserMicros: 1, cpuSystemMicros: 2, residentMemoryBytes: 3, heapBytes: 4 });
    recorder.noteTerminalRestorationFailure(new Error("restore failed"));

    expect(recorder.frames()).toEqual({ requestedFrames: 2, presentedFrames: 1, failedFrames: 1, lastFrameBytes: 64 });
    expect(recorder.snapshot().resources).toMatchObject({ residentMemoryBytes: 3 });
    expect(recorder.snapshot().terminalRestorationFailed).toBe(true);
    expect(() => recorder.noteFrame(-1)).toThrow(/byte count/);
  });

});
