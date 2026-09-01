/**
 * One scrollbar for every scrollable surface. Hover and drag belong to a named
 * rail rather than to a global, because two scrollable surfaces can be visible
 * at once and a shared flag lights up the wrong one.
 */

export interface ScrollbarGeometry {
  /** Rows in the track. */
  readonly trackHeight: number;
  /** Thumb height in rows, at least one. */
  readonly thumbHeight: number;
  /** Zero-based row of the thumb's top within the track. */
  readonly thumbTop: number;
  /** Highest scroll position the content allows. */
  readonly maxScroll: number;
}

export interface ScrollbarInput {
  readonly contentLength: number;
  readonly viewportHeight: number;
  readonly scroll: number;
  readonly trackHeight: number;
}

export type ScrollbarAppearance = "auto" | "always" | "hidden";
export type ScrollbarStyle = "thin" | "thick";
export type ScrollbarSpeed = "normal" | "fast" | "high";

/** Wheel distance: normal (3), fast (6), high as normal + fast (9). */
export function scrollbarWheelRows(speed: ScrollbarSpeed): number {
  return speed === "high" ? 9 : speed === "fast" ? 6 : 3;
}

/** Selection edge distance uses the same configured rate as a wheel event. */
export function scrollbarSelectionRows(speed: ScrollbarSpeed): number {
  return scrollbarWheelRows(speed);
}

export interface ScrollbarPresentationInput {
  readonly geometry: ScrollbarGeometry | null;
  readonly appearance: ScrollbarAppearance;
  readonly style: ScrollbarStyle;
  readonly hovered: boolean;
  readonly dragging: boolean;
  readonly activeUntil: number;
  readonly now: number;
}

export interface ScrollbarPresentation {
  readonly visible: boolean;
  readonly reservesSpace: boolean;
  readonly trackGlyph: "│" | "┃";
  readonly thumbGlyph: "│" | "┃";
}

/** Pure appearance decision; activity time is supplied so tests own the clock. */
export function scrollbarPresentation(input: ScrollbarPresentationInput): ScrollbarPresentation {
  const overflowing = input.geometry !== null;
  // Invariant: auto/always reserve the final rail cell even while content fits.
  // The blank gutter prevents prompt timestamps from touching the terminal edge
  // and keeps later scrollbar appearance from reflowing the transcript.
  const reservesSpace = input.appearance !== "hidden";
  const visible = overflowing && reservesSpace && (input.appearance === "always"
    || input.hovered
    || input.dragging
    || (input.activeUntil > 0 && input.now <= input.activeUntil));
  const thick = input.style === "thick";
  return {
    visible,
    reservesSpace,
    trackGlyph: thick ? "┃" : "│",
    thumbGlyph: thick || input.hovered || input.dragging ? "┃" : "│",
  };
}

/** Null when the content fits: no scrollbar is drawn and no width is reserved. */
export function scrollbarGeometry(input: ScrollbarInput): ScrollbarGeometry | null {
  const { contentLength, viewportHeight, trackHeight } = input;
  if (trackHeight <= 0 || viewportHeight <= 0) return null;
  if (contentLength <= viewportHeight) return null;

  const maxScroll = contentLength - viewportHeight;
  const scroll = Math.min(Math.max(input.scroll, 0), maxScroll);
  const thumbHeight = Math.max(1, Math.min(trackHeight, Math.round(trackHeight * viewportHeight / contentLength)));
  const travel = trackHeight - thumbHeight;
  const thumbTop = maxScroll === 0 ? 0 : Math.min(travel, Math.round(travel * scroll / maxScroll));
  return { trackHeight, thumbHeight, thumbTop, maxScroll };
}

export function scrollbarReservesSpace(geometry: ScrollbarGeometry | null): boolean {
  return geometry !== null;
}

/** True when this track row is part of the thumb. */
export function isThumbRow(geometry: ScrollbarGeometry | null, trackRow: number): boolean {
  if (geometry === null) return false;
  return trackRow >= geometry.thumbTop && trackRow < geometry.thumbTop + geometry.thumbHeight;
}

