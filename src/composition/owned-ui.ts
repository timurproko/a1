import { SuggestionDiagnosticCapture } from "../features/prompt-suggestions/diagnostics.js";
import { PRODUCT_IDENTITY } from "../product-identity.js";
import { PromptHistoryService } from "../features/prompt-history/service.js";
import { PromptImageSidecar } from "../features/prompt-history/image-sidecar.js";
import { resolvePromptHistoryPath } from "../features/prompt-history/paths.js";
import { resolvePromptHistoryDataDir } from "../features/launch/profile-paths.js";
import { resolveProductPaths } from "../foundation/lifecycle/paths.js";
import type { AvailableRelease, StartupReleaseCheckOptions, StartupUpdateMode } from "../foundation/release/latest-release.js";
import { MAX_CLIPBOARD_TEXT_BYTES } from "../contracts/owned-ui/index.js";
import type { NativeProcessIdentity } from "../foundation/lifecycle/model.js";
import type { SessionSelection } from "../foundation/lifecycle/session-selection.js";
import { applyConfiguredPiTheme, getAvailablePiThemes, setPiAccentColor, setPiPackageBorderProjectionEnabled } from "../integrations/pi/components/upstream/theme/theme.js";
import { createPiEngineHost, type PiEngineHostOptions } from "../integrations/pi/engine/host.js";
import { createPiSessionPresenters } from "../integrations/pi/session-presenters/index.js";
import type { PiProjectTrustPreflightPrompt } from "../integrations/pi/engine/project-trust-preflight.js";
import type { PiSessionForkPrompt } from "../integrations/pi/engine/session-selection.js";
import { ClipboardDiagnosticCapture } from "../app/session-shell/clipboard-diagnostics.js";
import { createOwnedUiClipboardServices } from "../app/session-shell/clipboard-services.js";
import { writeSystemClipboardText } from "../app/session-shell/system-clipboard.js";
import { createPiKeybindingsHost } from "../integrations/pi/components/shell-shared-facade.js";
import {
  OwnedUiSessionPresenter,
  OwnedUiTerminalHost,
  sessionTerminalHostOptions,
  type OwnedUiSessionShellOptions,
} from "../app/session-shell/session-shell.js";
import type { OwnedSettingsManager } from "../ui/settings/manager.js";
import { createPiTerminalBridge } from "../integrations/pi/tui-runtime/presentation-adapter.js";
import type { OwnedUiApplicationPort, PresentationTerminalPort } from "../contracts/presentation/index.js";
import type {
  OwnedUiBackgroundSettingsPort,
  OwnedUiQuitOutroSettings,
  OwnedUiViewportSettings,
  OwnedUiViewportSettingsPort,
} from "../contracts/owned-ui/index.js";
import { createOwnedRouteHost, type OwnedReferenceProviders, type OwnedRouteHostOptions } from "./settings-route-host.js";
import { renderPiShellChangelogLines } from "../integrations/pi/components/shell-presenters-info.js";
import type { ReleaseNoteCatalog } from "../features/owned-ui/release-notes.js";
import { nativeHyperlinkStyle } from "../ui/components/spans.js";
import type { TabBridgeClient } from "../foundation/resident-tabs/bridge-client.js";
import { ResidentTabRecovery } from "../foundation/resident-tabs/recovery.js";
import { bindResidentTabBridge, closeResidentUtilityRoute, correlateResidentTabSubmission, currentBackendSessionFile, residentRouteHostOptions, residentTabKeybindings } from "./resident-tab-bridge.js";
import type { ComposedEngineHost, ComposedSessionBackend } from "./session-backend.js";
import { SessionRuntimeRegistry } from "./session-runtime-registry.js";
import { readPackageVersion, StartupReleaseNote } from "./startup-route.js";
import { createOwnedSettingsManager, watchSharedSettings } from "./owned-settings.js";

export type { ComposedEngineHost, ComposedSessionBackend } from "./session-backend.js";
export { bindResidentTabBridge, correlateResidentTabSubmission } from "./resident-tab-bridge.js";

