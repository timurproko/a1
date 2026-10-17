import { RESIDENT_TAB_SHORTCUTS, type ResidentTabAction } from "./shortcut-declarations.js";

/** Key assignments as `keybindings.json` and the keybinding manager express them. */
export type ShortcutBindings = Readonly<Record<string, string | readonly string[] | null | undefined>>;

export type ResidentTabGlobalAction = Exclude<ResidentTabAction, "tabs.retry" | "tabs.fresh">;

export interface ResidentTabShortcutConflict {
  readonly id: ResidentTabGlobalAction;
  readonly key: string;
  /** `reserved` keys belong to an A1 action; `duplicate` keys were claimed by an earlier tab action. */
  readonly reason: "reserved" | "duplicate";
}

/** The effective tab shortcuts the resident shell dispatches and every presentation shows. */
export interface ResidentTabShortcutProjection {
  readonly assignments: Readonly<Record<ResidentTabGlobalAction, string | null>>;
  readonly conflicts: readonly ResidentTabShortcutConflict[];
}

export interface ResidentTabShortcutInput {
  /** The user's `keybindings.json`, including any `tabs.*` entries; `null` unbinds an action. */
  readonly configured?: ShortcutBindings | undefined;
  /** The effective A1 declarations (defaults plus customization) whose keys tab actions may not take. */
  readonly reserved?: ShortcutBindings | undefined;
}

/** The declarations the projection covers, in the order that decides duplicate claims. */
export const RESIDENT_TAB_GLOBAL_SHORTCUTS = RESIDENT_TAB_SHORTCUTS.filter(shortcut => shortcut.scope === "global");

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

function keysOf(value: string | readonly string[] | null | undefined): readonly string[] | null | undefined {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return [value];
  return value.filter((key): key is string => typeof key === "string");
}

/**
 * Projects the effective A1 declarations and the user's customization into one tab shortcut
 * assignment per action. A key an A1 action holds after customization never becomes a tab
 * shortcut; between tab actions the earlier declaration keeps a duplicated key.
 */
export function projectResidentTabShortcuts(input: ResidentTabShortcutInput = {}): ResidentTabShortcutProjection {
  const configured = input.configured ?? {};
  const claimedByA1 = new Map<string, readonly string[]>();
  for (const [action, value] of Object.entries(input.reserved ?? {})) {
    if (action.startsWith("tabs.")) continue;
    claimedByA1.set(action, keysOf(value) ?? []);
  }
  for (const [action, value] of Object.entries(configured)) {
    if (action.startsWith("tabs.") || action === "$schema") continue;
    claimedByA1.set(action, keysOf(value) ?? []);
  }
  const reserved = new Set<string>();
  for (const keys of claimedByA1.values()) for (const key of keys) reserved.add(normalizeKey(key));
  const claimed = new Set<string>();
  const conflicts: ResidentTabShortcutConflict[] = [];
  const assignments = {} as Record<ResidentTabGlobalAction, string | null>;
  for (const shortcut of RESIDENT_TAB_GLOBAL_SHORTCUTS) {
    const id = shortcut.id as ResidentTabGlobalAction;
    const custom = configured[id];
    const candidates = custom === undefined
      ? (shortcut.defaultKey === null ? [] : [shortcut.defaultKey])
      : (keysOf(custom) ?? []);
    let assigned: string | null = null;
    for (const candidate of candidates.map(normalizeKey)) {
      if (candidate.length === 0) continue;
      if (reserved.has(candidate)) { conflicts.push({ id, key: candidate, reason: "reserved" }); continue; }
      if (claimed.has(candidate)) { conflicts.push({ id, key: candidate, reason: "duplicate" }); continue; }
      assigned = candidate;
      claimed.add(candidate);
      break;
    }
    assignments[id] = assigned;
  }
  return { assignments, conflicts };
}
