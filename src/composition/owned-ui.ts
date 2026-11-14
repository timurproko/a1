import { randomUUID } from "node:crypto";
import { PRODUCT_IDENTITY } from "../product-identity.js";
import { PromptHistoryService } from "../features/prompt-history/service.js";
import { PromptImageSidecar } from "../features/prompt-history/image-sidecar.js";
import { resolvePromptHistoryPath } from "../features/prompt-history/paths.js";
import { resolvePromptHistoryDataDir } from "../features/launch/profile-paths.js";
import { resolveProductPaths } from "../foundation/lifecycle/paths.js";
import type { AvailableRelease, StartupReleaseCheckOptions } from "../foundation/release/latest-release.js";
import { MAX_CLIPBOARD_TEXT_BYTES, type UiAccentColor } from "../contracts/owned-ui/index.js";
import type { ProcessIdentity } from "../foundation/lifecycle/model.js";
import type { SessionSelection } from "../foundation/lifecycle/session-selection.js";
import { applyConfiguredPiTheme, getAvailablePiThemes, setPiAccentColor, setPiPackageBorderProjectionEnabled } from "../integrations/pi/components/upstream/theme/theme.js";
import { createPiEngineHost, type PiEngineHostOptions } from "../integrations/pi/engine/host.js";
import { createPiSessionPresenters } from "../integrations/pi/session-presenters/index.js";
import type { PiProjectTrustPreflightPrompt } from "../integrations/pi/engine/project-trust-preflight.js";
import type { PiSessionForkPrompt } from "../integrations/pi/engine/session-selection.js";
import { ClipboardDiagnosticCapture } from "../app/session-shell/clipboard-diagnostics.js";
import { createOwnedUiClipboardServices } from "../app/session-shell/clipboard-services.js";
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
import type { HerdrBindingReservation } from "../features/owned-ui/herdr-binding.js";
import type { ComposedEngineHost, ComposedSessionBackend } from "./session-backend.js";
import { bindAutomaticSessionNaming } from "./session-naming.js";
import { deferStartupReleaseUpdateObservation, readPackageVersion, StartupReleaseNote } from "./startup-route.js";
import { createOwnedSettingsManager, watchSharedSettings } from "./owned-settings.js";

export type { ComposedEngineHost, ComposedSessionBackend } from "./session-backend.js";

export interface OwnedUiCompositionOptions {
  readonly cwd?: string;
  readonly terminal?: PresentationTerminalPort;
  /** Test seam standing in for the Pi engine host; receives the options composition resolved. */
  readonly createEngineHost?: (options: PiEngineHostOptions) => Promise<ComposedEngineHost>;
  /** Explicit file selection retained for SDK callers. Public CLI uses sessionSelection. */
  readonly sessionPath?: string;
  readonly sessionSelection?: SessionSelection;
  readonly sessionColor?: UiAccentColor;
  readonly promptArguments?: readonly string[];
  readonly runtimeOptions?: import("../foundation/launch-context/index.js").RuntimeLaunchOptions;
  /** Early bare-launch reservation; never supplied to comparison/noninteractive compositions. */
  readonly herdrBinding?: HerdrBindingReservation;
  readonly sessionForkPrompt?: PiSessionForkPrompt;
  /** A1 settings profile; comparison paths omit it. */
  readonly profileId?: string;
  /** `off` withholds A1-specific surfaces from comparison profiles. */
  readonly productMode?: "bare" | "comparison";
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
  readonly inspectProcess?: (pid: number) => Promise<ProcessIdentity | null>;
}

export interface OwnedUiComposition {
  readonly application: OwnedUiApplicationPort;
  /** Present when a profile was supplied, so the caller can resolve settings before start. */
  readonly settings: OwnedSettingsManager | null;
}

/** Production default: without an inspector the registry never registers; loaded lazily. */
const inspectLiveProcessOnDemand = async (pid: number) =>
  (await import("../foundation/lifecycle/process-liveness.js")).inspectLiveProcess(pid);

/** Load coordination only when composing a session, not while evaluating the startup facade. */
async function createSessionRuntimes(bare: boolean, inspectProcess: (pid: number) => Promise<ProcessIdentity | null>) {
  const { SessionRuntimeRegistry } = await import("./session-runtime-registry.js");
  return new SessionRuntimeRegistry({ runtimeId: bare ? process.env[PRODUCT_IDENTITY.environment.sessionRuntimeId] : undefined, inspectProcess });
}

