/**
 * One scrollbar for every scrollable surface. Hover and drag belong to a named
 * rail rather than to a global, because two scrollable surfaces can be visible
 * at once and a shared flag lights up the wrong one.
 */

export type ScrollbarAppearance = "always" | "hover" | "hidden";
export type ScrollbarStyle = "thin" | "thick";
export type ScrollbarSpeed = "normal" | "high";

export function scrollbarWheelLines(speed: ScrollbarSpeed): number {
  return speed === "high" ? 6 : 3;
}

export const SCROLLBAR_ACTIVITY_LINGER_MS = 900;

export interface ScrollbarPresentation {
  /** A reserved column prevents a hover rail from reflowing its content. */
  readonly reservesColumn: boolean;
  readonly visible: boolean;
  readonly style: ScrollbarStyle;
}

export interface ScrollbarPresentationInput {
  readonly geometry: ScrollbarGeometry | null;
  readonly appearance: ScrollbarAppearance;
  readonly style: ScrollbarStyle;
  readonly hovered: boolean;
  readonly dragging: boolean;
  readonly lastActivityAt?: number;
  readonly now: number;
  readonly lingerMs?: number;
}

/** Pure appearance policy; callers own clocks and interaction state. */
export function scrollbarPresentation(input: ScrollbarPresentationInput): ScrollbarPresentation {
  if (input.geometry === null || input.appearance === "hidden") {
    return { reservesColumn: false, visible: false, style: input.style };
  }
  const linger = input.lastActivityAt !== undefined
    && input.now - input.lastActivityAt <= (input.lingerMs ?? SCROLLBAR_ACTIVITY_LINGER_MS);
  return {
    reservesColumn: true,
    visible: input.appearance === "always" || input.hovered || input.dragging || linger,
    style: input.style,
  };
}

export function scrollbarGlyph(style: ScrollbarStyle, thumb: boolean): string {
  if (style === "thick") return thumb ? "█" : "▐";
  return thumb ? "┃" : "│";
}

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
  #dragging: { readonly key: string; readonly grabOffset: number } | undefined;

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
    this.#dragging = undefined;
  }
}
