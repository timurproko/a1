import type { OwnedUiViewportSettings } from "../../contracts/owned-ui/index.js";
import type { AppHostServices, UiApp } from "../../ui/apps/index.js";
import {
  GLOBAL_SCOPE,
  PLAIN_THEME,
  RAIL_COLUMNS,
  ShortcutRegistry,
  ScrollbarRails,
  assertNoShortcutConflicts,
  displayWidth,
  renderStatusLine,
  scrollForTrackPage,
  scrollbarGeometry,
  scrollbarPresentation,
  scrollbarWheelRows,
  truncateToWidth,
  withScrollbarRail,
  type PaneInputResult,
  type PaneMouseEvent,
  type PaneRect,
  type RailPosition,
  type ScrollbarGeometry,
  type UiTheme,
} from "../../ui/components/index.js";

const SCOPE = "reference-screen";
/** Rows above the document: the top rule. */
const HEADER_ROWS = 1;
/** Rows below the document: the bottom rule and the hint line. */
const FOOTER_ROWS = 2;
// Compatibility: the transcript rail stays lit this long after a scroll, and repaints just after.
const SCROLL_LINGER_MS = 900;
const SCROLL_LINGER_REPAINT_MS = 925;
const LOADING_NOTICE = "Loading…";

type Action = "up" | "down" | "page-up" | "page-down" | "first" | "last" | "close";

export const REFERENCE_SCREEN_SHORTCUTS = new ShortcutRegistry<Action>();
REFERENCE_SCREEN_SHORTCUTS.declare({ key: "up", scope: SCOPE, description: "Scroll up", section: "Navigate", hint: { keys: "↑↓", does: "to scroll" } }, "up");
REFERENCE_SCREEN_SHORTCUTS.declare({ key: "down", scope: SCOPE, description: "Scroll down", section: "Navigate", hint: { keys: "↑↓", does: "to scroll" } }, "down");
REFERENCE_SCREEN_SHORTCUTS.declare({ key: "pageUp", scope: SCOPE, description: "Up a page", section: "Navigate", hint: { keys: "PgUp/PgDn", does: "to page" } }, "page-up");
REFERENCE_SCREEN_SHORTCUTS.declare({ key: "pageDown", scope: SCOPE, description: "Down a page", section: "Navigate", hint: { keys: "PgUp/PgDn", does: "to page" } }, "page-down");
REFERENCE_SCREEN_SHORTCUTS.declare({ key: "home", scope: SCOPE, description: "First row", section: "Navigate" }, "first");
REFERENCE_SCREEN_SHORTCUTS.declare({ key: "end", scope: SCOPE, description: "Last row", section: "Navigate" }, "last");
REFERENCE_SCREEN_SHORTCUTS.declare({ key: "escape", scope: GLOBAL_SCOPE, description: "Close", section: "Screen", hint: { keys: "Esc", does: "to close" } }, "close");
assertNoShortcutConflicts(REFERENCE_SCREEN_SHORTCUTS.assemble());

const KEYS: Readonly<Record<string, string>> = {
  "\u001b[A": "up",
  "\u001b[B": "down",
  "\u001b[5~": "pageUp",
  "\u001b[6~": "pageDown",
  // Protocol: xterm, VT220, and rxvt forms of the same two chords.
  "\u001b[H": "home",
  "\u001b[1~": "home",
  "\u001b[7~": "home",
  "\u001b[F": "end",
  "\u001b[4~": "end",
  "\u001b[8~": "end",
  "\u001b": "escape",
};

/** Rows of a document already styled and wrapped for one content width. */
export interface ReferenceDocumentProvider {
  /** The rows for this width, or null while the document is not available yet. */
  rows(width: number): readonly string[] | null;
  /** Settles once `rows` answers; absent when the document is available at once. */
  readonly ready?: Promise<void>;
}

export interface ReferenceScreenOptions {
  readonly id: string;
  readonly title: string;
  readonly document: ReferenceDocumentProvider;
  /** The reader's scroll settings, read on every frame so a live change is honored. */
  readonly scrollSettings: () => OwnedUiViewportSettings;
}

/**
 * Presents one read-only document full screen between two accent rules: the bold
 * title leads the scrolled rows, the shared scrollbar rail runs beside them, and
 * the hint line closes the frame. Rows come from a provider per content width and
 * are cached until the width changes; the screen closes on Escape and leaves the
 * interrupt chord to its host.
 */