export interface OwnedUiCompositionOptions {
  readonly cwd?: string;
  readonly terminal?: PresentationTerminalPort;
  /** Test seam standing in for the Pi engine host; receives the options composition resolved. */
  readonly createEngineHost?: (options: PiEngineHostOptions) => Promise<ComposedEngineHost>;
  /** Explicit file selection retained for SDK callers. Public CLI uses sessionSelection. */
  readonly sessionPath?: string;
  readonly sessionSelection?: SessionSelection;
  readonly sessionForkPrompt?: PiSessionForkPrompt;
  /** A1 settings profile; comparison paths omit it. */
  readonly profileId?: string;
  /** Hide resident-only tab controls for the explicit direct single-agent launch. */
  readonly hideTabSettings?: boolean;
  /** `off` withholds A1-specific surfaces from comparison profiles. */
  readonly ownedSurfaces?: "on" | "off";
  readonly projectTrustPrompt?: PiProjectTrustPreflightPrompt;
  /** Explicit local diagnostic destination; ignored by comparison/settings-free compositions. */
  readonly suggestionDiagnosticsPath?: string;
  /** Optional local metadata-only clipboard diagnostics; never enabled in comparison profiles. */
  readonly clipboardDiagnosticsPath?: string;
  /** Deterministic release-note seams for composition tests. */
  readonly packageVersion?: string;
  readonly notificationVersion?: string | undefined;
  readonly releaseNotes?: ReleaseNoteCatalog;
  /** Startup release-availability seam; defaults to the throttled registry check. */
  readonly checkForNewerRelease?: (options: StartupReleaseCheckOptions) => Promise<AvailableRelease | null>;
  readonly inspectProcess?: (pid: number) => Promise<NativeProcessIdentity | null>;
  readonly tab?: { readonly bridge: TabBridgeClient; readonly dataDir: string; readonly incarnation: number };
  readonly residentFallbackNotice?: string;
}

export interface OwnedUiComposition {
  readonly application: OwnedUiApplicationPort;
  /** Present when a profile was supplied, so the caller can resolve settings before start. */
  readonly settings: OwnedSettingsManager | null;
}

export function residentStartupPresentation(resident: boolean, fallbackNotice?: string): {
  readonly startup?: { readonly quiet?: boolean; readonly notices?: readonly [{ readonly kind: "warning"; readonly message: string }] };
} {
  if (resident) return { startup: { quiet: true } };
  return fallbackNotice === undefined ? {} : { startup: { notices: [{ kind: "warning", message: fallbackNotice }] } };
}

export async function composeOwnedUiApplication(options: OwnedUiCompositionOptions = {}): Promise<OwnedUiApplicationPort> {
  return (await composeOwnedUi(options)).application;
}