export async function composeOwnedUiApplication(options: OwnedUiCompositionOptions = {}): Promise<OwnedUiApplicationPort> {
  return (await composeOwnedUi(options)).application;
}

export async function composeOwnedUi(options: OwnedUiCompositionOptions = {}): Promise<OwnedUiComposition> {
  const cwd = options.cwd ?? process.cwd();
  const productMode = options.productMode ?? "bare", bare = productMode === "bare";
  const sessionRuntimes = await createSessionRuntimes(bare, options.inspectProcess ?? inspectLiveProcessOnDemand);
  const productPaths = resolveProductPaths();
  // Rationale: the manager reads the engine's settings port lazily, after the session exists.
  let backend: ComposedSessionBackend;
  const settings = await compositionSettings(options, () => backend.settingsPort());
  // Invariant: bare A1 owns the settings-driven ports; the comparison profile receives none of them.
  const bareSettings = bare ? settings : null;
  // Invariant: process-wide engine state has one owner. The host installs the HTTP dispatcher, applies
  // the theme singletons, and announces startup notices once; every session is created through it.
  const host = await (options.createEngineHost ?? createPiEngineHost)(engineHostOptions(options, productMode, bareSettings, productPaths.runtimeDir));
  try {
    backend = await host.create({
      cwd,
      ...(bare ? { repositoryContextReader: sessionRuntimes.readerFor(undefined) } : {}),
      ...(bare && process.env[PRODUCT_IDENTITY.environment.sessionRuntimeId] !== undefined
        ? { worktreeCwdReader: sessionRuntimes.toolReaderFor(undefined) } : {}),
      ...(options.sessionPath === undefined ? {} : { sessionPath: options.sessionPath }),
      ...(options.sessionSelection === undefined ? {} : { sessionSelection: options.sessionSelection }),
      ...(options.runtimeOptions === undefined ? {} : { runtimeOptions: options.runtimeOptions }),
      ...(options.sessionForkPrompt === undefined ? {} : { sessionForkPrompt: options.sessionForkPrompt }),
    });
  } catch (error) {
    await host.dispose();
    throw error;
  }
  const naming = bindAutomaticSessionNaming(backend, bareSettings, bare);
  const releaseNote = await StartupReleaseNote.load({
    productMode,
    configDir: productPaths.configDir,
    ...(options.releaseNotes === undefined ? {} : { releaseNotes: options.releaseNotes }),
    ...(options.packageVersion === undefined ? {} : { packageVersion: options.packageVersion }),
    ...(options.profileId === undefined ? {} : { profileId: options.profileId }),
  });
  const sessionColor = bindSessionColor(backend, bareSettings, color => host.setAccentColor(color), productPaths.runtimeDir, options.herdrBinding);
  // Rationale: peer refresh shares persisted preferences, never session-local Current color.
  const unwatchSharedSettings = bareSettings === null
    ? () => {}
    : watchSharedSettings(bareSettings);
  const unsubscribeAccent = async (): Promise<void> => { unwatchSharedSettings(); await sessionColor.dispose(); };

  // Invariant: the Settings search and agent prompt borrow the same resolved Pi keybindings.
  const keybindingsHost = createPiKeybindingsHost({ profile: bare ? "a1" : "pi", agentDir: backend.identity.agentDir });
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
  const routeHost = bareSettings === null ? null
    : createOwnedRouteHost(bareSettings, references, settingsRouteOptions(keybindingsHost, backend.identity.agentDir, cwd));
  const diagnosticDestination = options.suggestionDiagnosticsPath ?? process.env[PRODUCT_IDENTITY.environment.suggestionDiagnostics];
  const suggestionDiagnostics = bareSettings !== null && diagnosticDestination?.trim()
    ? await import("../features/prompt-suggestions/diagnostics.js").then(module => new module.SuggestionDiagnosticCapture({ enabled: true, destination: diagnosticDestination })) : null;
  const barePorts = bareSettings === null ? null : bareShellPorts(bareSettings, backend, suggestionDiagnostics);
  const promptHistory = await createPromptHistoryConfiguration(settings, backend, bare);
  const clipboardDestination = options.clipboardDiagnosticsPath ?? process.env[PRODUCT_IDENTITY.environment.clipboardDiagnostics];
  const clipboardDiagnostics = bareSettings !== null && clipboardDestination?.trim()
    ? new ClipboardDiagnosticCapture(clipboardDestination) : null;
  // Invariant: process-wide services are created once here and borrowed by every session shell.
  const clipboardServices = bare ? createOwnedUiClipboardServices() : null;
  // Invariant: one release order for a failed construction and for dispose. The shared spares outlive every
  // shell and stop only after the last one is disposed; the host outlives the application and is released last.
  const releaseShared = async (): Promise<void> => {
    naming.dispose();
    clipboardServices?.dispose();
    await unsubscribeAccent();
    await sessionRuntimes.dispose();
    await releaseNote.releaseClaim();
    suggestionDiagnostics?.dispose(); clipboardDiagnostics?.dispose();
    await host.dispose();
  };
  let createdTerminalHost: OwnedUiTerminalHost | undefined;
  let terminalHost: OwnedUiTerminalHost;
  let presenter: OwnedUiSessionPresenter;
  try {
    const presenterOptions: OwnedUiSessionShellOptions = {
      presenters: createPiSessionPresenters(backend, spinnerPresenterOptions(bareSettings)),
      engine: {
        backend,
        cwd: backend.identity.cwd,
        ...(routeHost === null ? {} : { routeHost }),
        ...(releaseNote.startupRoute === undefined ? {} : { startupRoute: releaseNote.startupRoute }),
        ...(bare ? { sessionLayout: "custom-viewport" as const } : {}),
      },
      presentation: {
        ...(options.terminal === undefined ? {} : { terminal: createPiTerminalBridge(options.terminal) }),
        ...(clipboardDiagnostics === null ? {} : { input: { onEvent: event => clipboardDiagnostics.runtime(event) } }),
        ...barePorts?.presentation,
      },
      ...(clipboardDiagnostics === null ? {} : { diagnostics: {
        responseCopy: { onEvent: event => clipboardDiagnostics.copy(event) },
        paste: event => clipboardDiagnostics.paste(event),
      } }),
      ...(barePorts === null ? {} : { suggestions: barePorts.suggestions, promptImages: barePorts.promptImages, skills: barePorts.skills }),
      shared: { keybindings: keybindingsHost, ...(clipboardServices === null ? {} : { clipboard: clipboardServices }) },
      ...(promptHistory === null ? {} : { history: promptHistory }),
    };
    // Invariant: one terminal host owns the process terminal; the session presenter reaches it only through
    // the host and paints once attached.
    terminalHost = createdTerminalHost = new OwnedUiTerminalHost(sessionTerminalHostOptions(presenterOptions));
    presenter = new OwnedUiSessionPresenter(terminalHost, presenterOptions);
    terminalHost.attach(presenter);
  } catch (error) {
    await createdTerminalHost?.dispose().catch(() => undefined);
    await releaseShared();
    throw error;
  }
  // Rationale: pinned Pi's version check is unreachable because the owned shell never runs its
  // InteractiveMode, so A1 checks its own channel. The result is never awaited on the startup path;
  // settings are read here because the runner resolves them only just before start.
  const releaseUpdates = deferStartupReleaseUpdateObservation({
    backend,
    configDir: productPaths.configDir,
    mode: bareSettings === null ? "auto" : bareSettings.value("updateCheck"),
    packageVersion: releaseNote.packageVersion, readPackageVersion,
    checkForNewerRelease: options.checkForNewerRelease,
  });
  const exitNoticePath = process.env[PRODUCT_IDENTITY.environment.exitNoticePath];
  // Security: tools the agent runs must never see, or rewrite, this instance's notice.
  delete process.env[PRODUCT_IDENTITY.environment.exitNoticePath];
  let exitNotice: Promise<{ clear(): void } | null> = Promise.resolve(null);
  const application: OwnedUiApplicationPort = {
    get disposed() { return backend.identity.disposed; },
    start: () => {
      // Performance: the launcher's exit notice loads beside first paint, never on the startup path.
      if (exitNoticePath) exitNotice = import("../app/session-shell/exit-notice.js")
        .then(module => module.armExitNotice(backend, exitNoticePath), () => null);
      presenter.start();
      sessionColor.start();
      releaseUpdates.start();
    },
    flush: startupPromptFlush(backend, bare ? options.promptArguments : undefined, () => terminalHost.runtime.renderNow()),
    waitUntilStopped: () => presenter.waitUntilStopped(),
    dispose: async () => {
      naming.dispose();
      releaseUpdates.stop();
      try {
        await terminalHost.dispose();
        // Invariant: cleared only once the terminal is restored; a failed dispose leaves it armed.
        (await exitNotice)?.clear();
        await releaseNote.settleAcknowledgement();
      } finally {
        await releaseShared();
      }
    },
  };
  return { application, settings };
}

