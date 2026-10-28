import { homedir } from "node:os";
import { resolve } from "node:path";
import { MAX_CLIPBOARD_TEXT_BYTES, type OwnedUiBackgroundSettingsPort } from "../contracts/owned-ui/index.js";
import type { OwnedUiApplicationPort, PresentationTerminalPort } from "../contracts/presentation/index.js";
import { writeSystemClipboardText } from "../app/session-shell/system-clipboard.js";
import {
  OwnedUiTerminalHost,
  type OwnedUiHostedPresenter,
  type OwnedUiPresenterRelease,
  type OwnedUiPresenterTerminal,
} from "../app/session-shell/shell-host.js";
import type { PinnedLayoutPart } from "../app/session-shell/session-shell-root.js";
import type { TabBridgeClient, TabBridgeCommand } from "../foundation/resident-tabs/bridge-client.js";
import type { ResidentTabRoute } from "../foundation/resident-tabs/routes.js";
import type { ReleaseNoteCatalog } from "../features/owned-ui/release-notes.js";
import { nativeHyperlinkStyle } from "../ui/components/spans.js";
import type { UiRouteHost, UiRouteSurface } from "../ui/apps/contracts.js";
import { createPiKeybindingsHost } from "../integrations/pi/components/shell-shared-facade.js";
import { applyConfiguredPiTheme, setPiAccentColor, setPiPackageBorderProjectionEnabled } from "../integrations/pi/components/upstream/theme/theme.js";
import { createPiTerminalBridge } from "../integrations/pi/tui-runtime/presentation-adapter.js";
import type { PiTuiComponentPort, PiTuiInputListenerResult, PiTuiPointerSurface } from "../integrations/pi/tui-runtime/contracts.js";
import type { PiTuiInputSurfaceKind } from "../integrations/pi/tui-runtime/input-presentation-coordinator.js";
import { resolveLaunchProfilePaths } from "../features/launch/profile-paths.js";
import { createOwnedSettingsManager, watchSharedSettings } from "./owned-settings.js";
import { residentRouteHostOptions, residentTabKeybindings } from "./resident-tab-bridge.js";
import { createOwnedRouteHost } from "./settings-route-host.js";
import type { OwnedSettingsManager } from "../ui/settings/manager.js";
import type { OfflinePiSettingsPort } from "../integrations/pi/engine/offline-settings-port.js";
import { runOwnedUi, terminateOwnedUiProcess } from "../features/owned-ui/run.js";

export { terminateOwnedUiProcess };

export interface UtilityTabOptions {
  readonly route: ResidentTabRoute;
  readonly bridge: TabBridgeClient;
  readonly cwd?: string;
  readonly profileId?: string;
  readonly terminal?: PresentationTerminalPort;
  readonly agentDir?: string;
  readonly settings?: OwnedSettingsManager;
  readonly routeHost?: UiRouteHost;
  readonly releaseNotes?: ReleaseNoteCatalog;
  readonly onApplication?: (application: OwnedUiApplicationPort) => void;
}

export interface UtilityTabComposition {
  readonly application: OwnedUiApplicationPort;
  readonly settings: OwnedSettingsManager;
}

/** Runs one pinned Settings or Changelog screen without constructing an Agent engine or session. */
export async function runUtilityTab(options: UtilityTabOptions): Promise<number> {
  const composition = await composeUtilityTab(options);
  options.onApplication?.(composition.application);
  return await runOwnedUi(composition);
}

export async function composeUtilityTab(options: UtilityTabOptions): Promise<UtilityTabComposition> {
  const cwd = options.cwd ?? process.cwd();
  const agentDir = options.agentDir ?? utilityAgentDir();
  const { settings, offline } = await prepareUtilitySettings(options, cwd, agentDir);
  await options.bridge.start().catch(() => false);
  options.bridge.status("starting");
  applyUtilityTheme(settings, options.bridge);
  const keybindings = residentTabKeybindings(
    options.bridge,
    agentDir,
    createPiKeybindingsHost({ profile: "a1", agentDir }),
  );
  const routeHost = options.routeHost ?? createUtilityRouteHost(options, settings, keybindings, cwd, agentDir);
  return {
    settings,
    application: createUtilityApplication(options, settings, offline, routeHost),
  };
}