export async function composeOwnedUi(options: OwnedUiCompositionOptions = {}): Promise<OwnedUiComposition> {
  const cwd = options.cwd ?? process.cwd();
  const ownedSurfaces = options.ownedSurfaces !== "off";
  const sessionRuntimes = new SessionRuntimeRegistry({
    runtimeId: ownedSurfaces ? process.env[PRODUCT_IDENTITY.environment.sessionRuntimeId] : undefined,
    inspectProcess: options.inspectProcess,
  });
  const productPaths = resolveProductPaths();
  // Rationale: the manager reads the engine's settings port lazily, after the session exists.
  let backend: ComposedSessionBackend;
  const settings = options.profileId === undefined
    ? null
    : createOwnedSettingsManager({
      profileId: options.profileId,
      agentProvider: () => backend.settingsPort(),
      ...(options.hideTabSettings ? { hideTabSettings: true } : {}),
    });
  const tabBridge = options.tab?.bridge ?? null;
  if (tabBridge !== null) await tabBridge.start().catch(() => false);
  const projectTrustPrompt = options.projectTrustPrompt === undefined ? undefined : async (
    request: Parameters<PiProjectTrustPreflightPrompt>[0],
  ) => {
    tabBridge?.status("needs-input", false, 1, 0);
    try {
      return await options.projectTrustPrompt!(request);
    } finally {
      tabBridge?.status("starting");
    }
  };
  // Invariant: process-wide engine state has one owner. The host installs the HTTP dispatcher, applies
  // the theme singletons, and announces startup notices once; every session is created through it.
  const host = await (options.createEngineHost ?? (async hostOptions => createPiEngineHost(hostOptions)))({
    productMode: ownedSurfaces ? "bare" : "comparison",
    availableThemes: () => getAvailablePiThemes().map(theme => theme.name),
    announceStartupChangelog: !ownedSurfaces,
    theme: {
      base: ownedSurfaces ? "dark" : "engine-configured",
      accentColor: settings !== null && ownedSurfaces ? settings.value("accentColor") : "purple",
      packageBorderProjection: ownedSurfaces,
      apply: { base: applyConfiguredPiTheme, accentColor: setPiAccentColor, packageBorderProjection: setPiPackageBorderProjectionEnabled },
    },
    ...(projectTrustPrompt === undefined ? {} : { projectTrustPrompt }),
  });
  const sessionForkPrompt = options.sessionForkPrompt === undefined ? undefined : async (
    request: Parameters<PiSessionForkPrompt>[0],
  ) => {
    tabBridge?.status("needs-input", false, 1, 0);
    try {
      return await options.sessionForkPrompt!(request);
    } finally {
      tabBridge?.status("starting");
    }
  };
  try {
    backend = await host.create({
      cwd,
      ...(ownedSurfaces ? { repositoryContextReader: sessionRuntimes.readerFor(undefined) } : {}),
      ...(options.sessionPath === undefined ? {} : { sessionPath: options.sessionPath }),
      ...(options.sessionSelection === undefined ? {} : { sessionSelection: options.sessionSelection }),
      ...(sessionForkPrompt === undefined ? {} : { sessionForkPrompt }),
    });
  } catch (error) {
    await host.dispose();
    throw error;
  }
  let recoveryDegraded = false;
  let presentRecoveryDegraded = (_degraded: boolean): void => {};
  const tabRecovery = options.tab === undefined ? null : new ResidentTabRecovery(options.tab.dataDir, {
    onDegraded: degraded => {
      recoveryDegraded = degraded;
      options.tab!.bridge.degraded(degraded);
      presentRecoveryDegraded(degraded);
    },
  });
  const recoveredTabInput = await tabRecovery?.initialize(
    currentBackendSessionFile(backend),
    backend.identity.sessionId,
  );
  if (tabBridge !== null && settings !== null && ownedSurfaces) tabBridge.accent(settings.value("accentColor"));
  let removeControllerBoundaryInput = () => {};
  let unsubscribeTabBridge = () => {};
  const releaseNote = await StartupReleaseNote.load({
    ownedSurfaces,
    configDir: productPaths.configDir,
    ...(options.releaseNotes === undefined ? {} : { releaseNotes: options.releaseNotes }),
    ...(options.packageVersion === undefined ? {} : { packageVersion: options.packageVersion }),
    ...(options.profileId === undefined ? {} : { profileId: options.profileId }),
  });
  const unsubscribeAccentChange = settings === null || !ownedSurfaces
    ? () => {}
    : settings.onChange(current => {
      const accent = current.value("accentColor");
      host.setAccentColor(accent);
      tabBridge?.accent(accent);
    });
  // Rationale: resident tabs and separate solo agents share a settings document; a live scope
  // change saved in either reaches the others only by rereading that document.
  const unwatchSharedSettings = settings === null || !ownedSurfaces
    ? () => {}
    : watchSharedSettings(settings);
  const unsubscribeAccent = (): void => { unwatchSharedSettings(); unsubscribeAccentChange(); };

  // Invariant: the Settings search and agent prompt borrow the same resolved Pi keybindings.
  const keybindingsHost = createPiKeybindingsHost({ profile: ownedSurfaces ? "a1" : "pi", agentDir: backend.identity.agentDir });
  const keybindings = residentTabKeybindings(tabBridge, backend.identity.agentDir, keybindingsHost);
  // Rationale: Routes open only after shell construction.
  const references: OwnedReferenceProviders = {
    changelog: async input => {
      if (input?.document === undefined && releaseNote.failure !== undefined) throw releaseNote.failure;
      const markdown = input?.document ?? releaseNote.catalog?.completeMarkdown ?? "No A1 release notes found.";
      return { rows: width => renderPiShellChangelogLines(markdown, width).map(row => nativeHyperlinkStyle(row)) };
    },
    hotkeys: async () => {
      const presentation = presenter.hotkeysPresentation();
      const { renderPiShellHotkeySections } = await import("../integrations/pi/components/shell-hotkey-sections.js");
      return { sections: width => renderPiShellHotkeySections(presentation, width) };
    },
    session: () => import("./session-info-reference.js").then(m => m.loadSessionInfoReference(backend)),
  };
  const routeHost = settings === null || !ownedSurfaces ? null
    : createOwnedRouteHost(settings, references, settingsRouteOptions(tabBridge, keybindings, backend.identity.agentDir, cwd));
  const viewportSettings: OwnedUiViewportSettingsPort | null = settings === null || !ownedSurfaces ? null : {
    snapshot: () => viewportSettingsSnapshot(settings),
    onChange: listener => settings.onChange(() => listener(viewportSettingsSnapshot(settings))),
  };
  const backgroundSettings: OwnedUiBackgroundSettingsPort | null = settings === null || !ownedSurfaces ? null : {
    snapshot: () => settings.value("backgroundStyle"),
    // Rationale: one manager notification also recomputes an accent-derived canvas after accentColor changes.
    onChange: listener => settings.onChange(current => listener(current.value("backgroundStyle"))),
  };
  const diagnosticDestination = options.suggestionDiagnosticsPath ?? process.env[PRODUCT_IDENTITY.environment.suggestionDiagnostics];
  const suggestionDiagnostics = settings !== null && ownedSurfaces && diagnosticDestination?.trim()
    ? new SuggestionDiagnosticCapture({ enabled: true, destination: diagnosticDestination }) : null;
  const promptSuggestions = settings === null || !ownedSurfaces ? null : {
    ...(suggestionDiagnostics === null ? {} : { diagnostics: suggestionDiagnostics }),
    generator: backend,
    enabled: () => settings.value("promptSuggestions"),
    onChange: (listener: (enabled: boolean) => void) => settings.onChange(() => listener(settings.value("promptSuggestions"))),
  };
  const promptImages = settings === null || !ownedSurfaces ? null : {
    limit: () => settings.value("promptImageLimit"),
    onChange: (listener: () => void) => settings.onChange(listener),
  };
  const skills = settings === null || !ownedSurfaces ? null : {
    presentation: () => settings.value("skillsPresentation"),
    // Rationale: one listener covers both the A1 presentation choice and the engine skill-command toggle.
    onChange: (listener: () => void) => settings.onChange(() => listener()),
  };
  const promptHistory = createPromptHistoryConfiguration(settings, backend, ownedSurfaces);
  const clipboardDestination = options.clipboardDiagnosticsPath ?? process.env[PRODUCT_IDENTITY.environment.clipboardDiagnostics];
  const clipboardDiagnostics = settings !== null && ownedSurfaces && clipboardDestination?.trim()
    ? new ClipboardDiagnosticCapture(clipboardDestination) : null;
  // Invariant: process-wide services are created once here and borrowed by every session shell.
  const clipboardServices = ownedSurfaces ? createOwnedUiClipboardServices() : null;
  let createdTerminalHost: OwnedUiTerminalHost | undefined;
  let terminalHost: OwnedUiTerminalHost;
  let presenter: OwnedUiSessionPresenter;
  try {
    const presenterOptions: OwnedUiSessionShellOptions = {
      presenters: createPiSessionPresenters(backend),
      engine: {
        backend,
        cwd: backend.identity.cwd,
        ...(routeHost === null ? {} : { routeHost }),
        ...(releaseNote.startupRoute === undefined ? {} : { startupRoute: releaseNote.startupRoute }),
        ...(ownedSurfaces ? { sessionLayout: "custom-viewport" as const } : {}),
        ...(tabBridge === null || tabRecovery === null ? {} : { residentTab: {
          requestDetach: () => tabBridge.requestDetach(),
          closeOwnedRoute: route => closeResidentUtilityRoute(tabBridge, route),
          reportStatus: status => tabBridge.status(status),
          admit: input => tabRecovery.admit({ ...input, incarnation: options.tab!.incarnation }),
          dispatched: () => tabRecovery.dispatched(),
          correlated: (submissionId, entryId) => correlateResidentTabSubmission(tabRecovery, backend, submissionId, entryId),
          checkpoint: text => tabRecovery.checkpoint(text),
          gracefulStop: sessionFile => tabRecovery.gracefulStop(sessionFile),
          ...(recoveredTabInput === undefined ? {} : { recovered: recoveredTabInput }),
        } }),
      },
      presentation: {
        ...(options.terminal === undefined ? {} : { terminal: createPiTerminalBridge(options.terminal) }),
        ...residentStartupPresentation(tabBridge !== null, options.residentFallbackNotice),
        ...(clipboardDiagnostics === null ? {} : { input: { onEvent: event => clipboardDiagnostics.runtime(event) } }),
        ...(viewportSettings === null ? {} : { viewportSettings }),
        ...(backgroundSettings === null ? {} : { backgroundSettings }),
        ...(settings === null || !ownedSurfaces || tabBridge !== null ? {} : {
          quitOutro: { snapshot: () => quitOutroSettingsSnapshot(settings), interactive: process.stdout.isTTY === true },
        }),
      },
      ...(clipboardDiagnostics === null ? {} : { diagnostics: {
        responseCopy: { onEvent: event => clipboardDiagnostics.copy(event) },
        paste: event => clipboardDiagnostics.paste(event),
      } }),
      ...(promptSuggestions === null ? {} : { suggestions: promptSuggestions }),
      ...(promptImages === null ? {} : { promptImages }),
      ...(skills === null ? {} : { skills }),
      shared: { keybindings, ...(clipboardServices === null ? {} : { clipboard: clipboardServices }) },
      ...(promptHistory === null ? {} : { history: {
        ...promptHistory,
        editor: await import("../integrations/pi/components/history-editor-loader.js").then(module => module.loadHistoryEditor()),
      } }),
    };
    // Invariant: one terminal host owns the process terminal; the session presenter reaches it only through
    // the host and paints once attached.
    terminalHost = createdTerminalHost = new OwnedUiTerminalHost(sessionTerminalHostOptions(presenterOptions));
    if (tabBridge !== null) {
      removeControllerBoundaryInput = terminalHost.runtime.addPreInputListener(data => ({
        data: tabBridge.consumeControllerBoundaryInput(data),
      }));
    }
    presenter = new OwnedUiSessionPresenter(terminalHost, presenterOptions);
    presentRecoveryDegraded = degraded => {
      if (!degraded) return;
      presenter.root.appendWorkflowStatus("draft recovery degraded");
      terminalHost.runtime.requestRender();
    };
    if (recoveryDegraded) presentRecoveryDegraded(true);
    terminalHost.attach(presenter);
    if (tabBridge !== null) {
      unsubscribeTabBridge = await bindResidentTabBridge(tabBridge, backend, tabRecovery, {
        autoName: settings?.value("tabsAutoName") ?? true,
        openRoute: route => presenter.openOwnedRoute(route),
      });
    }
  } catch (error) {
    await createdTerminalHost?.dispose().catch(() => undefined);
    unsubscribeAccent();
    await releaseNote.releaseClaim();
    clipboardDiagnostics?.dispose(); suggestionDiagnostics?.dispose(); clipboardServices?.dispose();
    await host.dispose();
    throw error;
  }
  // Rationale: pinned Pi's version check is unreachable because the owned shell never runs its
  // InteractiveMode, so A1 checks its own channel. The result is never awaited on the startup path;
  // settings are read here because the runner resolves them only just before start.
  const releaseUpdates = createStartupReleaseUpdateObservation({
    backend,
    configDir: productPaths.configDir,
    mode: settings === null || !ownedSurfaces ? "auto" : settings.value("updateCheck"),
    packageVersion: releaseNote.packageVersion, notificationVersion: options.notificationVersion,
    checkForNewerRelease: options.checkForNewerRelease,
  });
  const exitNoticePath = process.env[PRODUCT_IDENTITY.environment.exitNoticePath];
  // Security: tools the agent runs must never see, or rewrite, this instance's notice.
  delete process.env[PRODUCT_IDENTITY.environment.exitNoticePath];
  let exitNotice: Promise<{ clear(): void } | null> = Promise.resolve(null);
  const application: OwnedUiApplicationPort = {
    get disposed() { return backend.identity.disposed; },
    start: () => {
      // Performance: the guardian notice loads beside first paint, never on the startup path.
      if (exitNoticePath) exitNotice = import("../app/session-shell/exit-notice.js")
        .then(module => module.armExitNotice(backend, exitNoticePath), () => null);
      presenter.start();
      releaseUpdates.start();
    },
    flush: () => backend.session.flushEvents(),
    waitUntilStopped: () => presenter.waitUntilStopped(),
    dispose: async () => {
      releaseUpdates.stop();
      try {
        await terminalHost.dispose();
        // Invariant: cleared only once the terminal is restored; a failed dispose leaves it armed.
        (await exitNotice)?.clear();
        await releaseNote.settleAcknowledgement();
      } finally {
        // Invariant: the shared spares outlive every shell and stop only after the last one is disposed.
        clipboardServices?.dispose();
        removeControllerBoundaryInput();
        unsubscribeAccent();
        await sessionRuntimes.dispose();
        await releaseNote.releaseClaim();
        suggestionDiagnostics?.dispose(); clipboardDiagnostics?.dispose();
        unsubscribeTabBridge();
        tabBridge?.close();
        // Invariant: the host outlives the application; disposing it cancels host-level probes last.
        await host.dispose();
      }
    },
  };
  return { application, settings };
}