async function compositionSettings(options: OwnedUiCompositionOptions, agentProvider: () => ReturnType<ComposedSessionBackend["settingsPort"]>) {
  if (options.profileId === undefined) return null;
  return await createOwnedSettingsManager({ profileId: options.profileId, agentProvider,
    ...(options.productMode !== "comparison" && options.sessionColor !== undefined ? { sessionColor: options.sessionColor } : {}),
  });
}

function startupPromptFlush(backend: ComposedSessionBackend, arguments_: readonly string[] | undefined, present: () => void) {
  let prompt = arguments_?.join(" ");
  return async () => {
    await backend.session.flushEvents();
    const text = prompt;
    prompt = undefined;
    if (text?.trim() && !backend.identity.disposed) {
      // Invariant: startup extension notices get a frame before prompt submission clears transient presentation.
      present();
      await backend.session.execute({ type: "prompt", correlationId: randomUUID(), sessionId: backend.identity.sessionId, text });
    }
  };
}

function bindSessionColor(backend: ComposedSessionBackend, settings: OwnedSettingsManager | null, apply: (color: UiAccentColor) => void, runtimeDir: string, herdrBinding?: HerdrBindingReservation) {
  if (settings === null) return { start() {}, async dispose() {} };
  let control: Promise<{ dispose(): Promise<void> } | null> = Promise.resolve(null);
  let started = false, stopped = false;
  const unsubscribe = settings.onChange(current => apply(current.value("accentColor")));
  let binding = backend.identity.sessionBindingGeneration;
  const unbind = backend.session.onEvent(() => {
    if (binding === backend.identity.sessionBindingGeneration) return;
    binding = backend.identity.sessionBindingGeneration;
    settings.startSession();
  });
  return {
    start() {
      if (started || stopped) return;
      started = true;
      control = import("./session-colors.js").then(module => stopped ? null
        : module.startSessionColorControl(backend, settings, runtimeDir, process.env[PRODUCT_IDENTITY.environment.sessionRuntimeId], herdrBinding))
        .catch(() => null);
    },
    async dispose() { stopped = true; unbind(); unsubscribe(); await (await control)?.dispose(); },
  };
}