/** Scroll position for a thumb dragged to a track row. */
export function scrollForThumbRow(geometry: ScrollbarGeometry | null, trackRow: number): number {
  if (geometry === null) return 0;
  const travel = geometry.trackHeight - geometry.thumbHeight;
  if (travel <= 0) return 0;
  const clamped = Math.min(Math.max(trackRow, 0), travel);
  return Math.round(clamped * geometry.maxScroll / travel);
}

/** Scroll position after paging on the track above or below the thumb. */
export function scrollForTrackPage(
  geometry: ScrollbarGeometry | null,
  trackRow: number,
  scroll: number,
  viewportHeight: number,
): number {
  if (geometry === null) return scroll;
  const page = Math.max(1, viewportHeight);
  const next = trackRow < geometry.thumbTop ? scroll - page : scroll + page;
  return Math.min(Math.max(next, 0), geometry.maxScroll);
}

export interface RailPosition {
  /** Identity of this rail. Two surfaces never share one. */
  readonly key: string;
  /** Column the rail is drawn in, one-based. */
  readonly column: number;
  /** First row of the track within the surface, zero-based. */
  readonly rowStart: number;
  readonly trackHeight: number;
}

export interface RailPointer {
  readonly column: number;
  readonly row: number;
}

/**
 * Hover and drag state for every rail on screen. State is keyed by rail, so a
 * pointer over one rail cannot make another appear hot, and a drag started on
 * one rail cannot be continued by a report addressed to another.
 */
export class ScrollbarRails {
  readonly #hovered = new Set<string>();
  readonly #activeUntil = new Map<string, number>();
  #dragging: { readonly key: string; readonly grabOffset: number } | undefined;

  noteActivity(key: string, now: number, lingerMs = 900): void {
    this.#activeUntil.set(key, Math.max(this.#activeUntil.get(key) ?? 0, now + Math.max(0, lingerMs)));
  }

  isRecentlyActive(key: string, now: number): boolean {
    return now <= (this.#activeUntil.get(key) ?? 0);
  }

  isHovered(key: string): boolean {
    return this.#hovered.has(key);
  }

  isDragging(key: string): boolean {
    return this.#dragging?.key === key;
  }

  get draggingKey(): string | null {
    return this.#dragging?.key ?? null;
  }

  /** Records the pointer position. Returns the rail it is over, if any. */
  notePointer(rails: readonly RailPosition[], pointer: RailPointer): string | null {
    this.#hovered.clear();
    for (const rail of rails) {
      if (pointer.column !== rail.column) continue;
      const trackRow = pointer.row - rail.rowStart;
      if (trackRow < 0 || trackRow >= rail.trackHeight) continue;
      this.#hovered.add(rail.key);
      return rail.key;
    }
    return null;
  }

  /** Starts a drag when the pointer is on that rail's thumb. */
  beginDrag(rail: RailPosition, geometry: ScrollbarGeometry | null, pointer: RailPointer): boolean {
    if (geometry === null || pointer.column !== rail.column) return false;
    const trackRow = pointer.row - rail.rowStart;
    if (!isThumbRow(geometry, trackRow)) return false;
    this.#dragging = { key: rail.key, grabOffset: trackRow - geometry.thumbTop };
    return true;
  }

  /** Scroll position for a drag in progress, or null when this rail is not being dragged. */
  dragTo(rail: RailPosition, geometry: ScrollbarGeometry | null, pointer: RailPointer): number | null {
    const dragging = this.#dragging;
    if (dragging === undefined || dragging.key !== rail.key || geometry === null) return null;
    return scrollForThumbRow(geometry, pointer.row - rail.rowStart - dragging.grabOffset);
  }

  endDrag(): void {
    this.#dragging = undefined;
  }

  clear(): void {
    this.#hovered.clear();
    this.#activeUntil.clear();
    this.#dragging = undefined;
  }
}