export class ReferenceScreenApp implements UiApp {
  readonly id: string;
  readonly #title: string;
  readonly #document: ReferenceDocumentProvider;
  readonly #scrollSettings: () => OwnedUiViewportSettings;
  #scroll = 0;
  #interruptArmed = false;
  #failure: string | null = null;
  // Performance: the provider wraps Markdown; wheel and drag frames must not repeat that work.
  #cached: { readonly width: number; readonly rows: readonly string[] } | null = null;
  // Invariant: rail hover and drag live in the shared keyed state, as the transcript's do.
  readonly #rails = new ScrollbarRails();
  // Rationale: the rail as drawn in the last frame, or null when nothing can be pointed at.
  #railFrame: { readonly rail: RailPosition; readonly geometry: ScrollbarGeometry; readonly page: number } | null = null;
  #bodyHeight = 0;
  // Invariant: a scroll lights the rail until this time; the timer repaints once it has passed.
  #activeUntil = 0;
  #activityTimer: ReturnType<typeof setTimeout> | undefined;
  #renderedScroll: number | undefined;

  constructor(options: ReferenceScreenOptions) {
    this.id = options.id;
    this.#title = options.title;
    this.#document = options.document;
    this.#scrollSettings = options.scrollSettings;
  }

  onActivate(host: AppHostServices): void {
    const ready = this.#document.ready;
    if (ready === undefined) return;
    void ready.then(() => {
      this.#cached = null;
      host.requestRender();
    }, (error: unknown) => {
      this.#failure = `Could not load ${this.#title}: ${error instanceof Error ? error.message : String(error)}`;
      host.requestRender();
    });
  }

  onClose(_host: AppHostServices): void {
    this.#clearActivityTimer();
    this.#rails.clear();
  }