function createPromptHistoryConfiguration(settings: OwnedSettingsManager | null, backend: ComposedSessionBackend, ownedSurfaces: boolean) {
  const limit = settings?.value("promptHistoryMaxItems") ?? 100;
  const scope = settings?.value("promptHistoryScope") ?? "unique";
  const enabled = settings !== null && ownedSurfaces && settings.value("promptHistoryEnabled");
  const sessionId = enabled ? backend.identity.currentHistorySessionId() : null;
  if (settings === null || !enabled || (scope === "unique" && sessionId === null)) return null;
  const dataDir = resolvePromptHistoryDataDir();
  const forScope = (selected: "unique" | "shared", id: string | null) => {
    if (selected === "unique" && id === null) return null;
    const location = resolvePromptHistoryPath(dataDir, backend.identity.agentDir, process.platform, selected, id ?? "");
    return {
      store: new PromptHistoryService({ dataDir, profileRoot: backend.identity.agentDir, limit, scope: selected, sessionId: id ?? "" }),
      imageSidecar: new PromptImageSidecar(location.imagesDir),
    };
  };
  return {
    limit, scope,
    ...(sessionId === null ? {} : { sessionId }),
    forScope,
    onScopeChange: (listener: (scope: "unique" | "shared") => void) => settings.onChange(() => listener(settings.value("promptHistoryScope"))),
    ...forScope(scope, sessionId)!,
  };
}

