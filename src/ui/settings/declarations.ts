export const OWNED_UI_SETTINGS_VERSION = 7;

export type OwnedUiSettingValue = string | number | boolean;

export type OwnedUiSettingApplication = "live" | "restart";

export interface OwnedUiSettingDeclaration {
  readonly id: string;
  /** Optional presentation label; the id remains the persistence key. */
  readonly label?: string;
  /** Optional settings-screen group for related owned controls. */
  readonly section?: { readonly id: string; readonly title: string };
  readonly description: string;
  readonly application: OwnedUiSettingApplication;
  readonly defaultValue: OwnedUiSettingValue;
  readonly allowedValues: readonly OwnedUiSettingValue[];
}

const MAX_ID_LENGTH = 64;
const ID_PATTERN = /^[a-z][a-z0-9]*(?:[A-Z][a-z0-9]*)*$/;

/** Declared first so the settings screen opens on it; sections follow first-declaration order. */
const GENERIC_SECTION = Object.freeze({ id: "generic", title: "Generic" });
const SCROLL_SECTION = Object.freeze({ id: "scroll", title: "Scroll" });
const QUIT_SECTION = Object.freeze({ id: "quit", title: "Quit" });
const AGENT_SECTION = Object.freeze({ id: "agent", title: "Agent" });

/** Playback lengths the quit outro offers, in milliseconds. */
export const QUIT_EFFECT_DURATIONS_MS: readonly number[] = Object.freeze(
  Array.from({ length: 18 }, (_, index) => 300 + index * 100),
);

/**
 * Every A1 setting, keyed by its id. The table is the one declaration: ids, defaults, and allowed
 * values are read from it, and `OwnedSettingValueOf` derives each getter's type from it.
 */
