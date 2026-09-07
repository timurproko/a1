export const OWNED_UI_SETTINGS_VERSION = 4;

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

const SCROLL_SECTION = Object.freeze({ id: "scroll", title: "Scroll" });

export const OWNED_UI_SETTING_DECLARATIONS: readonly OwnedUiSettingDeclaration[] = Object.freeze([
  Object.freeze({
    id: "scrollbarAppearance",
    label: "Scrollbar mode",
    section: SCROLL_SECTION,
    description: "When the session transcript scrollbar is visible.",
    application: "live",
    defaultValue: "auto",
    allowedValues: Object.freeze(["auto", "always", "hidden"]),
  }),
  Object.freeze({
    id: "scrollbarStyle",
    label: "Scrollbar style",
    section: SCROLL_SECTION,
    description: "Visual weight of the session transcript scrollbar.",
    application: "live",
    defaultValue: "thin",
    allowedValues: Object.freeze(["thin", "thick"]),
  }),
  Object.freeze({
    id: "scrollbarSpeed",
    label: "Speed",
    section: SCROLL_SECTION,
    description: "Distance moved by each session transcript wheel event.",
    application: "live",
    defaultValue: "normal",
    allowedValues: Object.freeze(["normal", "fast", "high"]),
  }),
  Object.freeze({
    id: "promptSuggestions",
    label: "Prompt suggestions",
    description: "Predict likely next prompts with one additional background request using the selected model.",
    application: "live",
    defaultValue: true,
    allowedValues: Object.freeze([true, false]),
  }),
] satisfies readonly OwnedUiSettingDeclaration[]);

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
