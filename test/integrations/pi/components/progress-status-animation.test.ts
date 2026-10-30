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

function installedView(lifecycle: "ready" | "busy" = "ready"): OwnedUiSessionViewModel {
  const view = busyView("Working");
  return {
    ...view,
    lifecycle,
    status: { ...view.status, workingMessage: lifecycle === "busy" ? "Working" : null, badges: lifecycle === "busy" ? ["busy"] : [] },
    diagnostics: [{
      sequence: 1,
      code: "release-update-installed",
      severity: "info",
      message: "Update 1.2.4 installed; restart to update.",
      recoverable: true,
    }],
  };
}

afterEach(() => vi.useRealTimers());

describe("bare-A1 progress status animation", () => {
  it("advances a white text highlight from the accent spinner timer and disposes that timer", async () => {
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
    const highlight = cellStyle(piTheme().fg("text", "A"), "A").foreground;
    const muted = cellStyle(piTheme().fg("muted", "A"), "A").foreground;

    try {
      const plain = stripTerminalSequences(row());
      const spinner = plain.trimStart()[0]!;
      expect(plain).toContain("ABCDEFG…");
      expect(highlight).not.toBe(accent);
      expect(cellStyle(row(), spinner).foreground).toBe(accent);
      expect(cellStyle(row(), "A").foreground).toBe(highlight);
      expect(cellStyle(row(), "B").foreground).toBe(highlight);
      expect(cellStyle(row(), "C").foreground).toBe(muted);
      expect(cellStyle(row(), "…").foreground).toBe(muted);

      await vi.advanceTimersByTimeAsync(160);
      expect(cellStyle(row(), "A").foreground).toBe(highlight);
      expect(cellStyle(row(), "C").foreground).toBe(muted);

      await vi.advanceTimersByTimeAsync(80);
      expect(cellStyle(row(), "A").foreground).toBe(muted);
      expect(cellStyle(row(), "B").foreground).toBe(highlight);
      expect(cellStyle(row(), "C").foreground).toBe(highlight);
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

  it("keeps pinned restart readiness green and leaves the custom overlay out of live progress", () => {
    vi.useFakeTimers();
    const pinned = createPiShellStatus(installedView(), presentation);
    const custom = createPiShellStatus(installedView("busy"), presentation);
    custom.setProgressPresentation("custom-viewport");
    try {
      const pinnedRow = pinned.render(60).join("\n");
      const pinnedText = stripTerminalSequences(pinnedRow);
      expect(pinnedText.trim()).toBe("Update installed, restart to update");
      expect(pinnedText).toHaveLength(60);
      expect(cellStyle(pinnedRow, "U").foreground)
        .toBe(cellStyle(piTheme().fg("success", "U"), "U").foreground);
      expect(cellStyle(pinnedRow, "r").foreground)
        .toBe(cellStyle(piTheme().fg("success", "r"), "r").foreground);

      const customRows = custom.renderLive(160).map(row => stripTerminalSequences(row)).filter(row => row.trim().length > 0);
      expect(customRows).toHaveLength(1);
      expect(customRows[0]).toContain("Working…");
      expect(customRows[0]).not.toContain("Update installed");
    } finally {
      pinned.dispose?.();
      custom.dispose?.();
    }
  });

  it("truncates the pinned restart-ready message at narrow widths", () => {
    const status = createPiShellStatus(installedView(), presentation);
    try {
      const text = stripTerminalSequences(status.render(20).join("\n")).trim();
      expect(text).toBe("Update installed, re");
      expect(text).toHaveLength(20);
    } finally {
      status.dispose?.();
    }
  });
});
