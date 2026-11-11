import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsSpinnerPreview, progressSpinnerLabel } from "../../../src/features/owned-ui/settings-spinner-preview.js";
import { displayWidth, PLAIN_THEME } from "../../../src/ui/components/index.js";

const choices = ["none", "current", "circle", "diamond", "square"] as const;
const theme = { ...PLAIN_THEME, fg: (_role: string, text: string) => `\u001b[32m${text}\u001b[39m` };
afterEach(() => vi.useRealTimers());

describe("Settings spinner dropdown preview", () => {
  it("animates only the focused choice with one clock and stops for None or no selection", () => {
    vi.useFakeTimers();
    const requestRender = vi.fn();
    const preview = new SettingsSpinnerPreview(requestRender);
    try {
      const first = preview.frames(choices, 2, theme);
      expect(first).toEqual(["", "\u001b[32m⠋\u001b[39m", "\u001b[32m◐\u001b[39m", "\u001b[32m◇\u001b[39m", "\u001b[32m◧\u001b[39m"]);
      expect(vi.getTimerCount()).toBe(1);
      vi.advanceTimersByTime(80);
      const next = preview.frames(choices, 2, theme);
      expect(requestRender).toHaveBeenCalledOnce();
      expect(next[2]).toBe("\u001b[32m◓\u001b[39m");
      expect(next.filter((_row, index) => index !== 2)).toEqual(first.filter((_row, index) => index !== 2));
      expect(next.map(displayWidth)).toEqual([0, 1, 1, 1, 1]);
      preview.frames(choices, 4, theme);
      expect(vi.getTimerCount()).toBe(1);
      preview.frames(choices, 0, theme);
      expect(vi.getTimerCount()).toBe(0);
      preview.frames(choices, 3, theme);
      expect(vi.getTimerCount()).toBe(1);
      preview.frames(choices, -1, theme);
      expect(vi.getTimerCount()).toBe(0);
    } finally { preview.dispose(); }
  });

  it("retains readable labels and releases its clock idempotently", () => {
    vi.useFakeTimers();
    const render = vi.fn();
    const preview = new SettingsSpinnerPreview(render);
    expect(choices.map(progressSpinnerLabel)).toEqual(["None", "Current", "Circle", "Diamond", "Rotating square"]);
    preview.frames(choices, 1, theme);
    preview.dispose(); preview.dispose();
    vi.advanceTimersByTime(500);
    expect(vi.getTimerCount()).toBe(0);
    expect(render).not.toHaveBeenCalled();
  });
});
