import type { PaneRect } from "./frame.js";
import type { RenderCacheContract } from "./revision.js";

export interface PaneMouseEvent {
  readonly kind: "press" | "release" | "motion" | "wheel-up" | "wheel-down";
  /** 0 left, 1 middle, 2 right. Meaningless for wheel events. */
  readonly button: number;
  /** One-based column within the pane. */
  readonly column: number;
  /** One-based row within the pane. */
  readonly row: number;
}

export interface PaneInputResult {
  /** True when the pane handled the event; an unconsumed event continues to the host. */
  readonly consumed: boolean;
  /** True when the pane's appearance changed and the host should repaint. */
  readonly render?: boolean;
}

export interface Pane {
  /** Renders exactly `rect.height` rows, each at most `rect.width` columns. */
  render(rect: PaneRect, focused: boolean): readonly string[];
  onInput?(data: string): PaneInputResult;
  /** Mouse events arrive in coordinates local to this pane's own origin. */
  onMouse?(event: PaneMouseEvent): PaneInputResult;
  /** Drops cached layout after its data changed underneath it. */
  invalidate?(): void;
  readonly renderCache?: RenderCacheContract;
}

/** Translates a host-level mouse event into one pane's local coordinates. */
export function toPaneLocalMouse(
  event: PaneMouseEvent,
  origin: { readonly column: number; readonly row: number },
): PaneMouseEvent {
  return { ...event, column: event.column - origin.column + 1, row: event.row - origin.row + 1 };
}

export function isInsidePane(event: PaneMouseEvent, rect: PaneRect): boolean {
  return event.column >= 1 && event.column <= rect.width && event.row >= 1 && event.row <= rect.height;
}
