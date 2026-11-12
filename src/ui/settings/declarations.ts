import { UI_ACCENT_COLORS, type OwnedUiBackgroundStyle } from "../../contracts/owned-ui/index.js";
import type { ProgressSpinnerStyle } from "../../contracts/presentation/index.js";

const UI_ACCENT_COLOR_CHOICES = UI_ACCENT_COLORS;

export type OwnedUiSettingValue = string | number | boolean;

export type OwnedUiSettingApplication = "live" | "restart";

export interface OwnedUiSettingDeclaration {
  readonly id: string;
  readonly label?: string;
  readonly section?: { readonly id: string; readonly title: string };
  readonly description: string;
  readonly application: OwnedUiSettingApplication;
  readonly defaultValue: OwnedUiSettingValue;
  readonly allowedValues: readonly OwnedUiSettingValue[];
  /**
   * Parts of a structured setting, edited through their own dialog: the value is the comma-separated
   * keys of the enabled parts in this order.
   */
  readonly flags?: readonly { readonly key: string; readonly label: string; readonly description: string }[];
}

const MAX_ID_LENGTH = 64;
const ID_PATTERN = /^[a-z][a-z0-9]*(?:[A-Z][a-z0-9]*)*$/;

const GENERIC_SECTION = Object.freeze({ id: "generic", title: "Generic" });
const APPEARANCE_SECTION = Object.freeze({ id: "appearance", title: "Appearance" });
const SCROLL_SECTION = Object.freeze({ id: "scroll", title: "Scroll" });
const AGENT_SECTION = Object.freeze({ id: "agent", title: "Agent" });

export const OWNED_SETTING_DECLARATIONS = Object.freeze({
  updateCheck: Object.freeze({
    id: "updateCheck",
    label: "Update",
    section: GENERIC_SECTION,
    description: "Auto checks the running channel every 15 minutes while open and installs verified updates silently, then shows Update installed, restart to update; the next start runs it. Manual leaves updating to you (a1 update). Applies on next start.",
    application: "restart",
    defaultValue: "auto",
    allowedValues: Object.freeze(["auto", "manual"] as const),
  }),
  accentColor: Object.freeze({
    id: "accentColor",
    label: "Accent color",
    section: APPEARANCE_SECTION,
    description: "Color used by highlighted interface controls, list markers, and tonal interface surfaces.",
    application: "live",
    defaultValue: "blue",
    allowedValues: UI_ACCENT_COLOR_CHOICES,
  }),
  backgroundStyle: Object.freeze({
    id: "backgroundStyle",
    label: "Background",
    section: APPEARANCE_SECTION,
    description: "Fullscreen canvas background: terminal transparency, a dark accent tint, or fixed neutral dark.",
    application: "live",
    defaultValue: "transparent",
    allowedValues: Object.freeze([
      "transparent", "accent", "dark",
    ] as const satisfies readonly OwnedUiBackgroundStyle[]),
  }),
  quitAnimation: Object.freeze({
    id: "quitAnimation",
    label: "Quit animation",
    section: APPEARANCE_SECTION,
    description: "Play the fall effect over the last screen when the session quits. Off returns to the terminal immediately.",
    application: "live",
    defaultValue: true,
    allowedValues: Object.freeze([true, false] as const),
  }),
  spinnerStyle: Object.freeze({
    id: "spinnerStyle",
    label: "Spinner style",
    section: APPEARANCE_SECTION,
    description: "Indicator beside working and operation progress text. Dots keeps the dot spinner; None keeps text only.",
    application: "live",
    defaultValue: "current",
    allowedValues: Object.freeze(["current", "circle", "diamond", "square", "none"] as const satisfies readonly ProgressSpinnerStyle[]),
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
    description: "Retain reusable prompts after restart. Applies on next start; disabling does not erase saved history or stop existing instances.",
    application: "restart",
    defaultValue: true,
    allowedValues: Object.freeze([true, false] as const),
  }),
  promptHistoryScope: Object.freeze({
    id: "promptHistoryScope",
    label: "History scope",
    section: Object.freeze({ id: "history", title: "History" }),
    description: "Unique shows each agent session's history; Shared shows the profile-wide history. Switches running agents without moving or erasing saved prompts.",
    application: "live",
    defaultValue: "unique",
    allowedValues: Object.freeze(["unique", "shared"] as const),
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
  sessionAutoName: Object.freeze({
    id: "sessionAutoName",
    label: "Automatic session name",
    section: AGENT_SECTION,
    description: "Name unnamed sessions from the current task and relevant discussion; regenerate on the next prompt after a worktree context change. Manual names are preserved.",
    application: "live",
    defaultValue: true,
    allowedValues: Object.freeze([true, false] as const),
  }),
  sessionNameFormat: Object.freeze({
    id: "sessionNameFormat",
    label: "Session name format",
    section: AGENT_SECTION,
    description: "Format for future automatic names: Fix API cache (default), fix-api-cache, or Fix API Cache. Existing and manual names stay unchanged.",
    application: "live",
    defaultValue: "sentence",
    allowedValues: Object.freeze(["sentence", "kebab", "title"] as const),
  }),
  promptSuggestions: Object.freeze({
    id: "promptSuggestions",
    label: "Prompt suggestions",
    section: AGENT_SECTION,
    description: "Predict likely next prompts with one background request, plus one bounded recovery request when needed, using the selected model.",
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
  promptImageLimit: Object.freeze({
    id: "promptImageLimit",
    label: "Prompt image limit",
    section: AGENT_SECTION,
    description: "Maximum image attachments in one prompt. Providers may enforce a lower limit.",
    application: "live",
    defaultValue: 8,
    allowedValues: Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] as const),
  }),
} as const satisfies Readonly<Record<string, OwnedUiSettingDeclaration>>);

export type OwnedSettingId = keyof typeof OWNED_SETTING_DECLARATIONS;

export type OwnedSettingValueOf<Id extends OwnedSettingId> = (typeof OWNED_SETTING_DECLARATIONS)[Id]["allowedValues"][number];

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
