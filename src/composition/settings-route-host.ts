import { SETTINGS_APP_ID, SETTINGS_ROUTE } from "../features/owned-ui/settings-route.js";
import { piTheme } from "../integrations/pi/components/upstream/theme/theme.js";
import type { OwnedSettingsManager } from "../ui/settings/manager.js";
import type { UiRouteHost, UiRouteSurface } from "../ui/apps/contracts.js";
import { faint } from "../ui/components/text.js";
import type { UiTheme, UiThemeToken } from "../ui/components/theme.js";

/**
 * Declares the A1-owned settings route without evaluating its presentation graph
 * during startup. Opening the route retains input while the optional module loads.
 */
export function createOwnedRouteHost(settings: OwnedSettingsManager): UiRouteHost {
  return {
    claims: route => route === SETTINGS_ROUTE,
    open: route => route === SETTINGS_ROUTE ? deferredSettingsSurface(settings) : null,
  };
}

function deferredSettingsSurface(settings: OwnedSettingsManager): UiRouteSurface {
  let delegate: UiRouteSurface | null = null;
  let closed = false;
  let failure: string | null = null;
  let onRender: () => void = () => undefined;
  let onExit: () => void = () => undefined;
  const pending: Array<(surface: UiRouteSurface) => void> = [];
  void loadSettingsSurface(settings).then(surface => {
    if (closed) { surface.close(); return; }
    delegate = surface;
    surface.onRenderRequested(() => onRender());
    surface.onExitRequested(() => onExit());
    for (const action of pending.splice(0)) action(surface);
    onRender();
  }).catch(error => {
    failure = `Could not load settings: ${error instanceof Error ? error.message : String(error)}`;
    onRender();
  });
  const defer = (action: (surface: UiRouteSurface) => void): void => {
    if (delegate !== null) action(delegate);
    else if (!closed && pending.length < 32) pending.push(action);
  };
  return {
    id: SETTINGS_APP_ID,
    render: (width, height) => delegate?.render(width, height)
      ?? [...(height > 0 ? [failure ?? "Loading settings…"] : []), ...Array(Math.max(0, height - 1)).fill("")]
        .map(line => line.slice(0, Math.max(0, width))),
    handleInput: data => { defer(surface => surface.handleInput(data)); return true; },
    handleMouse: event => { defer(surface => surface.handleMouse(event)); return true; },
    isClosed: () => closed || delegate?.isClosed() === true,
    close: () => { closed = true; pending.length = 0; delegate?.close(); },
    onRenderRequested: listener => { onRender = listener; },
    onExitRequested: listener => { onExit = listener; },
  };
}

async function loadSettingsSurface(settings: OwnedSettingsManager): Promise<UiRouteSurface> {
  const [{ SettingsApp }, { UiAppHost }, { UiAppRegistry }] = await Promise.all([
    import("../features/owned-ui/settings-app.js"),
    import("../ui/apps/host.js"),
    import("../ui/apps/registry.js"),
  ]);
  const registry = new UiAppRegistry();
  registry.register({ id: SETTINGS_APP_ID, route: SETTINGS_ROUTE, create: () => new SettingsApp(settings) });
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
  host.open(SETTINGS_APP_ID);
  return {
    id: SETTINGS_APP_ID,
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
}

/** Maps A1 UI tokens onto the pinned Pi theme so owned screens match the shell. */
function pinnedTheme(): UiTheme {
  return {
    fg: (token: UiThemeToken, text: string) => piTheme().fg(token, text),
    bold: (text: string) => piTheme().bold(text),
    plain: (text: string) => text,
    disabled: (text: string) => faint(piTheme().fg("dim", text)),
    highlight: (text: string) => `\u001b[48;2;82;82;82m\u001b[97m${text}\u001b[39m\u001b[49m`,
    panel: (text: string) => `\u001b[48;2;55;55;55m${text}\u001b[49m`,
  };
}
