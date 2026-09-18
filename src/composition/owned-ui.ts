import { SuggestionDiagnosticCapture } from "../features/prompt-suggestions/diagnostics.js";
import { PRODUCT_IDENTITY } from "../product-identity.js";
import { PromptHistoryService } from "../features/prompt-history/service.js";
import { PromptImageSidecar } from "../features/prompt-history/image-sidecar.js";
import { resolvePromptHistoryPath } from "../features/prompt-history/paths.js";
import { resolvePromptHistoryDataDir } from "../features/launch/profile-paths.js";
import { resolveProductPaths } from "../foundation/lifecycle/paths.js";
import type { SessionSelection } from "../foundation/lifecycle/session-selection.js";
import { applyConfiguredPiTheme, getAvailablePiThemes } from "../integrations/pi/components/upstream/theme/theme.js";
import { createPiEngineAdapter } from "../integrations/pi/engine/adapter.js";
import type { PiEngineAdapter } from "../integrations/pi/engine/adapter.js";
import type { PiProjectTrustPreflightPrompt } from "../integrations/pi/engine/project-trust-preflight.js";
import type { PiSessionForkPrompt } from "../integrations/pi/engine/session-selection.js";
import { ClipboardDiagnosticCapture } from "../app/session-shell/clipboard-diagnostics.js";
import { OwnedUiSessionShell } from "../app/session-shell/session-shell.js";
import { OwnedUiSettingsSession } from "../ui/settings/session.js";
import { OwnedUiSettingsStore } from "../ui/settings/store.js";
import { createPiTerminalBridge } from "../integrations/pi/tui-runtime/presentation-adapter.js";
import type { OwnedUiApplicationPort, PresentationTerminalPort } from "../contracts/presentation/index.js";
import type { OwnedUiQuitOutroSettings, OwnedUiViewportSettings, OwnedUiViewportSettingsPort } from "../contracts/owned-ui/index.js";
import { createOwnedRouteHost } from "./settings-route-host.js";