function spinnerPresenterOptions(settings: OwnedSettingsManager | null) {
  return settings === null ? {} : { spinner: {
    snapshot: () => settings.value("spinnerStyle"),
    onChange: (listener: () => void) => settings.onChange(() => listener()),
  } };
}

type ShellOptions = OwnedUiSessionShellOptions;

/** The settings-driven ports only bare A1 receives: viewport, background, quit outro, suggestions, image limit, and skills. */
function bareShellPorts(
  settings: OwnedSettingsManager,
  generator: NonNullable<ShellOptions["suggestions"]>["generator"],
  diagnostics: NonNullable<ShellOptions["suggestions"]>["diagnostics"] | null,
): {
  presentation: Pick<NonNullable<ShellOptions["presentation"]>, "viewportSettings" | "backgroundSettings" | "quitOutro">;
  suggestions: NonNullable<ShellOptions["suggestions"]>;
  promptImages: NonNullable<ShellOptions["promptImages"]>;
  skills: NonNullable<ShellOptions["skills"]>;
} {
  const viewportSettings: OwnedUiViewportSettingsPort = {
    snapshot: () => viewportSettingsSnapshot(settings),
    onChange: listener => settings.onChange(() => listener(viewportSettingsSnapshot(settings))),
  };
  const backgroundSettings: OwnedUiBackgroundSettingsPort = {
    snapshot: () => settings.value("backgroundStyle"),
    // Rationale: one manager notification also recomputes an accent-derived canvas after accentColor changes.
    onChange: listener => settings.onChange(current => listener(current.value("backgroundStyle"))),
  };
  return {
    presentation: {
      viewportSettings,
      backgroundSettings,
      quitOutro: { snapshot: () => quitOutroSettingsSnapshot(settings), interactive: process.stdout.isTTY === true },
    },
    suggestions: {
      ...(diagnostics === null || diagnostics === undefined ? {} : { diagnostics }),
      generator,
      enabled: () => settings.value("promptSuggestions"),
      onChange: (listener: (enabled: boolean) => void) => settings.onChange(() => listener(settings.value("promptSuggestions"))),
    },
    promptImages: {
      limit: () => settings.value("promptImageLimit"),
      onChange: (listener: () => void) => settings.onChange(listener),
    },
    skills: {
      presentation: () => settings.value("skillsPresentation"),
      // Rationale: one listener covers both the A1 presentation choice and the engine skill-command toggle.
      onChange: (listener: () => void) => settings.onChange(() => listener()),
    },
  };
}

