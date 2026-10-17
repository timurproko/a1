export {
  AUTO_NAME_MAX_LENGTH,
  AUTO_NAME_TIMEOUT_MS,
  AUTO_NAME_TOKEN_BUDGETS,
  fallbackAutoName,
  generateAutoName,
  normalizeAutoName,
  type AutoNameCompletion,
} from "./auto-name.js";
// Performance: the registry builder lives in `shortcuts.ts`, outside this barrel, so startup
// presentation can read the declarations without loading the component registry.
export {
  RESIDENT_TAB_SHORTCUTS,
  type ResidentTabAction,
  type ResidentTabShortcut,
} from "./shortcut-declarations.js";
export {
  projectResidentTabShortcuts,
  RESIDENT_TAB_GLOBAL_SHORTCUTS,
  type ResidentTabGlobalAction,
  type ResidentTabShortcutConflict,
  type ResidentTabShortcutProjection,
  type ShortcutBindings,
} from "./shortcut-projection.js";
export { readShortcutBindingsFile } from "./shortcut-bindings-file.js";
export {
  deriveResidentTabStatus,
  type ResidentTabDerivedStatus,
  type ResidentTabFacts,
} from "./status-deriver.js";
