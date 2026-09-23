import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OwnedUiSessionViewModel } from "../../../../src/contracts/owned-ui/index.js";
import { createPiShellStatus, piTheme } from "../../../../src/integrations/pi/components/index.js";
import { progressStatusFrame, progressStatusText } from "../../../../src/ui/components/index.js";
import { cellStyle } from "../../../support/ansi-cell-style.js";

const presentation = {
  text: (message: string, mode: "pinned" | "custom-viewport") => progressStatusText(message, mode === "pinned" ? "..." : "…"),
  frame: progressStatusFrame,
};

function busyView(message = "ABCDEFG"): OwnedUiSessionViewModel {
  return {
    contractVersion: 1,
    sessionId: "session",
    revision: 1,
    lifecycle: "busy",
    transcript: [],
    editor: { text: "", queuedSubmissions: [], selection: null, cursorOffset: 0, historyRevision: 0, submitEnabled: true },
    status: { title: "A1", workingMessage: message, diagnostics: [], badges: ["busy"] },
    terminal: { columns: 80, rows: 24, focusedRegion: "editor", hardwareCursor: false },
    activeModel: null,
    thinkingLevel: "medium",
    activeCommandIds: [],
    dialog: null,
    overlay: null,
    customizations: [],
    diagnostics: [],
  };
}

afterEach(() => vi.useRealTimers());

describe("bare-A1 progress status animation", () => {
  it("advances the accent band from the existing spinner timer and disposes that timer", async () => {
    vi.useFakeTimers();
    const requestRender = vi.fn();
    const status = createPiShellStatus(busyView(), presentation, {
      getColumns: () => 80,
      getRows: () => 24,
      requestRender,
    });
    status.setProgressPresentation("custom-viewport");
    const row = () => status.renderLive(80).join("\n");
    const accent = cellStyle(piTheme().fg("accent", "A"), "A").foreground;
    const muted = cellStyle(piTheme().fg("muted", "A"), "A").foreground;

    try {
      expect(stripTerminalSequences(row())).toContain("ABCDEFG…");
      expect(cellStyle(row(), "A").foreground).toBe(accent);
      expect(cellStyle(row(), "B").foreground).toBe(accent);
      expect(cellStyle(row(), "C").foreground).toBe(muted);
      expect(cellStyle(row(), "…").foreground).toBe(muted);

      await vi.advanceTimersByTimeAsync(160);
      expect(cellStyle(row(), "A").foreground).toBe(accent);
      expect(cellStyle(row(), "C").foreground).toBe(muted);

      await vi.advanceTimersByTimeAsync(80);
      expect(cellStyle(row(), "A").foreground).toBe(muted);
      expect(cellStyle(row(), "B").foreground).toBe(accent);
      expect(cellStyle(row(), "C").foreground).toBe(accent);
      expect(requestRender).toHaveBeenCalled();
    } finally {
      status.dispose?.();
    }
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps pinned status text and styling unchanged", () => {
    vi.useFakeTimers();
    const status = createPiShellStatus(busyView("Working"), presentation);
    try {
      const row = status.renderLive(80).join("\n");
      expect(stripTerminalSequences(row)).toContain("Working...");
      expect(cellStyle(row, "W").foreground).toBe(cellStyle(piTheme().fg("muted", "W"), "W").foreground);
    } finally {
      status.dispose?.();
    }
  });
});