async function prepareUtilitySettings(
  options: UtilityTabOptions,
  cwd: string,
  agentDir: string,
): Promise<{ readonly settings: OwnedSettingsManager; readonly offline: OfflinePiSettingsPort | null }> {
  const offline = options.settings === undefined && options.route === "settings"
    ? await import("../integrations/pi/engine/offline-settings-port.js")
      .then(module => module.createOfflinePiSettingsPort({ cwd, agentDir }))
    : null;
  return {
    offline,
    settings: options.settings ?? createOwnedSettingsManager({
      profileId: options.profileId ?? "a1",
      agent: offline?.port ?? null,
    }),
  };
}

function applyUtilityTheme(settings: OwnedSettingsManager, bridge: TabBridgeClient): void {
  setPiPackageBorderProjectionEnabled(true);
  setPiAccentColor(settings.value("accentColor"));
  applyConfiguredPiTheme("dark");
  bridge.accent(settings.value("accentColor"));
}

function createUtilityRouteHost(
  options: UtilityTabOptions,
  settings: OwnedSettingsManager,
  keybindings: ReturnType<typeof residentTabKeybindings>,
  cwd: string,
  agentDir: string,
): UiRouteHost {
  let catalog: Promise<ReleaseNoteCatalog> | undefined;
  const releaseNoteCatalog = () => catalog ??= options.releaseNotes === undefined
    ? import("../features/owned-ui/release-notes.js").then(module => module.readPackagedReleaseNotes())
    : Promise.resolve(options.releaseNotes);
  return pinnedRouteHost(options.route, createOwnedRouteHost(settings, {
    changelog: async () => {
      const [notes, { renderPiShellChangelogLines }] = await Promise.all([
        releaseNoteCatalog(),
        import("../integrations/pi/components/shell-presenters-info.js"),
      ]);
      return { rows: width => renderPiShellChangelogLines(notes.completeMarkdown, width).map(row => nativeHyperlinkStyle(row)) };
    },
    hotkeys: async () => { throw new Error("hotkeys are unavailable in a utility tab"); },
    session: async () => { throw new Error("session information is unavailable in a utility tab"); },
  }, {
    ...residentRouteHostOptions(options.bridge),
    keybindings,
    agentDir,
    cwd,
    copyText: text => {
      if (Buffer.byteLength(text) > MAX_CLIPBOARD_TEXT_BYTES) return false;
      void writeSystemClipboardText(text).catch(() => {});
      return true;
    },
  }));
}

function createUtilityApplication(
  options: UtilityTabOptions,
  settings: OwnedSettingsManager,
  offline: OfflinePiSettingsPort | null,
  routeHost: UiRouteHost,
): OwnedUiApplicationPort {
  const backgroundSettings: OwnedUiBackgroundSettingsPort = {
    snapshot: () => settings.value("backgroundStyle"),
    onChange: listener => settings.onChange(current => listener(current.value("backgroundStyle"))),
  };
  const terminalHost = new OwnedUiTerminalHost({
    layout: "custom-viewport", mode: "fullscreen", hardwareCursor: false,
    ...(options.terminal === undefined ? {} : { terminal: createPiTerminalBridge(options.terminal) }),
    backgroundSettings,
  });
  const presenter = new UtilityTabPresenter(terminalHost, routeHost, options.route, options.bridge);
  const removeBoundaryInput = terminalHost.runtime.addPreInputListener(data => ({ data: options.bridge.consumeControllerBoundaryInput(data) }));
  const unwatchSettings = watchSharedSettings(settings);
  const unsubscribeAccent = settings.onChange(current => {
    const accent = current.value("accentColor");
    setPiAccentColor(accent);
    options.bridge.accent(accent);
  });
  let disposed = false;
  let started = false;
  let stopResolve!: () => void;
  let unsubscribeBridge = () => {};
  const stopped = new Promise<void>(resolvePromise => { stopResolve = resolvePromise; });
  return {
    get disposed() { return disposed; },
    start: () => {
      if (started || disposed) return;
      started = true;
      presenter.start();
      terminalHost.attach(presenter);
      unsubscribeBridge = options.bridge.onCommand(command => handleBridgeCommand(command, presenter, options.route, () => {
        stopResolve();
        void terminalHost.dispose().catch(() => undefined);
      }));
      options.bridge.status("idle");
      void offline?.modelsReady.then(() => settings.load()).catch(() => undefined);
    },
    flush: async () => {},
    waitUntilStopped: () => stopped,
    dispose: async () => {
      if (disposed) return;
      disposed = true;
      stopResolve(); unsubscribeBridge(); unsubscribeAccent(); unwatchSettings(); removeBoundaryInput();
      try { await terminalHost.dispose(); } finally { options.bridge.close(); }
    },
  };
}

