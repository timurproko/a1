import type { ThemeSource, UiTheme, UiThemeBackground, UiThemeToken } from "../../contracts/presentation/index.js";

export type { ThemeSource, UiTheme, UiThemeBackground, UiThemeToken };

/** Renders every token as plain text. What tests assert against. */
export const PLAIN_THEME: UiTheme = Object.freeze({
  fg: (_token: UiThemeToken, text: string) => text,
  bold: (text: string) => text,
  plain: (text: string) => text,
  highlight: (text: string) => text,
  disabled: (text: string) => text,
  panel: (text: string) => text,
  background: (_token: UiThemeBackground, text: string) => text,
});

/** A theme source that never changes and paints nothing. */
export const PLAIN_THEME_SOURCE: ThemeSource = Object.freeze({
  current: () => PLAIN_THEME,
  onChange: () => () => {},
});
