import { stripTerminalSequences } from "@earendil-works/pi-tui";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OwnedUiSessionViewModel } from "../../../src/contracts/owned-ui/index.js";
import type { TranscriptViewportFrame } from "../../../src/ui/components/transcript-viewport.js";
import { DockChrome } from "../../../src/app/session-shell/dock-chrome.js";
import { piTheme } from "../../../src/integrations/pi/components/index.js";
import { cellStyle } from "../../support/ansi-cell-style.js";

afterEach(() => { vi.useRealTimers(); });

function harness() {
  let tailControl: { activate(): void } | undefined;
  const ports = {
    invalidateChrome: vi.fn(),
    requestRender: vi.fn(),
    viewport: {
      tailControlHovered: vi.fn(() => false),
      setTailControl: vi.fn((control: { activate(): void } | undefined) => { tailControl = control; }),
    },
  };
  return { chrome: new DockChrome(ports as never), ports, activate: () => tailControl?.activate() };
}

const release = [{ code: "release-update", message: "New version 9.9.9 is available. Run npm i -g a1", sequence: 1, severity: "info" }] as unknown as OwnedUiSessionViewModel["diagnostics"];
const installed = [{ code: "release-update-installed", message: "Update 9.9.9 installed; restart to update.", sequence: 1, severity: "info" }] as unknown as OwnedUiSessionViewModel["diagnostics"];
const frame = { descriptor: { transientAlignmentGapRows: 0 }, scrollTop: 0, hits: { viewportHeight: 40 } } as unknown as TranscriptViewportFrame;

describe("DockChrome", () => {
  it("shows one notice at a time and invalidates chrome only when it changes visibly", () => {
    const { chrome, ports } = harness();
    expect(chrome.renderNotice(40, 1)).toEqual([]);
    chrome.setNotice({ kind: "warning", message: "careful" });
    expect(chrome.notice?.kind).toBe("warning");
    expect(chrome.renderNotice(40, 1).join("\n")).toContain("careful");
    chrome.setNotice({ kind: "status", message: "done" });
    expect(chrome.renderNotice(40, 1)[0]).toBe("");
    chrome.dismissNotice();
    chrome.dismissNotice();
    expect(ports.invalidateChrome).toHaveBeenCalledTimes(3);
    chrome.setNotice({ kind: "new-session", message: "fresh" });
    chrome.forgetNotice();
    expect(chrome.notice).toBeUndefined();
    expect(ports.invalidateChrome).toHaveBeenCalledTimes(4);
  });

  it("shows the copy acknowledgement until it expires, and a newer one restarts the timer", () => {
    vi.useFakeTimers();
    const { chrome, ports } = harness();
    chrome.showCopyAcknowledgement("Copied 3 chars");
    expect(chrome.renderCopyAcknowledgement(40)).toContain("Copied 3 chars");
    expect(chrome.renderCopyAcknowledgement(0)).toBeUndefined();
    vi.advanceTimersByTime(600);
    chrome.showCopyAcknowledgement("Copied 4 chars");
    vi.advanceTimersByTime(600);
    expect(chrome.renderCopyAcknowledgement(40)).toContain("Copied 4 chars");
    vi.advanceTimersByTime(400);
    expect(chrome.renderCopyAcknowledgement(40)).toBeUndefined();
    expect(ports.requestRender).toHaveBeenCalledTimes(3);
    chrome.clearCopyAcknowledgement(true);
    expect(ports.requestRender).toHaveBeenCalledTimes(3);
  });

  it("restores persistent green restart readiness after transient copy feedback", () => {
    vi.useFakeTimers();
    const { chrome } = harness();
    const restart = chrome.renderPromptOverlay(installed, 40)!;
    expect(stripTerminalSequences(restart)).toBe("Update installed, restart to update");
    expect(cellStyle(restart, "U").foreground)
      .toBe(cellStyle(piTheme().fg("success", "U"), "U").foreground);

    chrome.showCopyAcknowledgement("Copied 5 chars to clipboard");
    expect(stripTerminalSequences(chrome.renderPromptOverlay(installed, 40)!)).toBe("Copied 5 chars to clipboard");
    vi.advanceTimersByTime(1_000);
    expect(stripTerminalSequences(chrome.renderPromptOverlay(installed, 40)!)).toBe("Update installed, restart to update");
    expect(stripTerminalSequences(chrome.renderPromptOverlay(installed, 20)!)).toBe("Update installed, re");
    expect(chrome.renderPromptOverlay([], 40)).toBeUndefined();
    expect(chrome.renderPromptOverlay(installed, 0)).toBeUndefined();
  });

  it("docks the release banner until its close control is activated", () => {
    const { chrome, ports, activate } = harness();
    expect(chrome.renderReleaseBanner([], 60)).toBeUndefined();
    const banner = chrome.renderReleaseBanner(release, 60);
    expect(banner?.rows.join("\n")).toContain("9.9.9");
    chrome.locateReleaseClose(frame, banner, 10, banner!.rows.length);
    expect(ports.viewport.setTailControl).toHaveBeenLastCalledWith(expect.objectContaining({ activate: expect.any(Function) }));
    activate();
    expect(chrome.renderReleaseBanner(release, 60)).toBeUndefined();
    chrome.locateReleaseClose(frame, undefined, 10, 0);
    expect(ports.viewport.setTailControl).toHaveBeenLastCalledWith(undefined);
  });
});
