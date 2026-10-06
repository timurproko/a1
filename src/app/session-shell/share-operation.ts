import {
  createPiShellOperationLoader,
  createPiShellShareOperationDialog,
  piShellHyperlink,
  piTheme,
} from "../../integrations/pi/components/index.js";
import { nativeHyperlinkStyle } from "../../ui/components/index.js";

export { createPiShellOperationLoader, createPiShellShareOperationDialog };

export function renderPiShellShareResult(message: string, gistUrl: string): string {
  const theme = piTheme();
  const match = /^Share URL: (\S+)$/u.exec(message);
  const linked = match === null
    ? theme.fg("dim", message)
    : `${theme.fg("dim", "Share URL: ")}${piShellHyperlink(match[1]!)}`;
  return nativeHyperlinkStyle(
    `${linked}\n${theme.fg("dim", "Gist: ")}${piShellHyperlink(gistUrl)}`,
    text => theme.fg("mdLink", text),
  );
}
