import { Text, replaceControlCharacters, type Component } from "@earendil-works/pi-tui";
import { piTheme } from "./theme.js";

type LoginTextRole = "accent" | "muted" | "warning" | "success" | "error" | "dim" | "text";

/** Preserves authored line breaks without replaying control payloads. */
export function loginPlainText(value: string): string {
  return value.split("\n").map(line => replaceControlCharacters(line)).join("\n");
}

/** A zero-inset login row that resolves its semantic role against the live theme on every frame. */
export function loginText(text: string | (() => string), role: LoginTextRole = "muted", bold = false): Component {
  return {
    render(width) {
      const theme = piTheme();
      const value = typeof text === "string" ? loginPlainText(text) : text();
      return new Text(theme.fg(role, bold ? theme.bold(value) : value), 0, 0).render(width);
    },
    invalidate() {},
  };
}