export const OWNED_SETTING_DECLARATIONS = Object.freeze({
  quitAnimation: Object.freeze({
    id: "quitAnimation",
    label: "Exit animation",
    section: GENERIC_SECTION,
    description: "Play the quit effect when the session quits. Off returns to the terminal immediately.",
    application: "live",
    defaultValue: true,
    allowedValues: Object.freeze([true, false] as const),
  }),
  scrollbarAppearance: Object.freeze({
    id: "scrollbarAppearance",
    label: "Scrollbar mode",
    section: SCROLL_SECTION,
    description: "When the session transcript scrollbar is visible.",
    application: "live",
    defaultValue: "auto",
    allowedValues: Object.freeze(["auto", "always", "hidden"] as const),
  }),
  scrollbarStyle: Object.freeze({
    id: "scrollbarStyle",
    label: "Scrollbar style",
    section: SCROLL_SECTION,
    description: "Visual weight of the session transcript scrollbar.",
    application: "live",
    defaultValue: "thin",
    allowedValues: Object.freeze(["thin", "thick"] as const),
  }),
  scrollbarSpeed: Object.freeze({
    id: "scrollbarSpeed",
    label: "Speed",
    section: SCROLL_SECTION,
    description: "Distance moved by each session transcript wheel event.",
    application: "live",
    defaultValue: "normal",
    allowedValues: Object.freeze(["normal", "fast", "high"] as const),
  }),
  promptHistoryEnabled: Object.freeze({
    id: "promptHistoryEnabled",
    label: "Persistent history",
    section: Object.freeze({ id: "history", title: "History" }),
    description: "Retain reusable prompts across sessions. Applies on next start; disabling does not erase saved history or stop existing instances.",
    application: "restart",
    defaultValue: true,
    allowedValues: Object.freeze([true, false] as const),
  }),
  promptHistoryMaxItems: Object.freeze({
    id: "promptHistoryMaxItems",
    label: "History limit",
    section: Object.freeze({ id: "history", title: "History" }),
    description: "Maximum recent unique prompts after next start. Byte limits also apply; increasing the limit cannot restore pruned entries.",
    application: "restart",
    defaultValue: 100,
    allowedValues: Object.freeze([10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const),
  }),
  quitEffect: Object.freeze({
    id: "quitEffect",
    label: "Effect",
    section: QUIT_SECTION,
    description: "Animation played over the last screen when the session quits.",
    application: "live",
    defaultValue: "fall",
    allowedValues: Object.freeze(["fall", "dissolve", "starburst", "waves"] as const),
  }),
  quitEffectDurationMs: Object.freeze({
    id: "quitEffectDurationMs",
    label: "Duration",
    section: QUIT_SECTION,
    description: "Milliseconds the quit animation plays before the terminal is restored.",
    application: "live",
    defaultValue: 800,
    allowedValues: QUIT_EFFECT_DURATIONS_MS,
  }),
  promptSuggestions: Object.freeze({
    id: "promptSuggestions",
    label: "Prompt suggestions",
    section: AGENT_SECTION,
    description: "Predict likely next prompts with one additional background request using the selected model.",
    application: "live",
    defaultValue: true,
    allowedValues: Object.freeze([true, false] as const),
  }),
  skillsPresentation: Object.freeze({
    id: "skillsPresentation",
    label: "Skills",
    section: AGENT_SECTION,
    description: "Collapse offers one /skills command with a searchable dialog and the /skills: shortcut; expand lists every /skill:<name> command directly.",
    application: "live",
    defaultValue: "collapse",
    allowedValues: Object.freeze(["collapse", "expand"] as const),
  }),
} as const satisfies Readonly<Record<string, OwnedUiSettingDeclaration>>);

export type OwnedSettingId = keyof typeof OWNED_SETTING_DECLARATIONS;

/** The value type a setting's declaration allows: a literal union for a choice, `number` for a stepped range. */
export type OwnedSettingValueOf<Id extends OwnedSettingId> = (typeof OWNED_SETTING_DECLARATIONS)[Id]["allowedValues"][number];

/** The declarations in declaration order, for resolution, persistence, and the settings screen. */
export const OWNED_UI_SETTING_DECLARATIONS: readonly OwnedUiSettingDeclaration[] = Object.freeze(Object.values(OWNED_SETTING_DECLARATIONS));

export function isOwnedSettingId(id: string): id is OwnedSettingId {
  return Object.hasOwn(OWNED_SETTING_DECLARATIONS, id);
}

export function assertOwnedUiSettingDeclarations(declarations: readonly OwnedUiSettingDeclaration[]): void {
  const seen = new Set<string>();
  for (const declaration of declarations) {
    if (!ID_PATTERN.test(declaration.id) || declaration.id.length > MAX_ID_LENGTH) {
      throw new Error(`owned UI setting id is not a bounded camelCase identifier: ${declaration.id}`);
    }
    if (seen.has(declaration.id)) throw new Error(`duplicate owned UI setting id: ${declaration.id}`);
    seen.add(declaration.id);
    if (declaration.label !== undefined && declaration.label.trim().length === 0) {
      throw new Error(`owned UI setting has an empty label: ${declaration.id}`);
    }
    if (declaration.section !== undefined
      && (declaration.section.id.trim().length === 0 || declaration.section.title.trim().length === 0)) {
      throw new Error(`owned UI setting has an invalid section: ${declaration.id}`);
    }
    if (declaration.description.trim().length === 0) {
      throw new Error(`owned UI setting has no description: ${declaration.id}`);
    }
    if (declaration.allowedValues.length === 0) {
      throw new Error(`owned UI setting declares no allowed values: ${declaration.id}`);
    }
    const types = new Set(declaration.allowedValues.map(value => typeof value));
    if (types.size !== 1) {
      throw new Error(`owned UI setting mixes allowed value types: ${declaration.id}`);
    }
    if (!declaration.allowedValues.includes(declaration.defaultValue)) {
      throw new Error(`owned UI setting default is not an allowed value: ${declaration.id}`);
    }
  }
}

export function findOwnedUiSettingDeclaration(
  declarations: readonly OwnedUiSettingDeclaration[],
  id: string,
): OwnedUiSettingDeclaration | null {
  return declarations.find(declaration => declaration.id === id) ?? null;
}
