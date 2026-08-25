export const OWNED_UI_SETTINGS_VERSION = 1;

export type OwnedUiSettingValue = string | number | boolean;

export type OwnedUiSettingApplication = "live" | "restart";

export interface OwnedUiSettingDeclaration {
  readonly id: string;
  readonly description: string;
  readonly application: OwnedUiSettingApplication;
  readonly defaultValue: OwnedUiSettingValue;
  readonly allowedValues: readonly OwnedUiSettingValue[];
}

const MAX_ID_LENGTH = 64;
const ID_PATTERN = /^[a-z][a-z0-9]*(?:[A-Z][a-z0-9]*)*$/;

export const OWNED_UI_SETTING_DECLARATIONS: readonly OwnedUiSettingDeclaration[] = Object.freeze([
  Object.freeze({
    id: "transcriptDensity",
    description: "Vertical density of transcript content. Reserved for a later milestone; no visible effect yet.",
    application: "live",
    defaultValue: "comfortable",
    allowedValues: Object.freeze(["comfortable", "compact"]),
  }),
  Object.freeze({
    id: "scrollbarAppearance",
    description: "When the custom transcript scrollbar is visible.",
    application: "live",
    defaultValue: "hover",
    allowedValues: Object.freeze(["always", "hover", "hidden"]),
  }),
  Object.freeze({
    id: "scrollbarStyle",
    description: "Visual weight of the custom transcript scrollbar.",
    application: "live",
    defaultValue: "thin",
    allowedValues: Object.freeze(["thin", "thick"]),
  }),
  Object.freeze({
    id: "scrollbarSpeed",
    description: "Wheel distance in the custom transcript viewport: normal is 3 lines and high is 6 lines.",
    application: "live",
    defaultValue: "normal",
    allowedValues: Object.freeze(["normal", "high"]),
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