function engineHostOptions(options: OwnedUiCompositionOptions, productMode: "bare" | "comparison", settings: OwnedSettingsManager | null, runtimeDir: string): PiEngineHostOptions {
  const bare = productMode === "bare";
  return {
    productMode,
    deliveryIncident: failure => {
      void import("../foundation/terminal-cleanup/index.js").then(module => module.writeFatalDiagnostic(
        `${runtimeDir}/crashes`, "delivery", Object.assign(new Error(), { deliveryFailure: failure }), options.packageVersion,
      )).catch(() => undefined);
    },
    availableThemes: () => getAvailablePiThemes().map(theme => theme.name),
    ...(bare ? { workflowHost: { reserveExport: async (id: string, format: "html" | "jsonl") => (await import("../foundation/lifecycle/user-exports.js")).reserveUserExport(id, format) } } : {}),
    announceStartupChangelog: !bare,
    theme: {
      base: bare ? "dark" : "engine-configured",
      accentColor: settings?.value("accentColor") ?? "purple",
      packageBorderProjection: bare,
      apply: { base: applyConfiguredPiTheme, accentColor: setPiAccentColor, packageBorderProjection: setPiPackageBorderProjectionEnabled },
    },
    ...(options.projectTrustPrompt === undefined ? {} : { projectTrustPrompt: options.projectTrustPrompt }),
  };
}

async function createPromptHistoryConfiguration(settings: OwnedSettingsManager | null, backend: ComposedSessionBackend, bare: boolean) {
  const limit = settings?.value("promptHistoryMaxItems") ?? 100;
  const scope = settings?.value("promptHistoryScope") ?? "unique";
  const enabled = settings !== null && bare && settings.value("promptHistoryEnabled");
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
    editor: await import("../integrations/pi/components/history-editor-loader.js").then(module => module.loadHistoryEditor()),
    ...(sessionId === null ? {} : { sessionId }),
    forScope,
    onScopeChange: (listener: (scope: "unique" | "shared") => void) => settings.onChange(() => listener(settings.value("promptHistoryScope"))),
    ...forScope(scope, sessionId)!,
  };
}

export { watchSharedSettings } from "./owned-settings.js";

function settingsRouteOptions(
  keybindings: NonNullable<OwnedRouteHostOptions["keybindings"]>,
  agentDir: string,
  cwd: string,
): OwnedRouteHostOptions {
  return {
    keybindings,
    agentDir,
    cwd,
    copyText: text => {
      if (Buffer.byteLength(text) > MAX_CLIPBOARD_TEXT_BYTES) return false;
      void import("../app/session-shell/system-clipboard.js").then(({ writeSystemClipboardText }) => writeSystemClipboardText(text)).catch(() => {});
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
    scrollbarAppearance: settings.value("scrollbarAppearance"),
    scrollbarStyle: settings.value("scrollbarStyle"),
    scrollbarSpeed: settings.value("scrollbarSpeed"),
  };
}
