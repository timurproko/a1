import {
  findOwnedUiSettingDeclaration,
  type OwnedUiSettingDeclaration,
  type OwnedUiSettingValue,
} from "./declarations.js";

export type OwnedUiSettingSource = "default" | "stored";

export interface OwnedUiResolvedSetting {
  readonly declaration: OwnedUiSettingDeclaration;
  readonly value: OwnedUiSettingValue;
  readonly source: OwnedUiSettingSource;
}

export type OwnedUiSettingsNoticeCode = "document-unreadable" | "value-rejected";

export interface OwnedUiSettingsNotice {
  readonly code: OwnedUiSettingsNoticeCode;
  /** Setting id for a rejected value; null for document-level notices. */
  readonly settingId: string | null;
  readonly detail: string;
}

export interface OwnedUiSettingsResolution {
  readonly settings: readonly OwnedUiResolvedSetting[];
  /** Keys that match no declaration, preserved verbatim so a downgrade cannot destroy them. */
  readonly preserved: Readonly<Record<string, unknown>>;
  readonly notices: readonly OwnedUiSettingsNotice[];
}

export interface ResolveOwnedUiSettingsInput {
  readonly declarations: readonly OwnedUiSettingDeclaration[];
  /** Stored values, or null when the namespace is absent, unreadable, or unparseable. */
  readonly values: Readonly<Record<string, unknown>> | null;
  /** Set when the stored values existed but could not be read or parsed. */
  readonly unreadableDetail?: string;
}

/**
 * Pure resolution: declarations plus stored values produce a complete value set, the keys to
 * preserve, and every notice worth reporting. Never throws.
 */
export function resolveOwnedUiSettings(input: ResolveOwnedUiSettingsInput): OwnedUiSettingsResolution {
  const notices: OwnedUiSettingsNotice[] = [];
  if (input.unreadableDetail !== undefined) {
    notices.push({ code: "document-unreadable", settingId: null, detail: input.unreadableDetail });
  }
  const values = input.values ?? {};
  const settings: OwnedUiResolvedSetting[] = [];
  for (const declaration of input.declarations) {
    if (declaration.storage === "session" || !Object.hasOwn(values, declaration.id)) {
      settings.push({ declaration, value: declaration.defaultValue, source: "default" });
      continue;
    }
    const stored = values[declaration.id];
    if (isAllowed(declaration, stored)) {
      settings.push({ declaration, value: stored, source: "stored" });
      continue;
    }
    notices.push({
      code: "value-rejected",
      settingId: declaration.id,
      detail: `stored value ${JSON.stringify(stored) ?? "undefined"} is not an allowed value`,
    });
    settings.push({ declaration, value: declaration.defaultValue, source: "default" });
  }

  const preserved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    const declaration = findOwnedUiSettingDeclaration(input.declarations, key);
    if (declaration === null || declaration.storage === "session") preserved[key] = value;
  }

  return {
    settings: Object.freeze(settings),
    preserved: Object.freeze(preserved),
    notices: Object.freeze(notices),
  };
}

export function settingValue(
  resolution: OwnedUiSettingsResolution,
  id: string,
): OwnedUiSettingValue | null {
  return resolution.settings.find(setting => setting.declaration.id === id)?.value ?? null;
}

function isAllowed(
  declaration: OwnedUiSettingDeclaration,
  value: unknown,
): value is OwnedUiSettingValue {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return false;
  return declaration.allowedValues.includes(value);
}
