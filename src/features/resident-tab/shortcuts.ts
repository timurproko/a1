import { GLOBAL_SCOPE, ShortcutRegistry, type ShortcutDeclaration } from "../../ui/components/index.js";

export type ResidentTabAction =
  | "tabs.new" | "tabs.close" | "tabs.rename" | "tabs.retry" | "tabs.fresh"
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

export const RESIDENT_TAB_SHORTCUTS: readonly ResidentTabShortcut[] = Object.freeze([
  { id: "tabs.new", defaultKey: "alt+a", scope: "global", description: "New A1 tab" },
  { id: "tabs.close", defaultKey: "alt+w", scope: "global", description: "Close A1 tab" },
  { id: "tabs.rename", defaultKey: "f2", scope: "global", description: "Rename A1 tab" },
  ...jumps,
  { id: "tabs.next", defaultKey: null, scope: "global", description: "View next A1 tab" },
  { id: "tabs.previous", defaultKey: null, scope: "global", description: "View previous A1 tab" },
  { id: "tabs.moveRight", defaultKey: null, scope: "global", description: "Move A1 tab right" },
  { id: "tabs.moveLeft", defaultKey: null, scope: "global", description: "Move A1 tab left" },
  { id: "tabs.retry", defaultKey: "r", scope: "failed-banner", description: "Retry failed A1 tab" },
  { id: "tabs.fresh", defaultKey: "f", scope: "failed-banner", description: "Start failed A1 tab fresh" },
]);

export function residentTabShortcutRegistry(assignments: Readonly<Partial<Record<ResidentTabAction, string | null>>> = {}): ShortcutRegistry<ResidentTabAction> {
  const registry = new ShortcutRegistry<ResidentTabAction>();
  for (const shortcut of RESIDENT_TAB_SHORTCUTS) {
    const key = assignments[shortcut.id] === undefined ? shortcut.defaultKey : assignments[shortcut.id];
    if (!key) continue;
    const declaration: ShortcutDeclaration = {
      key,
      scope: shortcut.scope === "global" ? GLOBAL_SCOPE : shortcut.scope,
      section: "Tabs",
      description: shortcut.description,
    };
    registry.declare(declaration, shortcut.id);
  }
  return registry;
}
