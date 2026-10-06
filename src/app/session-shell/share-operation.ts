import {
  createPiShellOperationLoader,
  createPiShellShareOperationDialog,
  piShellHyperlink,
  piTheme,
} from "../../integrations/pi/components/index.js";
import { nativeHyperlinkStyle } from "../../ui/components/index.js";

export { createPiShellOperationLoader, createPiShellShareOperationDialog };

export function renderPiShellShareResult(message: string, gistUrl: string): string {
  const match = /^Share URL: (\S+)$/u.exec(message);
  const linked = match === null ? message : `Share URL: ${piShellHyperlink(match[1]!)}`;
  return nativeHyperlinkStyle(
    `${linked}\nGist: ${piShellHyperlink(gistUrl)}`,
    text => piTheme().fg("mdLink", text),
  );
}
