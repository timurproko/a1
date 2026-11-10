import type { ShellPresentationPorts } from "../../../contracts/presentation/index.js";
import { PI_THEME_SOURCE, paintPiFloatingDialog } from "../components/theme.js";
import { piCanvasBackgroundAnsi, PINNED_PI_LAYOUT } from "../components/upstream/theme/theme.js";
import { PI_TERMINAL_RUNTIME } from "../tui-runtime/runtime-factory.js";

/** Everything the shell takes from Pi's presentation, assembled once from the component and TUI adapters. */
export const PI_SHELL_PRESENTATION: ShellPresentationPorts = Object.freeze({
  theme: PI_THEME_SOURCE,
  canvasBackground: (style: Parameters<ShellPresentationPorts["canvasBackground"]>[0]) => piCanvasBackgroundAnsi(style),
  pinnedOutputPad: PINNED_PI_LAYOUT.outputPad,
  floatingDialogSurface: paintPiFloatingDialog,
  terminalRuntime: PI_TERMINAL_RUNTIME,
});
