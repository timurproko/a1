export {
  AUTO_NAME_MAX_LENGTH,
  AUTO_NAME_MAX_TOKENS,
  AUTO_NAME_TIMEOUT_MS,
  fallbackAutoName,
  generateAutoName,
  normalizeAutoName,
  type AutoNameCompletion,
} from "./auto-name.js";
export {
  RESIDENT_TAB_SHORTCUTS,
  residentTabShortcutRegistry,
  type ResidentTabAction,
  type ResidentTabShortcut,
} from "./shortcuts.js";
export {
  deriveResidentTabStatus,
  type ResidentTabDerivedStatus,
  type ResidentTabFacts,
} from "./status-deriver.js";
