import type {
  OwnedUiBackgroundSettingsPort,
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
