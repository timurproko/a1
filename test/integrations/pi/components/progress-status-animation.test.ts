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

  it("right-aligns the installed update status while idle and combines it with live progress when space permits", () => {
    vi.useFakeTimers();
    const idle = createPiShellStatus(installedView(), presentation);
    const busy = createPiShellStatus(installedView("busy"), presentation);
    busy.setProgressPresentation("custom-viewport");
    try {
      const idleText = stripTerminalSequences(idle.render(60).join("\n"));
      expect(idleText.trim()).toBe("Update installed · Restart to update");
      expect(idleText).toHaveLength(60);

      const busyRows = busy.renderLive(160).map(row => stripTerminalSequences(row)).filter(row => row.trim().length > 0);
      expect(busyRows).toHaveLength(1);
      expect(busyRows[0]).toContain("Working…");
      expect(busyRows[0]).toContain("Update installed · Restart to update");
    } finally {
      idle.dispose?.();
      busy.dispose?.();
    }
  });

  it("stacks the installed update status at narrow widths without entering the transcript", () => {
    vi.useFakeTimers();
    const status = createPiShellStatus(installedView("busy"), presentation);
    status.setProgressPresentation("custom-viewport");
    try {
      const rows = status.renderLive(35).map(row => stripTerminalSequences(row)).filter(row => row.trim().length > 0);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toContain("Working…");
      expect(rows[1]?.trim()).toBe("Update installed · Restart to updat");
    } finally {
      status.dispose?.();
    }
  });
});
