import type {
  OwnedUiBackgroundSettingsPort,
  OwnedUiSessionBackend,
  OwnedUiShellHeaderOptions,
  OwnedUiViewportSettingsPort,
  OwnedUiQuitOutroSettingsPort,
} from "../../contracts/owned-ui/index.js";
import type {
  TerminalInputCoordinationScheduler,
  TerminalInputDiagnosticsEvent,
  TerminalPort,
} from "../../contracts/presentation/index.js";
import type { StreamPresentationScheduler } from "./stream-presentation-coalescer.js";
import type { UiRouteHost, UiRouteInput } from "../../ui/apps/index.js";

/** The engine session the shell presents and the composition's decisions about it. */
export interface OwnedUiShellEngineOptions {
  readonly backend: OwnedUiSessionBackend;
  readonly cwd: string;
  /**
   * Declared A1-owned routes. A route this host claims resolves to its app;
   * every other route continues to the pinned workflow table unchanged.
   */
  readonly routeHost?: UiRouteHost;
  /** One product-owned route presented after the first usable frame and any startup modal. */
  readonly startupRoute?: {
    readonly route: string;
    readonly input?: UiRouteInput;
    readonly onClosed?: () => void | Promise<void>;
  };
  /** Bare A1 selects the owned bounded viewport; comparison profiles stay pinned. */
  readonly sessionLayout?: "pinned" | "custom-viewport";
}

/** Terminal, startup, viewport, and presentation-cadence seams; production leaves most at their defaults. */
export interface OwnedUiShellPresentationOptions {
  readonly terminal?: TerminalPort;
  readonly startup?: OwnedUiShellHeaderOptions;
  /** Live profile-local settings, supplied only to the bare-A1 composition. */
  readonly viewportSettings?: OwnedUiViewportSettingsPort;
  /** Live fullscreen canvas choice, supplied only to the bare-A1 composition. */
  readonly backgroundSettings?: OwnedUiBackgroundSettingsPort;
  /** Deterministic scheduling seam for presentation-cadence tests. */
  readonly stream?: {
    readonly intervalMs?: number;
    readonly scheduler?: StreamPresentationScheduler;
  };
  /**
   * Minimum time the reload box stays visible so a fast reload still reads as one.
   * Production uses the default hold; tests inject `now`/`sleep` for determinism.
   */
  readonly reload?: {
    readonly minVisibleMs?: number;
    readonly now?: () => number;
    readonly sleep?: (ms: number) => Promise<void>;
  };
  /**
   * Quit outro settings and seams, supplied only to the bare-A1 composition.
   * `interactive` states whether the terminal can show the animation; production
   * passes stdout's TTY state, tests opt in explicitly.
   */
  readonly quitOutro?: OwnedUiQuitOutroSettingsPort & {
    readonly interactive: boolean;
    readonly now?: () => number;
    readonly sleep?: (ms: number) => Promise<void>;
    readonly seed?: number;
  };
  readonly input?: {
    readonly scheduler?: TerminalInputCoordinationScheduler;
    readonly onEvent?: (event: TerminalInputDiagnosticsEvent) => void;
    readonly now?: () => number;
    /** Evidence-only baseline seam; production leaves coordination enabled. */
    readonly coordination?: boolean;
    /** Evidence-only baseline seam; production leaves dock reuse enabled. */
    readonly viewportReuse?: boolean;
  };
}
