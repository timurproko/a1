import { getKeybindings, matchesKey, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import type { OwnedUiShellComponentPort } from "../../../contracts/owned-ui/index.js";
import { piTheme } from "./theme.js";

/** Borderless footer-name popup using the pre-pivot palette. */
export function createPiSessionNameMenu(onEdit: () => void, onCancel: () => void, requestRender: () => void): OwnedUiShellComponentPort {
  let hovered = false;
  return {
    render(width) {
      const theme = piTheme(), rgb = theme.getColorMode() === "truecolor";
      const text = truncateToWidth(" Edit ", width, "");
      const label = `\u001b[22m${rgb ? "\u001b[38;2;255;255;255m" : "\u001b[38;5;15m"}${text}${" ".repeat(Math.max(0, width - visibleWidth(text)))}\u001b[39m`;
      return [hovered ? theme.bg("selectedBg", label)
        : `${rgb ? "\u001b[48;2;38;38;38m" : "\u001b[48;5;235m"}${label}\u001b[49m`];
    },
    invalidate() {},
    handleInput(data) {
      const keys = getKeybindings();
      if (keys.matches(data, "tui.select.cancel") || matchesKey(data, "ctrl+c")) onCancel();
      else if (keys.matches(data, "tui.select.up") || keys.matches(data, "tui.select.down")) {
        hovered = true;
        requestRender();
      } else if (hovered && keys.matches(data, "tui.select.confirm")) onEdit();
    },
    handleLocalMouse(event) {
      const inside = event.row === 1 && event.column >= 1 && event.column <= 6;
      if (event.kind === "motion") {
        hovered = inside;
        requestRender();
      } else if (inside && event.kind === "press" && event.button === 0) onEdit();
    },
  };
}
