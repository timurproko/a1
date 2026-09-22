import {
  CHANGELOG_APP_ID,
  CHANGELOG_ROUTE,
  CHANGELOG_TITLE,
  HOTKEYS_APP_ID,
  HOTKEYS_ROUTE,
  HOTKEYS_TITLE,
} from "../features/owned-ui/reference-routes.js";
import { SETTINGS_APP_ID, SETTINGS_ROUTE } from "../features/owned-ui/settings-route.js";
import { piTheme } from "../integrations/pi/components/upstream/theme/theme.js";
import type { ReferenceDocumentProvider } from "../features/owned-ui/reference-screen-app.js";
import type { OwnedSettingsManager } from "../ui/settings/manager.js";
import type { UiApp, UiRouteHost, UiRouteInput, UiRouteSurface } from "../ui/apps/contracts.js";
import { faint } from "../ui/components/text.js";
import type { UiTheme, UiThemeToken } from "../ui/components/theme.js";

/** Styled document rows for one content width. */
export type OwnedReferenceRows = NonNullable<ReferenceDocumentProvider["rows"]>;

/** Documents supplied by composition so the route host never reads shell data itself. */
export interface OwnedReferenceProviders {
  changelog(input?: UiRouteInput): Promise<ReferenceDocumentProvider>;
  hotkeys(): Promise<ReferenceDocumentProvider>;
}

/**
 * Declares the A1-owned settings route, and the changelog and hotkeys reference
 * routes when their documents are supplied, without evaluating their presentation
 * graphs during startup. Opening a route retains input while the optional module loads.
 */
export function createOwnedRouteHost(settings: OwnedSettingsManager, references?: OwnedReferenceProviders): UiRouteHost {
  const routes = new Set([SETTINGS_ROUTE, ...(references === undefined ? [] : [CHANGELOG_ROUTE, HOTKEYS_ROUTE])]);
  return {
    claims: route => routes.has(route),
    open: (route, input) => {
      if (!routes.has(route)) return null;
      if (route === SETTINGS_ROUTE) {
        return deferredSurface(SETTINGS_APP_ID, "settings", () => loadSettingsSurface(settings));
      }
      const changelog = route === CHANGELOG_ROUTE;
      const id = changelog ? CHANGELOG_APP_ID : HOTKEYS_APP_ID;
      const title = changelog ? CHANGELOG_TITLE : HOTKEYS_TITLE;
      const document = changelog ? references!.changelog(input) : references!.hotkeys();
      return deferredSurface(id, title, () => loadReferenceSurface(settings, id, route, title, document));
    },
  };
}

function deferredSurface(id: string, label: string, load: () => Promise<UiRouteSurface>): UiRouteSurface {
  let delegate: UiRouteSurface | null = null;
  let closed = false;
  let failure: string | null = null;
  let onRender: () => void = () => undefined;
  let onExit: () => void = () => undefined;
  const pending: Array<(surface: UiRouteSurface) => void> = [];
  void load().then(surface => {
    if (closed) { surface.close(); return; }
    delegate = surface;
    surface.onRenderRequested(() => onRender());
    surface.onExitRequested(() => onExit());
    for (const action of pending.splice(0)) action(surface);
    onRender();
  }).catch(error => {
    failure = `Could not load ${label}: ${error instanceof Error ? error.message : String(error)}`;
    onRender();
  });
  const defer = (action: (surface: UiRouteSurface) => void): void => {
    if (delegate !== null) action(delegate);
    else if (!closed && pending.length < 32) pending.push(action);
  };
  return {
    id,
    render: (width, height) => delegate?.render(width, height)
      ?? Array.from({ length: Math.max(0, height) }, (_, row) => row === 0 && failure !== null ? failure.slice(0, Math.max(0, width)) : ""),
    handleInput: data => { defer(surface => surface.handleInput(data)); return true; },
    handleMouse: event => { defer(surface => surface.handleMouse(event)); return true; },
    isClosed: () => closed || delegate?.isClosed() === true,
    close: () => { closed = true; pending.length = 0; delegate?.close(); },
    onRenderRequested: listener => { onRender = listener; },
    onExitRequested: listener => { onExit = listener; },
  };
}

async function loadSettingsSurface(settings: OwnedSettingsManager): Promise<UiRouteSurface> {
  const { SettingsApp } = await import("../features/owned-ui/settings-app.js");
  return hostApp(SETTINGS_APP_ID, SETTINGS_ROUTE, () => new SettingsApp(settings));
}

async function loadReferenceSurface(
  settings: OwnedSettingsManager,
  id: string,
  route: string,
  title: string,
  document: Promise<ReferenceDocumentProvider>,
): Promise<UiRouteSurface> {
  // Rationale: the app module and the document load together, so a document that fails
  // to render is reported by the placeholder rather than by a screen that never fills.
  const [{ ReferenceScreenApp }, content] = await Promise.all([import("../features/owned-ui/reference-screen-app.js"), document]);
  return hostApp(id, route, () => new ReferenceScreenApp({
    id,
    title,
    document: content,
    scrollSettings: () => ({
      scrollbarAppearance: settings.value("scrollbarAppearance"),
      scrollbarStyle: settings.value("scrollbarStyle"),
      scrollbarSpeed: settings.value("scrollbarSpeed"),
    }),
  }));
}

async function hostApp(id: string, route: string, create: () => UiApp): Promise<UiRouteSurface> {
  const [{ UiAppHost }, { UiAppRegistry }] = await Promise.all([
    import("../ui/apps/host.js"),
    import("../ui/apps/registry.js"),
  ]);
  const registry = new UiAppRegistry();
  registry.register({ id, route, create });
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
  host.open(id);
  return {
    id,
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