  render(rect: PaneRect, host: AppHostServices): readonly string[] {
    const theme = host.theme ?? PLAIN_THEME;
    this.#interruptArmed = host.interruptArmed;
    const settings = this.#scrollSettings();
    const reservesRail = settings.scrollbarAppearance !== "hidden";
    const contentWidth = reservesRail ? Math.max(0, rect.width - RAIL_COLUMNS) : rect.width;
    const bodyHeight = Math.max(0, rect.height - HEADER_ROWS - FOOTER_ROWS);
    this.#bodyHeight = bodyHeight;
    const rows = this.#rows(contentWidth, theme);
    const maxScroll = Math.max(0, rows.length - bodyHeight);
    this.#scroll = Math.min(Math.max(0, this.#scroll), maxScroll);
    const now = Date.now();
    // Rationale: every way of scrolling ends in this frame, so a moved document is noticed here
    // once rather than at each wheel, drag, and key branch.
    if (this.#renderedScroll !== undefined && this.#renderedScroll !== this.#scroll) this.#noteScrollActivity(host, now);
    this.#renderedScroll = this.#scroll;

    const geometry = scrollbarGeometry({ contentLength: rows.length, viewportHeight: bodyHeight, scroll: this.#scroll, trackHeight: bodyHeight });
    const presentation = scrollbarPresentation({
      geometry,
      appearance: settings.scrollbarAppearance,
      style: settings.scrollbarStyle,
      hovered: this.#rails.isHovered(this.id),
      dragging: this.#rails.isDragging(this.id),
      activeUntil: this.#activeUntil,
      now,
    });
    this.#railFrame = reservesRail && geometry !== null
      ? { rail: { key: this.id, column: rect.width, rowStart: HEADER_ROWS, trackHeight: geometry.trackHeight }, geometry, page: bodyHeight }
      : null;

    const body: string[] = [];
    for (let index = this.#scroll; index < this.#scroll + bodyHeight; index++) {
      const row = rows[index] ?? "";
      body.push(displayWidth(row) > contentWidth ? truncateToWidth(row, contentWidth) : row);
    }
    const withRail = withScrollbarRail(body, geometry, contentWidth, theme, { presentation });
    const hint = this.#interruptArmed ? "press ctrl+c again to exit a1" : REFERENCE_SCREEN_SHORTCUTS.hint(SCOPE);
    // Compatibility: the v2 reference screen frames its document between two border-coloured rules.
    const rule = theme.fg("border", "─".repeat(rect.width));
    const frame = [rule, ...withRail, rule, renderStatusLine({ hint }, rect.width, theme)];
    // Invariant: a rectangle too small for the chrome still gets exactly its rows, top first.
    return frame.slice(0, rect.height).concat(Array(Math.max(0, rect.height - frame.length)).fill(""));
  }

  onInput(data: string, host: AppHostServices): PaneInputResult {
    const action = REFERENCE_SCREEN_SHORTCUTS.resolve(KEYS[data] ?? data, SCOPE);
    if (action === null) return { consumed: false };
    switch (action) {
      case "close":
        host.close();
        return { consumed: true };
      case "up":
        this.#scrollBy(-1);
        return { consumed: true };
      case "down":
        this.#scrollBy(1);
        return { consumed: true };
      case "page-up":
        this.#scrollBy(-Math.max(1, this.#bodyHeight));
        return { consumed: true };
      case "page-down":
        this.#scrollBy(Math.max(1, this.#bodyHeight));
        return { consumed: true };
      case "first":
        this.#scroll = 0;
        return { consumed: true };
      case "last":
        this.#scroll = Number.MAX_SAFE_INTEGER;
        return { consumed: true };
    }
  }

  onMouse(event: PaneMouseEvent, _host: AppHostServices): PaneInputResult {
    if (event.kind === "wheel-up" || event.kind === "wheel-down") {
      // Invariant: the whole screen owns wheel scrolling; it must not depend on the pointer's row.
      const distance = scrollbarWheelRows(this.#scrollSettings().scrollbarSpeed);
      this.#scrollBy(event.kind === "wheel-down" ? distance : -distance);
      return { consumed: true };
    }
    const rail = this.#railPointer(event);
    if (rail.owned) return { consumed: true };
    return { consumed: event.kind !== "motion", render: rail.changed };
  }

  // Rationale: the rail takes its share of a pointer report first: hover, a thumb drag, or a
  // track page. Owned means the document must not see the report; changed means the rail looks different.
  #railPointer(event: PaneMouseEvent): { readonly owned: boolean; readonly changed: boolean } {
    const frame = this.#railFrame;
    const wasHovered = this.#rails.isHovered(this.id);
    if (frame === null) {
      this.#rails.clear();
      return { owned: false, changed: wasHovered };
    }
    const pointer = { column: event.column, row: event.row - 1 };
    if (this.#rails.isDragging(this.id)) {
      // Invariant: a drag keeps the pointer wherever it goes until the button comes up.
      if (event.kind === "release") this.#rails.endDrag();
      else {
        const target = this.#rails.dragTo(frame.rail, frame.geometry, pointer);
        if (target !== null) this.#scroll = target;
      }
      return { owned: true, changed: true };
    }
    const over = this.#rails.notePointer([frame.rail], pointer) !== null;
    if (!over) return { owned: false, changed: wasHovered };
    if (event.kind === "press" && !this.#rails.beginDrag(frame.rail, frame.geometry, pointer)) {
      this.#scroll = scrollForTrackPage(frame.geometry, pointer.row - frame.rail.rowStart, this.#scroll, frame.page);
    }
    return { owned: true, changed: true };
  }

  // Invariant: the title is the first document row, as in v2, so it scrolls with the document.
  #rows(width: number, theme: UiTheme): readonly string[] {
    const title = theme.bold(theme.fg("accent", this.#title));
    if (this.#failure !== null) return [title, "", this.#failure];
    const cached = this.#cached;
    if (cached !== null && cached.width === width) return [title, ...cached.rows];
    const rows = this.#document.rows(width);
    if (rows === null) return [title, "", LOADING_NOTICE];
    this.#cached = { width, rows };
    return [title, ...rows];
  }

  #scrollBy(distance: number): void {
    // Invariant: the upper clamp happens at render, where the body height and row count are known.
    this.#scroll = Math.max(0, this.#scroll + distance);
  }

  #noteScrollActivity(host: AppHostServices, now: number): void {
    this.#activeUntil = Math.max(this.#activeUntil, now + SCROLL_LINGER_MS);
    this.#clearActivityTimer();
    this.#activityTimer = setTimeout(() => {
      this.#activityTimer = undefined;
      host.requestRender();
    }, SCROLL_LINGER_REPAINT_MS);
    this.#activityTimer.unref?.();
  }

  #clearActivityTimer(): void {
    if (this.#activityTimer !== undefined) clearTimeout(this.#activityTimer);
    this.#activityTimer = undefined;
  }
}
