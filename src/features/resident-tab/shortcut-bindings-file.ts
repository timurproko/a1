import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ShortcutBindings } from "./shortcut-projection.js";

/** Largest `keybindings.json` the projection reads; a larger file counts as absent. */
export const MAX_SHORTCUT_BINDINGS_BYTES = 256 * 1024;

/**
 * Reads the user's `keybindings.json` as shortcut bindings, keeping `null` entries so an
 * explicit unbind survives, and treating any unreadable or malformed file as empty.
 */
export function readShortcutBindingsFile(agentDir: string): ShortcutBindings {
  let text: string;
  try {
    text = readFileSync(join(agentDir, "keybindings.json"), "utf8");
  } catch {
    return {};
  }
  if (text.length > MAX_SHORTCUT_BINDINGS_BYTES) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.replace(/^﻿/u, ""));
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
  const bindings: Record<string, string | readonly string[] | null> = {};
  for (const [action, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (action === "$schema") continue;
    if (value === null || typeof value === "string") { bindings[action] = value; continue; }
    if (Array.isArray(value)) bindings[action] = value.filter((key): key is string => typeof key === "string");
  }
  return bindings;
}
