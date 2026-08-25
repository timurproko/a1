import { SETTINGS_APP_ID, SETTINGS_ROUTE, SettingsApp } from "../features/owned-ui/index.js";
import { piTheme } from "../integrations/pi/components/index.js";
import type { UiRouteHost, UiRouteSurface } from "../integrations/pi/owned-ui/index.js";
import type { OwnedUiSettingsSession } from "../foundation/owned-ui-settings/index.js";
import { UiAppHost, UiAppRegistry } from "../foundation/ui-apps/index.js";
import { faint, type UiTheme, type UiThemeToken } from "../foundation/ui-components/index.js";

/**
 * Registers the A1-owned screens and adapts the app host to the shell's route
 * seam. The shell mounts whatever surface it is handed and forwards keys; it
 * never learns what an app is.
 */
export function createOwnedRouteHost(settings: OwnedUiSettingsSession): UiRouteHost {
  const registry = new UiAppRegistry();
  registry.register({ id: SETTINGS_APP_ID, route: SETTINGS_ROUTE, create: () => new SettingsApp(settings) });

  return {
    claims: route => registry.forRoute(route) !== null,
    open: route => {
      const registration = registry.forRoute(route);
      if (registration === null) return null;

      let size = { width: 80, height: 24 };
      let frame: readonly string[] = [];
      let closed = false;
      let onRender: () => void = () => undefined;
      let onExit: () => void = () => undefined;

      const host = new UiAppHost({
        registry,
        closeOnInterrupt: true,
        theme: pinnedTheme(),
        surface: {
          size: () => size,
          requestRender: () => onRender(),
          exit: () => onExit(),
          present: lines => {
            if (lines === null) closed = true;
            else frame = lines;
          },
        },
      });
      host.open(registration.id);

      const surface: UiRouteSurface = {
        id: registration.id,
        render: (width, height) => {
          size = { width, height };
          host.render();
          return frame.length === height ? frame : [...frame.slice(0, height), ...Array(Math.max(0, height - frame.length)).fill("")];
        },
        handleInput: data => host.handleInput(data).consumed,
        handleMouse: event => host.handleMouse(event).consumed,
        isClosed: () => closed || !host.isPresenting,
        close: () => host.close(),
        onRenderRequested: listener => { onRender = listener; },
        onExitRequested: listener => { onExit = listener; },
      };
      return surface;
    },
  };
}

/** Maps A1 UI tokens onto the pinned Pi theme so owned screens match the shell. */
function pinnedTheme(): UiTheme {
  return {
    fg: (token: UiThemeToken, text: string) => piTheme().fg(token, text),
    bold: (text: string) => piTheme().bold(text),
    // Unpainted, so a list reads against the terminal the reader actually has
    // rather than against the background the configured theme was built for.
    plain: (text: string) => text,
    // Quiet, and quieter again: the terminal's own faint attribute over the
    // dimmest colour the theme has.
    disabled: (text: string) => faint(piTheme().fg("dim", text)),
    highlight: (text: string) => `[48;2;82;82;82m[97m${text}[39m[49m`,
    panel: (text: string) => `[48;2;55;55;55m${text}[49m`,
  };
}