interface StartupReleaseUpdateObservationOptions {
  readonly backend: ComposedSessionBackend;
  readonly configDir: string;
  readonly mode: StartupUpdateMode;
  readonly packageVersion: string | null;
  readonly notificationVersion: string | undefined;
  readonly checkForNewerRelease: ((options: StartupReleaseCheckOptions) => Promise<AvailableRelease | null>) | undefined;
}

function createStartupReleaseUpdateObservation(input: StartupReleaseUpdateObservationOptions): {
  start(): void;
  stop(): void;
} {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let announcedVersion: string | null = null;
  let eligible = input.mode === "auto";
  let cadence: number | null = null;
  let nextDelay: number | null = null;
  let started = false;
  const observe = async (): Promise<void> => {
    // Performance: registry code and its locks stay outside the first-frame startup graph.
    const releases = await import("../foundation/release/latest-release.js");
    cadence = releases.UPDATE_CHECK_INTERVAL_MS;
    nextDelay = cadence;
    const check = input.checkForNewerRelease ?? releases.checkForNewerRelease;
    const runningVersion = input.packageVersion ?? await readPackageVersion();
    const discoveryVersion = input.mode === "notify" ? input.notificationVersion ?? runningVersion : runningVersion;
    const options: StartupReleaseCheckOptions = {
      runningVersion: discoveryVersion,
      configDir: input.configDir,
      interactive: process.stdout.isTTY === true,
      settingMode: input.mode,
      signal: controller.signal,
      onNextCheckDelay: milliseconds => { nextDelay = milliseconds; },
    };
    // Invariant: opt-outs never arm a recurring timer, nor read the cache or probe the registry.
    if (input.checkForNewerRelease === undefined && releases.startupReleaseCheckSkipReason(options) !== null) {
      eligible = false;
      return;
    }
    const release = await check(options);
    if (release === null || controller.signal.aborted) return;
    if (input.mode === "notify") {
      input.backend.extensions.announceReleaseUpdate(release);
      return;
    }
    if (input.mode === "auto") {
      const installed = await import("../foundation/release/automatic-update.js")
        .then(module => module.requestAutomaticUpdate({ release, runningVersion, signal: controller.signal }));
      if (installed !== null && installed !== announcedVersion && !controller.signal.aborted) {
        announcedVersion = installed;
        input.backend.extensions.announceReleaseUpdate({ status: "installed", version: installed });
      }
    }
  };
  const run = async (): Promise<void> => {
    try { await observe(); } catch { /* Rationale: best effort; retry on the next interval. */ }
    if (eligible && cadence !== null && !controller.signal.aborted) {
      timer = setTimeout(() => { void run(); }, nextDelay ?? cadence);
      timer.unref?.();
    }
  };
  return {
    start() { if (started || controller.signal.aborted) return; started = true; void run(); },
    stop() { controller.abort(); if (timer !== undefined) clearTimeout(timer); },
  };
}

export { watchSharedSettings } from "./owned-settings.js";

function settingsRouteOptions(
  tabBridge: TabBridgeClient | null,
  keybindings: ReturnType<typeof residentTabKeybindings>,
  agentDir: string,
  cwd: string,
): OwnedRouteHostOptions {
  return {
    ...residentRouteHostOptions(tabBridge),
    keybindings,
    agentDir,
    cwd,
    copyText: text => {
      if (Buffer.byteLength(text) > MAX_CLIPBOARD_TEXT_BYTES) return false;
      void writeSystemClipboardText(text).catch(() => {});
      return true;
    },
  };
}

function quitOutroSettingsSnapshot(settings: OwnedSettingsManager): OwnedUiQuitOutroSettings {
  return {
    enabled: settings.value("quitAnimation"),
  };
}

function viewportSettingsSnapshot(settings: OwnedSettingsManager): OwnedUiViewportSettings {
  return {
    timeFormat: settings.value("timeFormat"),
    scrollbarAppearance: settings.value("scrollbarAppearance"),
    scrollbarStyle: settings.value("scrollbarStyle"),
    scrollbarSpeed: settings.value("scrollbarSpeed"),
  };
}
