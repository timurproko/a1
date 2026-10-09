import { readFile } from "node:fs/promises";
import { SuggestionDiagnosticCapture } from "../features/prompt-suggestions/diagnostics.js";
import { PRODUCT_IDENTITY } from "../product-identity.js";
import { PromptHistoryService } from "../features/prompt-history/service.js";
import { PromptImageSidecar } from "../features/prompt-history/image-sidecar.js";
import { resolvePromptHistoryPath } from "../features/prompt-history/paths.js";
import { resolvePromptHistoryDataDir } from "../features/launch/profile-paths.js";
import { resolveProductPaths } from "../foundation/lifecycle/paths.js";
import type { AvailableRelease, StartupReleaseCheckOptions } from "../foundation/release/latest-release.js";
import type { NativeProcessIdentity } from "../foundation/lifecycle/model.js";
import type { SessionSelection } from "../foundation/lifecycle/session-selection.js";
import { applyConfiguredPiTheme, getAvailablePiThemes, setPiAccentColor, setPiPackageBorderProjectionEnabled } from "../integrations/pi/components/upstream/theme/theme.js";
import { createPiEngineAdapter } from "../integrations/pi/engine/adapter.js";
import type { PiEngineAdapter } from "../integrations/pi/engine/adapter.js";
import type { PiProjectTrustPreflightPrompt } from "../integrations/pi/engine/project-trust-preflight.js";
import type { PiSessionForkPrompt } from "../integrations/pi/engine/session-selection.js";
import { ClipboardDiagnosticCapture } from "../app/session-shell/clipboard-diagnostics.js";
import { OwnedUiSessionShell } from "../app/session-shell/session-shell.js";
import { OwnedSettingsManager } from "../ui/settings/manager.js";
import { createPiTerminalBridge } from "../integrations/pi/tui-runtime/presentation-adapter.js";
import type { OwnedUiApplicationPort, PresentationTerminalPort } from "../contracts/presentation/index.js";
import type {
  OwnedUiBackgroundSettingsPort,
  OwnedUiQuitOutroSettings,
  OwnedUiViewportSettings,
  OwnedUiViewportSettingsPort,
} from "../contracts/owned-ui/index.js";
import { createOwnedRouteHost, type OwnedReferenceProviders } from "./settings-route-host.js";
import { renderPiShellChangelogLines } from "../integrations/pi/components/shell-presenters-info.js";
import type { ReleaseNoteCatalog } from "../features/owned-ui/release-notes.js";
import { nativeHyperlinkStyle } from "../ui/components/spans.js";

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
  /** Deterministic release-note seams for composition tests. */
  readonly packageVersion?: string;
  readonly releaseNotes?: ReleaseNoteCatalog;
  /** Startup release-availability seam; defaults to the throttled registry check. */
  readonly checkForNewerRelease?: (options: StartupReleaseCheckOptions) => Promise<AvailableRelease | null>;
  /** Exact native process inspection injected by the shipped entry; absent SDK seams do not publish claims. */
  readonly inspectProcess?: (pid: number) => Promise<NativeProcessIdentity | null>;
}

export interface OwnedUiComposition {
  readonly application: OwnedUiApplicationPort;
  /** Present when a profile was supplied, so the caller can resolve settings before start. */
  readonly settings: OwnedSettingsManager | null;
}

const SESSION_RUNTIME_REFRESH_MS = 30_000;

export async function composeOwnedUiApplication(options: OwnedUiCompositionOptions = {}): Promise<OwnedUiApplicationPort> {
  return (await composeOwnedUi(options)).application;
}

