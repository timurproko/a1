import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OwnedUiSessionViewModel } from "../../../../src/contracts/owned-ui/index.js";
import type { ProgressSpinnerSource, ProgressSpinnerStyle } from "../../../../src/contracts/presentation/index.js";
import { createPiShellComponents } from "../../../../src/integrations/pi/session-presenters/components.js";
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

function blockedView(): OwnedUiSessionViewModel {
  const view = installedView();
  return { ...view, diagnostics: [{ ...view.diagnostics[0]!, code: "release-update-blocked", message: "Update 1.2.4 prepared; activation blocked." }] };
}

function spinnerChoice(initial: ProgressSpinnerStyle) {
  let style = initial;
  const listeners = new Set<() => void>();
  const source: ProgressSpinnerSource = {
    snapshot: () => style,
    onChange(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
  return { source, listeners, set(next: ProgressSpinnerStyle) { style = next; for (const listener of listeners) listener(); } };
}

const runtime = { getColumns: () => 80, getRows: () => 24, requestRender() {} };
afterEach(() => vi.useRealTimers());

describe("bare-A1 progress status animation", () => {
  it.each(["Working", "Retrying", "Compacting", "Summarizing branch", "Indexing sources"])("uses stable selected frames for %s and changes style live", message => {
    vi.useFakeTimers();
    const choice = spinnerChoice("circle");
    const components = createPiShellComponents(async () => { throw new Error("unused selector"); }, true, choice.source);
    const status = components.chrome.status(busyView(message), presentation, runtime);
    status.setProgressPresentation("custom-viewport");
    const row = () => stripTerminalSequences(status.renderLive(80).join("\n")).trim();
    try {
      const frames: string[] = [];
      for (let index = 0; index < 4; index++) {
        const text = row();
        frames.push(text[0]!);
        expect(text.slice(1)).toBe(` ${message}…`);
        expect(text.indexOf(message)).toBe(2);
        vi.advanceTimersByTime(80);
      }
      expect(frames).toEqual(["◐", "◓", "◑", "◒"]);
      expect(vi.getTimerCount()).toBe(1);
      for (const [style, glyphs] of [["diamond", "◇◈◆"], ["square", "◧◩◨◪"], ["current", "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"]] as const) {
        choice.set(style);
        expect(glyphs).toContain(row()[0]!);
        expect(row().slice(1)).toBe(` ${message}…`);
        expect(vi.getTimerCount()).toBe(1);
      }
      choice.set("none");
      expect(row()).toBe(`${message}…`);
      status.setWorkingOverride("Extension operation");
      expect(row()).toBe("Extension operation…");
      choice.set("square");
      expect(row().slice(1)).toBe(" Extension operation…");
      expect(choice.listeners.size).toBe(1);
      for (const width of [1, 2, 8]) expect(status.renderLive(width).every(line => stripTerminalSequences(line).length <= width)).toBe(true);
    } finally { status.dispose?.(); }
    expect(vi.getTimerCount()).toBe(0);
    expect(choice.listeners.size).toBe(0);
  });

  it("applies the same live choice to owned operation loaders and preserves cancellation", async () => {
    vi.useFakeTimers();
    const choice = spinnerChoice("diamond");
    const components = createPiShellComponents(async () => { throw new Error("unused selector"); }, true, choice.source);
    const dialog = await components.dialogs.shareProgress(runtime, "Creating gist…", "dialog");
    const row = () => dialog.render(60).map(line => stripTerminalSequences(line).trim()).find(line => line.includes("Creating gist"))!;
    try {
      expect(row()).toBe("◇ Creating gist…");
      vi.advanceTimersByTime(80);
      expect(row()).toBe("◈ Creating gist…");
      choice.set("none"); expect(row()).toBe("Creating gist…");
      choice.set("circle"); expect("◐◓◑◒").toContain(row()[0]!);
      dialog.handleInput?.("\u001b");
      expect(dialog.signal.aborted).toBe(true);
    } finally { dialog.dispose?.(); }
    expect(choice.listeners.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ignores the owned choice in comparison factories", () => {
    vi.useFakeTimers();
    const choice = spinnerChoice("square");
    const components = createPiShellComponents(async () => { throw new Error("unused selector"); }, false, choice.source);
    const status = components.chrome.status(busyView("Working"), presentation, runtime);
    try {
      expect(stripTerminalSequences(status.renderLive(80).join("\n")).trim()).toBe("⠋ Working...");
      choice.set("none");
      vi.advanceTimersByTime(80);
      expect(stripTerminalSequences(status.renderLive(80).join("\n")).trim()).toBe("⠙ Working...");
      expect(choice.listeners.size).toBe(0);
    } finally { status.dispose?.(); }
    expect(vi.getTimerCount()).toBe(0);
  });
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

  it("keeps blocked diagnostics out of the pinned compact region", () => {
    const status = createPiShellStatus(blockedView(), presentation);
    try {
      const row = status.render(60).join("\n");
      expect(stripTerminalSequences(row).trim()).toBe("");
    } finally {
      status.dispose?.();
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
