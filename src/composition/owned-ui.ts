import { resolveProductPaths } from "../foundation/lifecycle/index.js";
import { applyConfiguredPiTheme, getAvailablePiThemes } from "../integrations/pi/components/index.js";
import { createPiEngineAdapter, type PiEngineAdapter } from "../integrations/pi/engine/index.js";
import { OwnedUiSessionShell } from "../integrations/pi/owned-ui/index.js";
import { OwnedUiSettingsSession, OwnedUiSettingsStore } from "../ui/settings/index.js";
import { createPiTerminalBridge } from "../integrations/pi/tui-runtime/index.js";
import type { OwnedUiApplicationPort, PresentationTerminalPort } from "../contracts/presentation/index.js";
import { createOwnedRouteHost } from "./settings-route-host.js";

export interface OwnedUiCompositionOptions {
  readonly cwd?: string;
  readonly terminal?: PresentationTerminalPort;
  readonly createPiAdapter?: () => Promise<PiEngineAdapter>;
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
    : await createPiEngineAdapter({ cwd, availableThemes: () => getAvailablePiThemes().map(theme => theme.name) });
  const settings = options.profileId === undefined
    ? null
    : new OwnedUiSettingsSession({
      store: new OwnedUiSettingsStore({ configDir: resolveProductPaths().configDir, profileId: options.profileId }),
      agentProvider: () => adapter.settingsPort(),
    });
  // Before anything is drawn, so every surface uses the configured theme rather
  // than the one guessed from the terminal's background.
  applyConfiguredPiTheme(adapter.configuredTheme());

  const routeHost = settings === null || options.ownedSurfaces === "off" ? null : createOwnedRouteHost(settings);
  const shell = new OwnedUiSessionShell({
    backend: adapter,
    cwd,
    ...(options.terminal === undefined ? {} : { terminal: createPiTerminalBridge(options.terminal) }),
    ...(routeHost === null ? {} : { routeHost }),
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
