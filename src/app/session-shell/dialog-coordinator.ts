import type { OwnedUiShellComponents, OwnedUiShellSelectorOption } from "../../contracts/owned-ui/index.js";
import type { ShellPresentationPorts, TerminalComponentPort } from "../../contracts/presentation/index.js";
import type { TerminalOverlayHandle } from "../../contracts/presentation/index.js";
import type { OwnedUiCommandResult, OwnedUiDialog } from "../../contracts/owned-ui/index.js";
import type { UiRouteHost, UiRouteInput } from "../../ui/apps/contracts.js";
import type { OwnedUiPresenterTerminal } from "./shell-host.js";
import type { OwnedUiSessionShellOptions, OwnedUiSessionShellRoot } from "./session-shell-root.js";

type StartupRoute = NonNullable<OwnedUiSessionShellOptions["engine"]["startupRoute"]>;

const OVERLAY_OPTIONS = { width: "70%", maxHeight: "80%", anchor: "center", inputCoordination: "owned" } as const;
const STARTUP_ROUTE_RETRY_MS = 25;

interface SessionDialogPorts {
  readonly terminal: Pick<OwnedUiPresenterTerminal, "running" | "hasOverlay" | "showOverlay" | "openRoute" | "requestRender">;
  readonly presentation?: Pick<ShellPresentationPorts, "theme" | "terminalRuntime">;
  readonly viewport?: () => { rows: number };
  readonly root: Pick<OwnedUiSessionShellRoot, "chrome" | "setInputSurface" | "usesDefaultInputSurface">;
  readonly routeHost: UiRouteHost | null;
  readonly dialogs: Pick<OwnedUiShellComponents["dialogs"], "dialog" | "selector">;
  readonly disposed: () => boolean;
  /** A route, or the interrupt chord over it, asked to leave A1. */
  readonly exit: () => void;
  /** A rendered route closed itself. */
  readonly routeClosed?: (route: string) => void;
  readonly startupRoute?: StartupRoute;
}

/**
 * Owns the one modal overlay a session shows at a time, whichever source opened it: an owned route,
 * a local selector, or a backend dialog. Opening one hides the previous one, and every close path
 * clears the same state.
 */
