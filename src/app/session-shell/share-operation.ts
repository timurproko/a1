import type { UiTheme } from "../../contracts/presentation/index.js";
import { nativeHyperlinkStyle } from "../../ui/components/index.js";

/** The completed share result in bare A1: dim labels with the share and gist URLs made clickable. */
export function renderShellShareResult(message: string, gistUrl: string, theme: UiTheme, hyperlink: (url: string) => string): string {
  const match = /^Share URL: (\S+)$/u.exec(message);
  const linked = match === null
    ? theme.fg("dim", message)
    : `${theme.fg("dim", "Share URL: ")}${hyperlink(match[1]!)}`;
  return nativeHyperlinkStyle(
    `${linked}\n${theme.fg("dim", "Gist: ")}${hyperlink(gistUrl)}`,
    text => theme.fg("mdLink", text),
  );
}
