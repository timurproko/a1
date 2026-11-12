import { afterEach, describe, expect, it } from "vitest";
import { UI_ACCENT_COLORS } from "../../../../src/contracts/owned-ui/index.js";
import { SHARED_PROGRESS_PALETTE } from "../../../../src/contracts/presentation/index.js";
import { applyPiTheme, derivePiCanvasBackground, piTheme, setPiAccentColor, stopPiThemeWatcher } from "../../../../src/integrations/pi/components/index.js";
import { renderPiAccentPreview } from "../../../../src/integrations/pi/components/upstream/theme/theme.js";

afterEach(() => { setPiAccentColor("blue"); stopPiThemeWatcher(); });

describe("session color inventory and grey palette", () => {
  it("uses the requested seven-color order without an automatic choice", () => {
    expect(UI_ACCENT_COLORS).toEqual(["blue", "green", "orange", "pink", "purple", "cyan", "grey"]);
    expect(Object.keys(SHARED_PROGRESS_PALETTE)).toEqual(UI_ACCENT_COLORS);
  });

  for (const appearance of ["dark", "light"] as const) {
    for (const mode of ["truecolor", "256color"] as const) {
      it(`keeps grey neutral and previews consistent in ${appearance} ${mode}`, () => {
        applyPiTheme(appearance, false, mode);
        setPiAccentColor("blue");
        const unchanged = ["success", "error", "warning", "text"] as const;
        const previous = unchanged.map(role => piTheme().fg(role, "probe"));
        setPiAccentColor("grey");
        const theme = piTheme();
        for (const role of ["accent", "border", "mdHeading", "selectedBg", "userMessageBg"] as const) {
          expect(theme.colors[role]).toMatchObject({ kind: "rgb" });
          const color = theme.colors[role] as { r: number; g: number; b: number };
          expect(Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b)).toBeLessThanOrEqual(1);
        }
        expect(derivePiCanvasBackground("accent", theme.colors.accent)).toMatchObject({ kind: "rgb" });
        const canvas = derivePiCanvasBackground("accent", theme.colors.accent) as { r: number; g: number; b: number };
        expect(Math.max(canvas.r, canvas.g, canvas.b) - Math.min(canvas.r, canvas.g, canvas.b)).toBeLessThanOrEqual(1);
        expect(theme.fg("accent", "■")).toBe(renderPiAccentPreview("grey", "■"));
        expect(theme.getFgAnsi("accent")).toBe(SHARED_PROGRESS_PALETTE.grey[appearance][mode].accent);
        expect(theme.fg("accent", "probe")).not.toBe(theme.fg("border", "probe"));
        expect(unchanged.map(role => theme.fg(role, "probe"))).toEqual(previous);
      });
    }
  }
});