export class SessionDialogCoordinator {
  readonly #ports: SessionDialogPorts;
  #handle: { hide(): void; close?(): void } | undefined;
  #id: string | undefined;
  #source: "route" | "local" | "backend" | undefined;
  #route: string | undefined;
  #apps: TerminalOverlayHandle | undefined;
  #startupRoute: StartupRoute | undefined;
  #startupRouteTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(ports: SessionDialogPorts) {
    this.#ports = ports;
    this.#startupRoute = ports.startupRoute;
  }

  /** Apps may cover a full-screen route, but never steal another dialog's local shortcuts. */
  canOpenApps(): boolean {
    return this.#apps === undefined && (this.#source === "route"
      || !this.#ports.terminal.hasOverlay() && this.#ports.root.usesDefaultInputSurface());
  }

  showApps(): void {
    const presentation = this.#ports.presentation;
    if (presentation === undefined || !this.#ports.terminal.running || !this.canOpenApps()) return;
    let dialog: TerminalComponentPort | undefined;
    let closed = false;
    let loading = "Loading Apps…";
    const pending: string[] = [];
    const cancel = () => { closed = true; pending.length = 0; this.#apps?.hide(); this.#apps = undefined; };
    this.#apps = this.#ports.terminal.showOverlay({
      render: width => dialog?.render(width) ?? [loading.slice(0, width)],
      handleInput: data => {
        if (dialog !== undefined) dialog.handleInput?.(data);
        else if (presentation.terminalRuntime.legacyKeyInput(data) === "\u001b") cancel();
        else if (pending.length < 32) pending.push(data);
      },
      invalidate: () => dialog?.invalidate(),
      dispose: () => { closed = true; pending.length = 0; },
    }, { width: 60, maxHeight: "100%", anchor: "center", inputCoordination: "owned", modal: true });
    // Performance: Apps and its search/list controller are optional workflows, not eager startup dependencies.
    void import("./apps-dialog.js").then(({ AppsDialog }) => {
      if (closed || this.#ports.disposed()) return;
      dialog = new AppsDialog({
        theme: () => presentation.theme.current(),
        height: () => this.#ports.viewport?.().rows ?? 24,
        legacyKey: data => presentation.terminalRuntime.legacyKeyInput(data),
        requestRender: () => this.#ports.terminal.requestRender(),
        cancel,
        select: route => {
          cancel();
          if (route === this.#route) return;
          this.#handle?.close?.();
          if (route === "agent") this.#close();
          else {
            const result = this.openRoute(route);
            if (result.diagnostic !== null) this.#ports.root.chrome.setNotice({ kind: "error", message: result.diagnostic });
          }
        },
      });
      for (const key of pending.splice(0)) { if (!closed) dialog.handleInput?.(key); }
      this.#ports.terminal.requestRender();
    }).catch(() => { if (!closed && !this.#ports.disposed()) { loading = "Apps unavailable — Esc close"; this.#ports.terminal.requestRender(); } });
  }

  /** Presents the owned Models component as a floating modal rather than replacing the prompt. */
  setFloatingInput(component: TerminalComponentPort | null): void {
    this.#close();
    if (component !== null) {
      this.#source = "local";
      this.#handle = this.#ports.terminal.showOverlay(component, { ...OVERLAY_OPTIONS, maxHeight: "100%", modal: true });
    }
  }

  /** Clears the replacement input surface a selector put in the dock; the shared close action of every dock selector. */
  readonly closeInputSurface = (): void => {
    this.#ports.root.setInputSurface(null);
    this.#ports.terminal.requestRender();
  };

  showSelector(
    title: string,
    options: readonly OwnedUiShellSelectorOption[],
    onSelect: (id: string) => void,
    onCancel?: () => void,
  ): TerminalOverlayHandle {
    this.#handle?.hide();
    this.#source = "local";
    this.#id = undefined;
    const component = this.#ports.dialogs.selector({
      title,
      options,
      onSelect: id => {
        this.#close();
        onSelect(id);
      },
      onCancel: () => {
        this.#close();
        onCancel?.();
      },
    });
    const handle = this.#ports.terminal.showOverlay(component, { ...OVERLAY_OPTIONS, modal: true });
    this.#handle = handle;
    return handle;
  }

  /** Mirrors the backend's pending dialog; locally owned routes and selectors are left alone when it has none. */
  syncBackend(dialog: OwnedUiDialog | null): void {
    if (!this.#ports.terminal.running) return;
    if (dialog === null) {
      // Invariant: locally owned routes (notably /settings) are independent of backend
      // lifecycle/status events and remain open while an agent is working.
      if (this.#source === "backend") this.#close();
      return;
    }
    if (this.#source === "backend" && this.#id === dialog.id) return;
    this.#handle?.hide();
    this.#source = "backend";
    const component = this.#ports.dialogs.dialog(dialog, { onSelect: () => this.#close(), onCancel: () => this.#close() });
    this.#handle = this.#ports.terminal.showOverlay(component, { ...OVERLAY_OPTIONS, modal: true });
    this.#id = dialog.id;
  }

  openRoute(route: string, input?: UiRouteInput, onClosed?: () => void | Promise<void>): OwnedUiCommandResult {
    const surface = this.#ports.routeHost?.open(route, input) ?? null;
    if (surface === null) return { outcome: "failed", diagnostic: `route is unavailable: ${route}` };
    if (!this.#ports.terminal.running) return { outcome: "failed", diagnostic: "runtime is not active" };

    this.#ports.root.chrome.dismissNotice();
    this.#handle?.hide();
    this.#source = "route";
    this.#route = route;
    const handle = this.#ports.terminal.openRoute(surface, {
      exit: () => this.#ports.exit(),
      closed: rendered => {
        if (this.#handle === handle) this.#clear();
        if (rendered) {
          try { void onClosed?.()?.catch(() => undefined); } catch { /* Rationale: a failed acknowledgement stays pending. */ }
          this.#ports.routeClosed?.(route);
        }
      },
    });
    this.#handle = handle;
    this.#id = surface.id;
    return { outcome: "completed", diagnostic: null };
  }

  claimsRoute(name: string): boolean {
    return this.#ports.routeHost?.claims(name) ?? false;
  }

  /** Retains a route requested before the runtime runs; the latest request wins. */
  retainStartupRoute(route: string): void {
    this.#startupRoute = { route };
  }

  /** Opens the retained startup route once no overlay or replacement input surface holds the screen. */
  presentStartupRoute(): void {
    const pending = this.#startupRoute;
    if (pending === undefined || this.#ports.disposed() || !this.#ports.terminal.running) return;
    if (this.#ports.terminal.hasOverlay() || !this.#ports.root.usesDefaultInputSurface()) {
      this.#startupRouteTimer = setTimeout(() => {
        this.#startupRouteTimer = undefined;
        this.presentStartupRoute();
      }, STARTUP_ROUTE_RETRY_MS);
      this.#startupRouteTimer.unref?.();
      return;
    }
    this.#startupRoute = undefined;
    this.openRoute(pending.route, pending.input, pending.onClosed);
  }

  /** A replaced session takes its dialog with it; a retained startup route still opens. */
  onSessionReplaced(): void {
    this.#close();
  }

  dispose(): void {
    if (this.#startupRouteTimer !== undefined) clearTimeout(this.#startupRouteTimer);
    this.#startupRouteTimer = undefined;
    this.#apps?.hide();
    this.#apps = undefined;
    this.#handle?.hide();
  }

  #close(): void {
    this.#apps?.hide();
    this.#apps = undefined;
    this.#handle?.hide();
    this.#clear();
  }

  #clear(): void {
    this.#handle = undefined;
    this.#id = undefined;
    this.#source = undefined;
    this.#route = undefined;
  }
}
