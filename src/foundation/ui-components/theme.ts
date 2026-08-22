/**
 * Colour as a port, so a screen can be rendered and asserted without a terminal
 * or a theme, and so the component layer never imports a Pi adapter.
 */

export type UiThemeToken = "accent" | "text" | "muted" | "dim" | "border" | "borderMuted" | "error";

export interface UiTheme {
  fg(token: UiThemeToken, text: string): string;
  bold(text: string): string;
  /** Inverted styling for the active row of a floating surface. */
  highlight(text: string): string;
  /** Background for a floating surface, so it reads as above the content. */
  panel(text: string): string;
}

/** Renders every token as plain text. What tests assert against. */
export const PLAIN_THEME: UiTheme = Object.freeze({
  fg: (_token: UiThemeToken, text: string) => text,
  bold: (text: string) => text,
  highlight: (text: string) => text,
  panel: (text: string) => text,
});
