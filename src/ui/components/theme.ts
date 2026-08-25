/**
 * Colour as a port, so a screen can be rendered and asserted without a terminal
 * or a theme, and so the component layer never imports a Pi adapter.
 */

export type UiThemeToken = "accent" | "text" | "muted" | "dim" | "border" | "error";

export interface UiTheme {
  fg(token: UiThemeToken, text: string): string;
  bold(text: string): string;
  /**
   * The terminal's own foreground, left unpainted. What a list's own text is:
   * a theme built for a light background would otherwise write near-black rows
   * into a dark terminal, which is how the engine leaves its lists too.
   */
  plain(text: string): string;
  /** Inverted styling for the active row of a floating surface. */
  highlight(text: string): string;
  /** A control that is present but cannot act: quieter than quiet text. */
  disabled(text: string): string;
  /** Background for a floating surface, so it reads as above the content. */
  panel(text: string): string;
}

/** Renders every token as plain text. What tests assert against. */
export const PLAIN_THEME: UiTheme = Object.freeze({
  fg: (_token: UiThemeToken, text: string) => text,
  bold: (text: string) => text,
  plain: (text: string) => text,
  highlight: (text: string) => text,
  disabled: (text: string) => text,
  panel: (text: string) => text,
});
