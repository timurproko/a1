export type ResidentTabAction =
  | "tabs.new" | "tabs.close" | "tabs.rename" | "tabs.settings" | "tabs.changelog" | "tabs.commands"
  | "tabs.retry" | "tabs.fresh"
  | "tabs.next" | "tabs.previous" | "tabs.moveRight" | "tabs.moveLeft"
  | `tabs.jump${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`;

export interface ResidentTabShortcut {
  readonly id: ResidentTabAction;
  readonly defaultKey: string | null;
  readonly scope: "global" | "failed-banner";
  readonly description: string;
}

const jumps = Array.from({ length: 10 }, (_, index): ResidentTabShortcut => ({
  id: `tabs.jump${index + 1}` as ResidentTabAction,
  defaultKey: `alt+${(index + 1) % 10}`,
  scope: "global",
  description: `View A1 tab ${index + 1}`,
}));

/**
 * The tab shortcut declarations, in the order that decides which action keeps a duplicated key.
 * This module stays dependency-free so startup presentation and the resident projection can
 * read it without loading the component registry.
 */
export const RESIDENT_TAB_SHORTCUTS: readonly ResidentTabShortcut[] = Object.freeze([
  { id: "tabs.new", defaultKey: "alt+a", scope: "global", description: "New A1 tab" },
  { id: "tabs.close", defaultKey: "alt+w", scope: "global", description: "Close A1 tab" },
  { id: "tabs.rename", defaultKey: "f2", scope: "global", description: "Rename A1 tab" },
  { id: "tabs.settings", defaultKey: "alt+,", scope: "global", description: "Open Settings tab" },
  { id: "tabs.changelog", defaultKey: null, scope: "global", description: "Open Changelog tab" },
  { id: "tabs.commands", defaultKey: "alt+/", scope: "global", description: "Open command palette" },
  ...jumps,
  { id: "tabs.next", defaultKey: null, scope: "global", description: "View next A1 tab" },
  { id: "tabs.previous", defaultKey: null, scope: "global", description: "View previous A1 tab" },
  { id: "tabs.moveRight", defaultKey: null, scope: "global", description: "Move A1 tab right" },
  { id: "tabs.moveLeft", defaultKey: null, scope: "global", description: "Move A1 tab left" },
  { id: "tabs.retry", defaultKey: "r", scope: "failed-banner", description: "Retry failed A1 tab" },
  { id: "tabs.fresh", defaultKey: "f", scope: "failed-banner", description: "Start failed A1 tab fresh" },
]);
