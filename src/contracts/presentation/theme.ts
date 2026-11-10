/** Foreground roles a vendor-neutral surface paints with. */
export type UiThemeToken =
  | "accent" | "mdHeading" | "mdLink" | "text" | "muted" | "dim" | "border" | "error" | "success"
  | "scrollbarTrack" | "scrollbarThumb";

/** Background roles for a selected row and for a row whose work is still pending. */
export type UiThemeBackground = "selectedBg" | "toolPendingBg";

export interface UiTheme {
  fg(token: UiThemeToken, text: string): string;
  bold(text: string): string;
  /**
   * The terminal's own foreground, left unpainted. What a list's own text is:
   * a theme built for a light background would otherwise write near-black rows
   * into a dark terminal, which is how the engine leaves its lists too.
   */
  plain(text: string): string;
  /** Optional palette preview used by controls that choose the active accent. */
  accentPreview?(color: string, text: string): string | null;
  /** Selection background for an active list item or floating-surface row. */
  highlight(text: string): string;
  /** A control that is present but cannot act: quieter than quiet text. */
  disabled(text: string): string;
  /** Background for a floating surface, so it reads as above the content. */
  panel(text: string): string;
  /** Paints a declared background role behind already painted text. */
  background(token: UiThemeBackground, text: string): string;
}

/**
 * The active theme and its change notifications. The vendor adapter supplies it, so a surface paints
 * from the live theme without importing the vendor's theme module.
 */
export interface ThemeSource {
  /** The live theme; its painters read the current palette on every call. */
  current(): UiTheme;
  /** Calls `listener` after the active theme changes; returns the unsubscribe function. */
  onChange(listener: () => void): () => void;
}

import type { TerminalRuntimeFactory } from "./terminal.js";

/** How the full-screen canvas behind the session is painted. */
export type CanvasBackgroundStyle = "transparent" | "accent" | "dark";

/** What the application shell receives from the vendor presentation adapter. */
export interface ShellPresentationPorts {
  readonly theme: ThemeSource;
  /** The terminal background sequence for a canvas style in the active theme, or null to leave the terminal's own. */
  canvasBackground(style: CanvasBackgroundStyle): string | null;
  /** Columns the pinned comparison layout pads command output with. */
  readonly pinnedOutputPad: 0 | 1;
  /** Live color-capability-aware background for owned floating panels only. */
  readonly floatingDialogSurface?: (text: string) => string;
  readonly terminalRuntime: TerminalRuntimeFactory;
}
