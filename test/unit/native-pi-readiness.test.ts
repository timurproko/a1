import { describe, expect, it } from "vitest";
import type { TerminalSurface } from "../../src/domain/index.js";
import { inspectNativePiReadiness } from "../../src/ui/native-pi-readiness.js";

describe("Native Pi readiness regression", () => {
  it("never treats an empty or cursor-only live surface as ready and retains deadline evidence", () => {
    const empty = surface(["", ""]);
    const pending = inspectNativePiReadiness(empty, 100, 1_000);
    expect(pending.status).toBe("pending");
    expect(pending.cursorOnly).toBe(true);

    const failed = inspectNativePiReadiness({ ...empty, cursor: { ...empty.cursor, column: 4, visible: true } }, 1_000, 1_000);
    expect(failed).toMatchObject({
      status: "failed",
      cursorOnly: true,
      visibleCharacters: 0,
      editorMarker: null,
      contextMarker: null,
      elapsedMs: 1_000,
      deadlineMs: 1_000,
    });
    expect(failed.reason).toMatch(/empty or cursor-only/);
  });

  it("requires recognizable editor and startup/footer evidence", () => {
    expect(inspectNativePiReadiness(surface(["random process output"]), 1_000, 1_000).status).toBe("failed");
    const ready = inspectNativePiReadiness(surface(["PI FIXTURE", "READY>"]), 20, 1_000);
    expect(ready.status).toBe("ready");
    expect(ready.editorMarker).toBe("READY>");
    expect(ready.contextMarker).toBe("PI FIXTURE");
  });
});

function surface(lines: readonly string[]): TerminalSurface {
  const columns = Math.max(10, ...lines.map(line => line.length));
  return {
    columns,
    rows: lines.length,
    cells: lines.map(line => Array.from({ length: columns }, (_, index) => ({
      character: line[index] ?? " ",
      width: 1,
      attributes: 0,
    }))),
    cursor: { column: 0, row: 0, visible: true, style: "block", blinking: true },
    activeScreen: "alternate",
    modes: {
      applicationCursorKeys: false,
      applicationKeypad: false,
      alternateScroll: false,
      bracketedPaste: false,
      focusReporting: false,
      mouseTracking: "none",
      mouseProtocol: "x10",
      synchronizedOutput: false,
      wraparound: true,
      keyboardProtocol: "legacy",
      modifyOtherKeys: 0,
      kittyKeyboardFlags: 0,
      win32InputMode: false,
    },
    outputSequence: 1,
    revision: 1,
    final: false,
  };
}
