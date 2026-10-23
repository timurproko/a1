import type { OwnedUiCommandResult, OwnedUiDialog } from "../../contracts/owned-ui/index.js";
import type { UiRouteHost, UiRouteInput } from "../../ui/apps/contracts.js";
import { createPiShellDialog, createPiShellSelector } from "../../integrations/pi/components/shell-selectors-dialogs.js";
import type { PiShellSelectorOption } from "../../integrations/pi/components/shell-shared-facade.js";
import type { PiTuiOverlayHandle } from "../../integrations/pi/tui-runtime/contracts.js";
import type { OwnedUiPresenterTerminal } from "./shell-host.js";
import type { OwnedUiSessionShellOptions, OwnedUiSessionShellRoot } from "./session-shell-root.js";

type StartupRoute = NonNullable<OwnedUiSessionShellOptions["engine"]["startupRoute"]>;

const OVERLAY_OPTIONS = { width: "70%", maxHeight: "80%", anchor: "center", inputCoordination: "owned" } as const;
const STARTUP_ROUTE_RETRY_MS = 25;

export interface SessionDialogPorts {
  readonly terminal: Pick<OwnedUiPresenterTerminal, "running" | "hasOverlay" | "showOverlay" | "openRoute" | "requestRender">;
  readonly root: Pick<OwnedUiSessionShellRoot, "dismissNotice" | "setInputSurface" | "usesDefaultInputSurface">;
  readonly routeHost: UiRouteHost | null;
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
  #handle: { hide(): void } | undefined;
  #id: string | undefined;
  #source: "route" | "local" | "backend" | undefined;
  #startupRoute: StartupRoute | undefined;
  #startupRouteTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(ports: SessionDialogPorts) {
    this.#ports = ports;
    this.#startupRoute = ports.startupRoute;
  }

  /** Clears the replacement input surface a selector put in the dock; the shared close action of every dock selector. */
  readonly closeInputSurface = (): void => {
    this.#ports.root.setInputSurface(null);
    this.#ports.terminal.requestRender();
  };

  showSelector(
    title: string,
    options: readonly PiShellSelectorOption[],
    onSelect: (id: string) => void,
    onCancel?: () => void,
  ): PiTuiOverlayHandle {
    this.#handle?.hide();
    this.#source = "local";
    this.#id = undefined;
    const component = createPiShellSelector({
      title,
      options,
      onSelect: id => {
        onSelect(id);
        this.#close();
      },
      onCancel: () => {
        this.#close();
        onCancel?.();
      },
    });
    const handle = this.#ports.terminal.showOverlay(component, OVERLAY_OPTIONS);
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
    const component = createPiShellDialog(dialog, { onSelect: () => this.#close(), onCancel: () => this.#close() });
    this.#handle = this.#ports.terminal.showOverlay(component, OVERLAY_OPTIONS);
    this.#id = dialog.id;
  }

  openRoute(route: string, input?: UiRouteInput, onClosed?: () => void | Promise<void>): OwnedUiCommandResult {
    const surface = this.#ports.routeHost?.open(route, input) ?? null;
    if (surface === null) return { outcome: "failed", diagnostic: `route is unavailable: ${route}` };
    if (!this.#ports.terminal.running) return { outcome: "failed", diagnostic: "runtime is not active" };

    this.#ports.root.dismissNotice();
    this.#handle?.hide();
    this.#source = "route";
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

  /** Whether a retained startup route, an overlay, or a replacement input surface holds the screen. */
  holdsScreen(): boolean {
    return this.#startupRoute !== undefined
      || this.#ports.terminal.hasOverlay()
      || !this.#ports.root.usesDefaultInputSurface();
  }

  /** A replaced session takes its dialog with it; a retained startup route still opens. */
  onSessionReplaced(): void {
    this.#close();
  }

  dispose(): void {
    if (this.#startupRouteTimer !== undefined) clearTimeout(this.#startupRouteTimer);
    this.#startupRouteTimer = undefined;
    this.#handle?.hide();
  }

  #close(): void {
    this.#handle?.hide();
    this.#clear();
  }

  #clear(): void {
    this.#handle = undefined;
    this.#id = undefined;
    this.#source = undefined;
  }
}
