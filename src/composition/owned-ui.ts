import { resolveProductPaths } from "../foundation/lifecycle/index.js";
import { applyConfiguredPiTheme, getAvailablePiThemes } from "../integrations/pi/components/index.js";
import {
  createPiEngineAdapter,
  type PiEngineAdapter,
  type PiProjectTrustPreflightPrompt,
} from "../integrations/pi/engine/index.js";
import { OwnedUiSessionShell } from "../integrations/pi/session-ui/index.js";
import { OwnedUiSettingsSession, OwnedUiSettingsStore } from "../ui/settings/index.js";
import { createPiTerminalBridge } from "../integrations/pi/tui-runtime/index.js";
import type { OwnedUiApplicationPort, PresentationTerminalPort } from "../contracts/presentation/index.js";
import type { OwnedUiViewportSettings, OwnedUiViewportSettingsPort } from "../contracts/owned-ui/index.js";
import { createOwnedRouteHost } from "./settings-route-host.js";

export interface OwnedUiCompositionOptions {
  readonly cwd?: string;
  readonly terminal?: PresentationTerminalPort;
  readonly createPiAdapter?: () => Promise<PiEngineAdapter>;
  /** Exact persisted session selected by the narrow `--session` launch form. */
  readonly sessionPath?: string;
  /**
   * A1 profile whose settings this session reads and writes. Omitted keeps the
   * session settings-free, which is what the pinned comparison paths use.
   */
  readonly profileId?: string;
  /**
   * Whether A1's product-specific surfaces are reachable. Comparison profiles
   * use the same composition with those surfaces withheld.
   */
  readonly ownedSurfaces?: "on" | "off";
  readonly projectTrustPrompt?: PiProjectTrustPreflightPrompt;
}

export interface OwnedUiComposition {
  readonly application: OwnedUiApplicationPort;
  /** Present when a profile was supplied, so the caller can resolve settings before start. */
  readonly settings: OwnedUiSettingsSession | null;
}

export async function composeOwnedUiApplication(options: OwnedUiCompositionOptions = {}): Promise<OwnedUiApplicationPort> {
  return (await composeOwnedUi(options)).application;
}

export async function composeOwnedUi(options: OwnedUiCompositionOptions = {}): Promise<OwnedUiComposition> {
  const cwd = options.cwd ?? process.cwd();
  const adapter = options.createPiAdapter
    ? await options.createPiAdapter()
    : await createPiEngineAdapter({
      cwd,
      availableThemes: () => getAvailablePiThemes().map(theme => theme.name),
      settingsProductMode: options.ownedSurfaces === "off" ? "comparison" : "bare",
      ...(options.sessionPath === undefined ? {} : { sessionPath: options.sessionPath }),
      ...(options.projectTrustPrompt === undefined ? {} : { projectTrustPrompt: options.projectTrustPrompt }),
    });
  const ownedSurfaces = options.ownedSurfaces !== "off";
  const settings = options.profileId === undefined
    ? null
    : new OwnedUiSettingsSession({
      store: new OwnedUiSettingsStore({ configDir: resolveProductPaths().configDir, profileId: options.profileId }),
      agentProvider: () => adapter.settingsPort(),
    });
  // Bare A1 intentionally ships one visual target while its UI is being completed:
  // dark, regardless of terminal detection or a previously stored Pi theme. The
  // comparison profile keeps Pi's configured theme behavior and settings surface.
  applyConfiguredPiTheme(ownedSurfaces ? "dark" : adapter.configuredTheme());

  const routeHost = settings === null || !ownedSurfaces ? null : createOwnedRouteHost(settings);
  const viewportSettings: OwnedUiViewportSettingsPort | null = settings === null || !ownedSurfaces ? null : {
    snapshot: () => viewportSettingsSnapshot(settings),
    onChange: listener => settings.onChange(() => listener(viewportSettingsSnapshot(settings))),
  };
  const shell = new OwnedUiSessionShell({
    backend: adapter,
    cwd,
    ...(options.terminal === undefined ? {} : { terminal: createPiTerminalBridge(options.terminal) }),
    ...(routeHost === null ? {} : { routeHost }),
    ...(ownedSurfaces ? { sessionLayout: "custom-viewport" as const } : {}),
    ...(viewportSettings === null ? {} : { viewportSettings }),
  });
  const application: OwnedUiApplicationPort = {
    get disposed() { return adapter.disposed; },
    start: () => shell.start(),
    flush: () => adapter.flushEvents(),
    waitUntilStopped: () => shell.waitUntilStopped(),
    dispose: () => shell.dispose(),
  };
  return { application, settings };
}

function viewportSettingsSnapshot(settings: OwnedUiSettingsSession): OwnedUiViewportSettings {
  const appearance = settings.value("scrollbarAppearance");
  const style = settings.value("scrollbarStyle");
  const speed = settings.value("scrollbarSpeed");
  return {
    scrollbarAppearance: appearance === "always" || appearance === "hidden" ? appearance : "auto",
    scrollbarStyle: style === "thick" ? "thick" : "thin",
    scrollbarSpeed: speed === "high" ? "high" : speed === "fast" ? "fast" : "normal",
  };
}