export interface OwnedUiCompositionOptions {
  readonly cwd?: string;
  readonly terminal?: PresentationTerminalPort;
  readonly createPiAdapter?: () => Promise<PiEngineAdapter>;
  /** Explicit file selection retained for SDK callers. Public CLI uses sessionSelection. */
  readonly sessionPath?: string;
  readonly sessionSelection?: SessionSelection;
  readonly sessionForkPrompt?: PiSessionForkPrompt;
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
  /** Explicit local diagnostic destination; ignored by comparison/settings-free compositions. */
  readonly suggestionDiagnosticsPath?: string;
  /** Optional local metadata-only clipboard diagnostics; never enabled in comparison profiles. */
  readonly clipboardDiagnosticsPath?: string;
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
      ...(options.sessionSelection === undefined ? {} : { sessionSelection: options.sessionSelection }),
      ...(options.sessionForkPrompt === undefined ? {} : { sessionForkPrompt: options.sessionForkPrompt }),
      ...(options.projectTrustPrompt === undefined ? {} : { projectTrustPrompt: options.projectTrustPrompt }),
    });
  const ownedSurfaces = options.ownedSurfaces !== "off";
  const settings = options.profileId === undefined
    ? null
    : new OwnedUiSettingsSession({
      store: new OwnedUiSettingsStore({ configDir: resolveProductPaths().configDir, profileId: options.profileId }),
      agentProvider: () => adapter.settingsPort(),
    });
  // Compatibility: bare A1 intentionally ships one visual target while its UI is being completed:
  // dark, regardless of terminal detection or a previously stored Pi theme. The
  // comparison profile keeps Pi's configured theme behavior and settings surface.
  applyConfiguredPiTheme(ownedSurfaces ? "dark" : adapter.configuredTheme());

  const routeHost = settings === null || !ownedSurfaces ? null : createOwnedRouteHost(settings);
  const viewportSettings: OwnedUiViewportSettingsPort | null = settings === null || !ownedSurfaces ? null : {
    snapshot: () => viewportSettingsSnapshot(settings),
    onChange: listener => settings.onChange(() => listener(viewportSettingsSnapshot(settings))),
  };
  const diagnosticDestination = options.suggestionDiagnosticsPath ?? process.env[PRODUCT_IDENTITY.environment.suggestionDiagnostics];
  const suggestionDiagnostics = settings !== null && ownedSurfaces && diagnosticDestination?.trim()
    ? new SuggestionDiagnosticCapture({ enabled: true, destination: diagnosticDestination }) : null;
  const promptSuggestions = settings === null || !ownedSurfaces ? null : {
    ...(suggestionDiagnostics === null ? {} : { diagnostics: suggestionDiagnostics }),
    generator: adapter,
    enabled: () => settings.value("promptSuggestions") !== false,
    onChange: (listener: (enabled: boolean) => void) => settings.onChange(() => listener(settings.value("promptSuggestions") !== false)),
  };
  const historyLimit = settings?.value("promptHistoryMaxItems");
  const historyProfileLocation = settings === null || !ownedSurfaces || settings.value("promptHistoryEnabled") === false
    ? null
    : resolvePromptHistoryPath(resolvePromptHistoryDataDir(), adapter.agentDir);
  const promptHistory = historyProfileLocation === null ? null : {
    limit: typeof historyLimit === "number" ? historyLimit : 100,
    store: new PromptHistoryService({
      dataDir: resolvePromptHistoryDataDir(),
      profileRoot: adapter.agentDir,
      limit: typeof historyLimit === "number" ? historyLimit : 100,
    }),
    imageSidecar: new PromptImageSidecar(historyProfileLocation.imagesDir),
  };
  const clipboardDestination = options.clipboardDiagnosticsPath ?? process.env[PRODUCT_IDENTITY.environment.clipboardDiagnostics];
  const clipboardDiagnostics = settings !== null && ownedSurfaces && clipboardDestination?.trim()
    ? new ClipboardDiagnosticCapture(clipboardDestination) : null;
  let shell: OwnedUiSessionShell;
  try {
    shell = new OwnedUiSessionShell({
      engine: {
        backend: adapter,
        cwd: adapter.cwd,
        ...(routeHost === null ? {} : { routeHost }),
        ...(ownedSurfaces ? { sessionLayout: "custom-viewport" as const } : {}),
      },
      presentation: {
        ...(options.terminal === undefined ? {} : { terminal: createPiTerminalBridge(options.terminal) }),
        ...(clipboardDiagnostics === null ? {} : { input: { onEvent: event => clipboardDiagnostics.runtime(event) } }),
        ...(viewportSettings === null ? {} : { viewportSettings }),
        ...(settings === null || !ownedSurfaces ? {} : {
          quitOutro: { snapshot: () => quitOutroSettingsSnapshot(settings), interactive: process.stdout.isTTY === true },
        }),
      },
      ...(clipboardDiagnostics === null ? {} : { diagnostics: {
        responseCopy: { onEvent: event => clipboardDiagnostics.copy(event) },
        paste: event => clipboardDiagnostics.paste(event),
      } }),
      ...(promptSuggestions === null ? {} : { suggestions: promptSuggestions }),
      ...(promptHistory === null ? {} : { history: {
        ...promptHistory,
        editor: await import("../integrations/pi/components/history-editor-loader.js").then(module => module.loadHistoryEditor()),
      } }),
    });
  } catch (error) {
    clipboardDiagnostics?.dispose(); suggestionDiagnostics?.dispose();
    throw error;
  }
  const application: OwnedUiApplicationPort = {
    get disposed() { return adapter.disposed; },
    start: () => shell.start(),
    flush: () => adapter.flushEvents(),
    waitUntilStopped: () => shell.waitUntilStopped(),
    dispose: async () => {
      try { await shell.dispose(); } finally { suggestionDiagnostics?.dispose(); clipboardDiagnostics?.dispose(); }
    },
  };
  return { application, settings };
}

function quitOutroSettingsSnapshot(settings: OwnedUiSettingsSession): OwnedUiQuitOutroSettings {
  const effect = settings.value("quitEffect");
  const durationMs = settings.value("quitEffectDurationMs");
  return {
    enabled: settings.value("quitAnimation") !== false,
    effect: effect === "dissolve" || effect === "starburst" || effect === "waves" ? effect : "fall",
    durationMs: typeof durationMs === "number" ? durationMs : 800,
  };
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