function pinnedRouteHost(route: ResidentTabRoute, host: UiRouteHost): UiRouteHost {
  return {
    claims: candidate => candidate === route && host.claims(candidate),
    open: (candidate, input) => candidate === route ? host.open(candidate, input) : null,
  };
}

function handleBridgeCommand(
  command: TabBridgeCommand,
  presenter: UtilityTabPresenter,
  route: ResidentTabRoute,
  stop: () => void,
): void {
  if (command.type === "stop") stop();
  else if (command.type === "route" && command.route === route) presenter.presentRoute();
}

export function utilityAgentDir(environment: NodeJS.ProcessEnv = process.env): string {
  const configured = environment.PI_CODING_AGENT_DIR;
  if (configured !== undefined && configured.trim().length > 0) {
    return resolve(configured.startsWith("~/") || configured.startsWith("~\\")
      ? `${homedir()}${configured.slice(1)}`
      : configured);
  }
  return resolveLaunchProfilePaths().agentProfile;
}

class UtilityTabPresenter implements OwnedUiHostedPresenter {
  readonly #host: OwnedUiTerminalHost;
  readonly #terminal: OwnedUiPresenterTerminal;
  readonly #routeHost: UiRouteHost;
  readonly #route: ResidentTabRoute;
  readonly #bridge: TabBridgeClient;
  #surface: UiRouteSurface | null = null;
  #routeHandle: { hide(): void } | null = null;
  #released = false;

  constructor(host: OwnedUiTerminalHost, routeHost: UiRouteHost, route: ResidentTabRoute, bridge: TabBridgeClient) {
    this.#host = host;
    this.#routeHost = routeHost;
    this.#route = route;
    this.#bridge = bridge;
    this.#terminal = host.connect(this);
  }

  render(_width: number): readonly string[] { return []; }
  handleInput(_data: string): void {}
  invalidate(): void { this.#terminal.requestRender(); }
  setFocused(_focused: boolean): void {}
  inputCoordinationSurface(): PiTuiInputSurfaceKind { return "owned"; }
  setOverlaySurfaces(_surfaces: readonly PiTuiPointerSurface[] | null): void {}
  noteImmediatePresentation(): void {}
  handleViewportInput(_data: string): PiTuiInputListenerResult | undefined { return undefined; }
  layoutPart(_part: PinnedLayoutPart): PiTuiComponentPort { return EMPTY_COMPONENT; }
  activated(): void { this.presentRoute(); }
  start(): void { this.#terminal.start(); }
  waitUntilStopped(): Promise<void> { return new Promise(() => {}); }
  dispose(): Promise<void> { return this.#host.close(this); }

  presentRoute(): void {
    if (this.#released || this.#routeHandle !== null) return;
    if (!this.#terminal.running || !this.#terminal.attached) return;
    const surface = this.#routeHost.open(this.#route);
    if (surface === null) throw new Error(`utility route is unavailable: ${this.#route}`);
    this.#surface = surface;
    let exitRequested = false;
    const handle = this.#terminal.openRoute(surface, {
      closed: rendered => {
        if (this.#routeHandle === handle) this.#routeHandle = null;
        this.#surface = null;
        queueMicrotask(() => {
          if (rendered && !exitRequested) void this.#bridge.requestClose();
        });
      },
      exit: () => {
        exitRequested = true;
        void this.#bridge.requestDetach().then(
          () => this.presentRoute(),
          () => this.presentRoute(),
        );
      },
    });
    this.#routeHandle = handle;
  }

  release(): OwnedUiPresenterRelease {
    if (this.#released) return { exitText: "", failures: [], settle: async () => [] };
    this.#released = true;
    const failures: unknown[] = [];
    try { this.#routeHandle?.hide(); } catch (error) { failures.push(error); }
    try { this.#surface?.close(); } catch (error) { failures.push(error); }
    this.#routeHandle = null;
    this.#surface = null;
    return { exitText: "", failures, settle: async () => [] };
  }
}

const EMPTY_COMPONENT: PiTuiComponentPort = {
  render: () => [],
  handleInput: () => {},
  invalidate: () => {},
};
