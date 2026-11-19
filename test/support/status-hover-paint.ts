import { piTheme } from "../../src/integrations/pi/components/theme.js";

/** Expected status-bar hover: reverse video over the control's ordinary role color. */
export function paintPiStatusHover(role: Parameters<ReturnType<typeof piTheme>["fg"]>[0], text: string): string {
  return `\u001b[7m${piTheme().fg(role, text)}\u001b[27m`;
}
