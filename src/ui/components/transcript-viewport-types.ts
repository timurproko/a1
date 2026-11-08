import type { ScrollbarAppearance, ScrollbarGeometry, ScrollbarStyle } from "./scrollbar.js";

export interface TranscriptPromptAnchor {
  readonly id: string;
  readonly firstRow: number;
  readonly lastRow: number;
  /** The source first row, including its submitted-prompt styling. */
  readonly sourceRow: string;
  /** Optional source-styled row used only while prominent and not hovered. */
  readonly prominentSourceRow?: string;
}

export interface TranscriptViewportConfig {
  readonly scrollbarAppearance: ScrollbarAppearance;
  readonly scrollbarStyle: ScrollbarStyle;
}

export interface TranscriptViewportTheme {
  readonly track: (text: string) => string;
  readonly thumb: (text: string, active: boolean) => string;
  readonly sticky: (text: string, hovered: boolean) => string;
  readonly quietSticky: (text: string) => string;
  readonly bottomControl: (text: string, hovered: boolean) => string;
  readonly selection: (line: string, from: number, to: number) => string;
}

export interface TranscriptViewportFrameInput {
  readonly documentRows: readonly string[];
  /** Optional paint-only transform; semantic selection and copying keep documentRows exact. */
  readonly paintDocumentRow?: (row: string) => string;
  /** Leading persistent document rows; later transient rows remain selectable visible-frame content. */
  readonly selectableDocumentRowCount?: number;
  /**
   * First document row owned by the block that is currently streaming, if any. Rows from
   * here to the end of the selectable document reflow together whenever that block
   * re-renders, so the frame can declare how much damage is legitimately its own.
   */
  readonly liveTailStartRow?: number;
  /** Final transient rows to bottom-align with unused viewport space while content fits. */
  readonly bottomAlignedTailRowCount?: number;
  readonly dockRows: readonly string[];
  /** Zero-based dock rows admitted to frame copying, classified before dock composition. */
  readonly copyableDockRows?: readonly {
    readonly row: number;
    readonly prompt?: "first" | "continuation";
  }[];
  readonly promptAnchors: readonly TranscriptPromptAnchor[];
  readonly width: number;
  readonly height: number;
  /**
   * Optional zero-based terminal row for the floating bottom control. The shell
   * supplies a stable anchor above its editor group so transient status and
   * notification rows cannot make the control jump vertically.
   */
  readonly bottomControlRow?: number;
  /** Latest reported one-based terminal coordinates; bottom hover uses this frame's hit region. */
  readonly pointerPosition?: { readonly column: number; readonly row: number };
  /** Base-frame cells hidden by modal/replacement surfaces and therefore excluded from visual copy. */
  readonly coveredCells?: readonly {
    readonly row: number;
    readonly columnStart: number;
    readonly columnEnd: number;
  }[];
  /** Transient paint-only text that must not participate in frame allocation or copying. */
  readonly frameOverlay?: {
    /** One-based terminal row. */
    readonly row: number;
    readonly text: string;
  };
  readonly now?: number;
  readonly theme?: TranscriptViewportTheme;
}

export interface TranscriptViewportHitRegions {
  readonly viewportHeight: number;
  readonly rail: {
    readonly column: number;
    /** One-based terminal row. The one-row top inset is intentionally excluded. */
    readonly rowStart: number;
    readonly trackHeight: number;
    readonly geometry: ScrollbarGeometry;
  } | null;
  readonly sticky: { readonly row: number; readonly target: number; readonly width: number } | null;
  readonly bottom: { readonly row: number; readonly columnStart: number; readonly columnEnd: number } | null;
  /** Transient non-persistent document-tail rows currently visible in the viewport. */
  readonly transientTail: readonly number[];
}

export interface TranscriptViewportFrameDescriptor {
  readonly frameId: number;
  readonly width: number;
  readonly height: number;
  readonly transcript: { readonly rowStart: number; readonly rowEnd: number } | null;
  readonly dock: { readonly rowStart: number; readonly rowEnd: number } | null;
  readonly previousDocumentRange: { readonly start: number; readonly end: number } | null;
  readonly nextDocumentRange: { readonly start: number; readonly end: number };
  readonly previousFollowingEnd: boolean | null;
  readonly followingEnd: boolean;
  /** Complete non-persistent suffix, including pending steering, alignment, and status rows. */
  readonly transientRowCount: number;
  /** Flexible rows inserted before the bottom-aligned live status while content fits. */
  readonly transientAlignmentGapRows: number;
  /** Bottom-aligned transient rows. */
  readonly bottomAlignedTailRowCount: number;
  /** Visible rows owned by the currently streaming transcript block. */
  readonly liveTailRows: number;
  readonly verticalShiftRows: number;
  readonly safeVerticalShift: boolean;
  /** Monotonic interaction revision used to reject stale selection evidence. */
  readonly selectionRevision: number;
  /** One-based terminal rows whose source or normalized selection range changed. */
  readonly selectionDamagedRows: readonly number[];
  readonly cause: "initial" | "steady" | "dock-input" | "follow-shift" | "detached" | "geometry-change";
}

export interface TranscriptViewportFrame {
  readonly rows: readonly string[];
  readonly contentWidth: number;
  readonly scrollTop: number;
  readonly maxScroll: number;
  readonly followingEnd: boolean;
  readonly hits: TranscriptViewportHitRegions;
  readonly descriptor: TranscriptViewportFrameDescriptor;
  /** Deterministic evidence for bounded selection-only row composition. */
  readonly selectionDamage: {
    readonly revision: number;
    readonly recomputedRows: readonly number[];
    readonly reusedRows: readonly number[];
    readonly cacheEntries: number;
  };
}