export async function composeOwnedUi(options: OwnedUiCompositionOptions = {}): Promise<OwnedUiComposition> {
  const cwd = options.cwd ?? process.cwd();
  const ownedSurfaces = options.ownedSurfaces !== "off";
  const sessionRuntimeId = ownedSurfaces ? process.env[PRODUCT_IDENTITY.environment.sessionRuntimeId] : undefined;
  const inspectSessionProcess = options.inspectProcess;
  let sessionRuntimeIdentity: Promise<NativeProcessIdentity | null> | null = null;
  let activeSessionIdentity: { readonly sessionId: string; readonly sessionFile: string } | null = null;
  let sessionRuntimeRefreshTimer: NodeJS.Timeout | null = null;
  let sessionRuntimeRefresh = Promise.resolve();
  let sessionRuntimeDisposed = false;
  const runtimeIdentity = async (): Promise<NativeProcessIdentity | null> => {
    if (sessionRuntimeId === undefined || inspectSessionProcess === undefined) return null;
    sessionRuntimeIdentity ??= inspectSessionProcess(process.pid).catch(() => null);
    return await sessionRuntimeIdentity;
  };
  const queueSessionRuntimeRefresh = (): void => {
    if (sessionRuntimeDisposed || activeSessionIdentity === null || sessionRuntimeId === undefined || inspectSessionProcess === undefined) return;
    sessionRuntimeRefresh = sessionRuntimeRefresh.then(async () => {
      const identity = activeSessionIdentity;
      if (sessionRuntimeDisposed || identity === null) return;
      const owner = await runtimeIdentity();
      if (owner === null) return;
      const { registerSessionRepositoryRuntime } = await import("../foundation/lifecycle/session-repository-context.js");
      await registerSessionRepositoryRuntime(identity, sessionRuntimeId, owner, { inspectProcess: inspectSessionProcess });
    }).catch(() => undefined);
  };
  const armSessionRuntimeRefresh = (): void => {
    if (sessionRuntimeRefreshTimer !== null) return;
    sessionRuntimeRefreshTimer = setInterval(queueSessionRuntimeRefresh, SESSION_RUNTIME_REFRESH_MS);
    sessionRuntimeRefreshTimer.unref();
  };
  const adapter = options.createPiAdapter
    ? await options.createPiAdapter()
    : await createPiEngineAdapter({
      cwd,
      availableThemes: () => getAvailablePiThemes().map(theme => theme.name),
      settingsProductMode: ownedSurfaces ? "bare" : "comparison",
      announceStartupChangelog: !ownedSurfaces,
      ...(ownedSurfaces ? {
        repositoryContextReader: async (sessionId: string, sessionFile: string, signal: AbortSignal) => {
          const owner = await runtimeIdentity();
          if (owner === null || sessionRuntimeId === undefined || inspectSessionProcess === undefined) return null;
          activeSessionIdentity = { sessionId, sessionFile };
          const { activateSessionRepositoryContext } = await import("../foundation/lifecycle/session-repository-context.js");
          const context = await activateSessionRepositoryContext(
            activeSessionIdentity,
            sessionRuntimeId,
            owner,
            { signal, inspectProcess: inspectSessionProcess },
          );
          armSessionRuntimeRefresh();
          return context;
        },
      } : {}),
      ...(options.sessionPath === undefined ? {} : { sessionPath: options.sessionPath }),
      ...(options.sessionSelection === undefined ? {} : { sessionSelection: options.sessionSelection }),
      ...(options.sessionForkPrompt === undefined ? {} : { sessionForkPrompt: options.sessionForkPrompt }),
      ...(options.projectTrustPrompt === undefined ? {} : { projectTrustPrompt: options.projectTrustPrompt }),
    });
  const productPaths = resolveProductPaths();
  const settings = options.profileId === undefined
    ? null
    : new OwnedSettingsManager({
      configDir: resolveProductPaths().configDir,
      profileId: options.profileId,
      agentProvider: () => adapter.settingsPort(),
      hiddenAgentSettingIds: ["fullscreenWheelScrollLines"],
      agentSettingLabelOverrides: { fullscreenCopyOnSelect: "Copy on select" },
    });
  let releaseNotes: ReleaseNoteCatalog | null = null;
  let releaseNotesFailure: unknown;
  if (ownedSurfaces) {
    try {
      releaseNotes = options.releaseNotes
        ?? await import("../features/owned-ui/release-notes.js").then(module => module.readPackagedReleaseNotes());
    } catch (error) { releaseNotesFailure = error; }
  }
  const packageVersion = ownedSurfaces
    ? options.packageVersion ?? await readPackageVersion()
    : null;
  const currentReleaseNote = packageVersion === null ? null : releaseNotes?.current(packageVersion) ?? null;
  const releaseNoteClaim = currentReleaseNote === null || options.profileId === undefined
    ? null
    : await import("../features/owned-ui/release-note-state.js").then(module => module.claimReleaseNote({
      configDir: productPaths.configDir, profileId: options.profileId!, version: currentReleaseNote.version,
    }));
  // Compatibility: bare A1 intentionally ships one base visual target while its UI is being completed:
  // dark, regardless of terminal detection or a previously stored Pi theme. Its owned accent projects
  // over that base; comparison keeps Pi's configured theme and unmodified semantic accent.
  setPiPackageBorderProjectionEnabled(ownedSurfaces);
  setPiAccentColor(settings !== null && ownedSurfaces ? settings.value("accentColor") : "purple");
  applyConfiguredPiTheme(ownedSurfaces ? "dark" : adapter.configuredTheme());
  const unsubscribeAccent = settings === null || !ownedSurfaces
    ? () => {}
    : settings.onChange(current => setPiAccentColor(current.value("accentColor")));

  // Rationale: Routes open only after shell construction.
  const references: OwnedReferenceProviders = {
    changelog: async input => {
      if (input?.document === undefined && releaseNotesFailure !== undefined) throw releaseNotesFailure;
      const markdown = input?.document ?? releaseNotes?.completeMarkdown ?? "No A1 release notes found.";
      return { rows: width => renderPiShellChangelogLines(markdown, width).map(row => nativeHyperlinkStyle(row)) };
    },
    hotkeys: async () => {
      const presentation = shell.hotkeysPresentation();
      const { renderPiShellHotkeySections } = await import("../integrations/pi/components/shell-hotkey-sections.js");
      return { sections: width => renderPiShellHotkeySections(presentation, width) };
    },
    session: () => import("./session-info-reference.js").then(m => m.loadSessionInfoReference(adapter)),
  };
  const routeHost = settings === null || !ownedSurfaces ? null : createOwnedRouteHost(settings, references);
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
    generator: adapter,
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
  const historyLimit = settings?.value("promptHistoryMaxItems");
  const historyProfileLocation = settings === null || !ownedSurfaces || !settings.value("promptHistoryEnabled")
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
  let releaseNoteAcknowledgement: Promise<void> | null = null;
  try {
    shell = new OwnedUiSessionShell({
      engine: {
        backend: adapter,
        cwd: adapter.cwd,
        ...(routeHost === null ? {} : { routeHost }),
        ...(currentReleaseNote === null || releaseNoteClaim === null ? {} : {
          startupRoute: {
            route: "changelog",
            input: { document: currentReleaseNote.markdown },
            onClosed: () => {
              releaseNoteAcknowledgement ??= releaseNoteClaim.acknowledge();
              return releaseNoteAcknowledgement;
            },
          },
        }),
        ...(ownedSurfaces ? { sessionLayout: "custom-viewport" as const } : {}),
      },
      presentation: {
        ...(options.terminal === undefined ? {} : { terminal: createPiTerminalBridge(options.terminal) }),
        ...(clipboardDiagnostics === null ? {} : { input: { onEvent: event => clipboardDiagnostics.runtime(event) } }),
        ...(viewportSettings === null ? {} : { viewportSettings }),
        ...(backgroundSettings === null ? {} : { backgroundSettings }),
        ...(settings === null || !ownedSurfaces ? {} : {
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
      ...(promptHistory === null ? {} : { history: {
        ...promptHistory,
        editor: await import("../integrations/pi/components/history-editor-loader.js").then(module => module.loadHistoryEditor()),
      } }),
    });
  } catch (error) {
    unsubscribeAccent();
    await releaseNoteClaim?.release();
    clipboardDiagnostics?.dispose(); suggestionDiagnostics?.dispose();
    throw error;
  }
  // Rationale: pinned Pi's version check is unreachable because the owned shell never runs its
  // InteractiveMode, so A1 checks its own channel. The result is never awaited on the startup path;
  // settings are read here because the runner resolves them only just before start.
  const announceNewerRelease = async (): Promise<void> => {
    const check: (input: StartupReleaseCheckOptions) => Promise<AvailableRelease | null> = options.checkForNewerRelease
      ?? (await import("../foundation/release/latest-release.js")).checkForNewerRelease;
    const release = await check({
      runningVersion: packageVersion ?? await readPackageVersion(),
      configDir: productPaths.configDir,
      interactive: process.stdout.isTTY === true,
      ...(settings === null || !ownedSurfaces ? {} : { settingEnabled: settings.value("updateCheck") }),
    });
    if (release !== null) adapter.announceReleaseUpdate(release);
  };
  const exitNoticePath = process.env[PRODUCT_IDENTITY.environment.exitNoticePath];
  // Security: tools the agent runs must never see, or rewrite, this instance's notice.
  delete process.env[PRODUCT_IDENTITY.environment.exitNoticePath];
  let exitNotice: Promise<{ clear(): void } | null> = Promise.resolve(null);
  const application: OwnedUiApplicationPort = {
    get disposed() { return adapter.disposed; },
    start: () => {
      // Performance: the guardian notice loads beside first paint, never on the startup path.
      if (exitNoticePath) exitNotice = import("../app/session-shell/exit-notice.js")
        .then(module => module.armExitNotice(adapter, exitNoticePath), () => null);
      shell.start();
      void announceNewerRelease().catch(() => undefined);
    },
    flush: () => adapter.flushEvents(),
    waitUntilStopped: () => shell.waitUntilStopped(),
    dispose: async () => {
      try {
        await shell.dispose();
        // Invariant: cleared only once the terminal is restored; a failed dispose leaves it armed.
        (await exitNotice)?.clear();
        await releaseNoteAcknowledgement?.catch(() => undefined);
      } finally {
        unsubscribeAccent();
        sessionRuntimeDisposed = true;
        if (sessionRuntimeRefreshTimer !== null) clearInterval(sessionRuntimeRefreshTimer);
        sessionRuntimeRefreshTimer = null;
        await sessionRuntimeRefresh;
        const owner = await runtimeIdentity();
        if (sessionRuntimeId !== undefined && owner !== null) {
          await import("../foundation/lifecycle/session-repository-context.js")
            .then(module => module.releaseSessionRepositoryRuntime(sessionRuntimeId, owner))
            .catch(() => undefined);
        }
        await releaseNoteClaim?.release();
        suggestionDiagnostics?.dispose(); clipboardDiagnostics?.dispose();
      }
    },
  };
  return { application, settings };
}

async function readPackageVersion(): Promise<string> {
  const manifest: unknown = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
  const version = (manifest as { version?: unknown })?.version;
  if (typeof version !== "string") throw new Error("A1 package version is unavailable");
  return version;
}

function quitOutroSettingsSnapshot(settings: OwnedSettingsManager): OwnedUiQuitOutroSettings {
  return {
    enabled: settings.value("quitAnimation"),
  };
}

function viewportSettingsSnapshot(settings: OwnedSettingsManager): OwnedUiViewportSettings {
  return {
    scrollbarAppearance: settings.value("scrollbarAppearance"),
    scrollbarStyle: settings.value("scrollbarStyle"),
    scrollbarSpeed: settings.value("scrollbarSpeed"),
  };
}
