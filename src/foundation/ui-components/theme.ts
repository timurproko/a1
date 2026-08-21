/**
 * Colour as a port, so a screen can be rendered and asserted without a terminal
 * or a theme, and so the component layer never imports a Pi adapter.
 */

export type UiThemeToken = "accent" | "text" | "muted" | "dim" | "border" | "error";

export interface UiTheme {
  fg(token: UiThemeToken, text: string): string;
  bold(text: string): string;
  /** Inverted styling for a selected menu row or a hovered button. */
  highlight(text: string): string;
}

/** Renders every token as plain text. What tests assert against. */
export const PLAIN_THEME: UiTheme = Object.freeze({
  fg: (_token: UiThemeToken, text: string) => text,
  bold: (text: string) => text,
  highlight: (text: string) => text,
});
