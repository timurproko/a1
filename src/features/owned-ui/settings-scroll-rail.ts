import {
  scrollForTrackPage,
  scrollbarPresentation,
  ScrollbarRails,
  type PaneMouseEvent,
  type RailPosition,
  type ScrollbarGeometry,
  type ScrollbarPresentation,
  type ScrollbarPresentationInput,
} from "../../ui/components/index.js";

/** Identity of the settings list rail in the shared rail state. */
const RAIL_KEY = "settings";
// Compatibility: the transcript rail stays lit this long after a scroll, and repaints just after.
const SCROLL_LINGER_MS = 900;
const SCROLL_LINGER_REPAINT_MS = 925;

/** Where the rail was painted in the last frame, with the list page it scrolls by. */
export interface SettingsRailFrame {
  readonly rail: RailPosition;
  readonly geometry: ScrollbarGeometry;
  readonly page: number;
}

/** How a pointer report landed on the rail: owned keeps it from the list, and `scroll` is the list's new offset. */
export interface SettingsRailPointer {
  readonly owned: boolean;
  readonly changed: boolean;
  readonly overRail: boolean;
  readonly scroll?: number;
}

/** The settings list's scrollbar rail: hover, thumb drag, track paging, and the lingering highlight after a scroll. */
export class SettingsScrollRail {
  readonly #rails = new ScrollbarRails();
  #frame: SettingsRailFrame | null = null;
  #activeUntil = 0;
  #activityTimer: ReturnType<typeof setTimeout> | undefined;
  #renderedScroll: number | undefined;

  /** Notes the frame's scroll; a moved list keeps the rail lit and repaints once the highlight lapses. */
  noteRenderedScroll(scroll: number, now: number, requestRender: () => void): void {
    // Rationale: every way of scrolling ends in this frame, so a moved list is noticed here
    // once rather than at each wheel, drag, key, and search branch.
    if (this.#renderedScroll !== undefined && this.#renderedScroll !== scroll) {
      this.#activeUntil = Math.max(this.#activeUntil, now + SCROLL_LINGER_MS);
      this.#clearTimer();
      this.#activityTimer = setTimeout(() => {
        this.#activityTimer = undefined;
        requestRender();
      }, SCROLL_LINGER_REPAINT_MS);
      this.#activityTimer.unref?.();
    }
    this.#renderedScroll = scroll;
  }

  presentation(input: Omit<ScrollbarPresentationInput, "hovered" | "dragging" | "activeUntil">): ScrollbarPresentation {
    return scrollbarPresentation({
      ...input,
      hovered: this.#rails.isHovered(RAIL_KEY),
      dragging: this.#rails.isDragging(RAIL_KEY),
      activeUntil: this.#activeUntil,
    });
  }

  /** Records where the rail was painted, or null when this frame has no rail. */
  setFrame(frame: Omit<SettingsRailFrame, "rail"> & { readonly rail: Omit<RailPosition, "key"> } | null): void {
    this.#frame = frame === null ? null : { ...frame, rail: { ...frame.rail, key: RAIL_KEY } };
  }

  // Rationale: the rail takes its share of a pointer report first: hover, a thumb drag, or a
  // track page. Owned means the list must not see the report; changed means the rail looks different.
  pointer(event: PaneMouseEvent, scroll: number): SettingsRailPointer {
    const frame = this.#frame;
    const wasHovered = this.#rails.isHovered(RAIL_KEY);
    if (frame === null) {
      this.#rails.clear();
      return { owned: false, changed: wasHovered, overRail: false };
    }
    const pointer = { column: event.column, row: event.row - 1 };
    if (this.#rails.isDragging(RAIL_KEY)) {
      // Invariant: a drag keeps the pointer wherever it goes until the button comes up.
      if (event.kind === "release") {
        this.#rails.endDrag();
        return { owned: true, changed: true, overRail: false };
      }
      const target = this.#rails.dragTo(frame.rail, frame.geometry, pointer);
      return target === null ? { owned: true, changed: true, overRail: false } : { owned: true, changed: true, overRail: false, scroll: target };
    }
    const over = this.#rails.notePointer([frame.rail], pointer) !== null;
    if (!over) return { owned: false, changed: wasHovered, overRail: false };
    if (event.kind === "press" && !this.#rails.beginDrag(frame.rail, frame.geometry, pointer)) {
      return { owned: true, changed: true, overRail: true, scroll: scrollForTrackPage(frame.geometry, pointer.row - frame.rail.rowStart, scroll, frame.page) };
    }
    return { owned: true, changed: true, overRail: true };
  }

  /** Drops hover and any drag, as when a dialog takes the screen. */
  clear(): void { this.#rails.clear(); }

  dispose(): void {
    this.#clearTimer();
    this.#rails.clear();
  }

  #clearTimer(): void {
    if (this.#activityTimer !== undefined) clearTimeout(this.#activityTimer);
    this.#activityTimer = undefined;
  }
}
