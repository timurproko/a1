import {
  OWNED_UI_SETTINGS_VERSION,
  findOwnedUiSettingDeclaration,
  type OwnedUiSettingDeclaration,
  type OwnedUiSettingValue,
} from "./declarations.js";
import { migrationsFrom, type OwnedUiSettingsMigration } from "./migrations.js";

export type OwnedUiSettingSource = "default" | "stored";

export interface OwnedUiResolvedSetting {
  readonly declaration: OwnedUiSettingDeclaration;
  readonly value: OwnedUiSettingValue;
  readonly source: OwnedUiSettingSource;
}

export type OwnedUiSettingsNoticeCode =
  | "document-unreadable"
  | "version-newer-than-supported"
  | "migration-unavailable"
  | "value-rejected";

export interface OwnedUiSettingsNotice {
  readonly code: OwnedUiSettingsNoticeCode;
  /** Setting id for a rejected value; null for document-level notices. */
  readonly settingId: string | null;
  readonly detail: string;
}

export interface OwnedUiSettingsResolution {
  readonly version: number;
  readonly settings: readonly OwnedUiResolvedSetting[];
  /** Keys that match no declaration, preserved verbatim so a downgrade cannot destroy them. */
  readonly preserved: Readonly<Record<string, unknown>>;
  readonly notices: readonly OwnedUiSettingsNotice[];
  /** True when the resolved form differs from what was stored and should be written on the next change. */
  readonly migrated: boolean;
}

export interface OwnedUiSettingsDocument {
  readonly version: number;
  readonly values: Readonly<Record<string, unknown>>;
}

export function parseOwnedUiSettingsDocument(raw: string): OwnedUiSettingsDocument | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  const candidate = parsed as Record<string, unknown>;
  const version = candidate["version"];
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) return null;
  const values = candidate["values"];
  if (typeof values !== "object" || values === null || Array.isArray(values)) return null;
  return { version, values: values as Record<string, unknown> };
}

export interface ResolveOwnedUiSettingsInput {
  readonly declarations: readonly OwnedUiSettingDeclaration[];
  readonly migrations: readonly OwnedUiSettingsMigration[];
  /** Parsed document, or null when the file is absent, unreadable, or unparseable. */
  readonly document: OwnedUiSettingsDocument | null;
  /** Set when the document existed but could not be read or parsed. */
  readonly unreadableDetail?: string;
  readonly currentVersion?: number;
}

/**
 * Pure resolution: declarations plus a parsed document produce a complete value
 * set, the keys to preserve, and every notice worth reporting. Never throws.
 */
export function resolveOwnedUiSettings(input: ResolveOwnedUiSettingsInput): OwnedUiSettingsResolution {
  const currentVersion = input.currentVersion ?? OWNED_UI_SETTINGS_VERSION;
  const notices: OwnedUiSettingsNotice[] = [];

  if (input.unreadableDetail !== undefined) {
    notices.push({ code: "document-unreadable", settingId: null, detail: input.unreadableDetail });
  }

  if (input.document === null) {
    return {
      version: currentVersion,
      settings: defaultsFor(input.declarations),
      preserved: Object.freeze({}),
      notices: Object.freeze(notices),
      migrated: false,
    };
  }

  if (input.document.version > currentVersion) {
    notices.push({
      code: "version-newer-than-supported",
      settingId: null,
      detail: `stored version ${input.document.version} is newer than supported version ${currentVersion}`,
    });
    return {
      version: currentVersion,
      settings: defaultsFor(input.declarations),
      preserved: Object.freeze({ ...input.document.values }),
      notices: Object.freeze(notices),
      migrated: false,
    };
  }

  const pending = migrationsFrom(input.migrations, input.document.version);
  const expected = currentVersion - input.document.version;
  if (pending.length !== expected) {
    notices.push({
      code: "migration-unavailable",
      settingId: null,
      detail: `no declared migration path from stored version ${input.document.version} to ${currentVersion}`,
    });
    return {
      version: currentVersion,
      settings: defaultsFor(input.declarations),
      preserved: Object.freeze({ ...input.document.values }),
      notices: Object.freeze(notices),
      migrated: false,
    };
  }

  let values: Record<string, unknown> = { ...input.document.values };
  for (const migration of pending) {
    try {
      values = { ...migration.migrate(Object.freeze({ ...values })) };
    } catch (error) {
      notices.push({
        code: "migration-unavailable",
        settingId: null,
        detail: `migration to version ${migration.to} failed: ${describe(error)}`,
      });
      return {
        version: currentVersion,
        settings: defaultsFor(input.declarations),
        preserved: Object.freeze({ ...input.document.values }),
        notices: Object.freeze(notices),
        migrated: false,
      };
    }
  }

  const settings: OwnedUiResolvedSetting[] = [];
  for (const declaration of input.declarations) {
    if (!Object.hasOwn(values, declaration.id)) {
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
    if (findOwnedUiSettingDeclaration(input.declarations, key) === null) preserved[key] = value;
  }

  return {
    version: currentVersion,
    settings: Object.freeze(settings),
    preserved: Object.freeze(preserved),
    notices: Object.freeze(notices),
    migrated: pending.length > 0,
  };
}

export function settingValue(
  resolution: OwnedUiSettingsResolution,
  id: string,
): OwnedUiSettingValue | null {
  return resolution.settings.find(setting => setting.declaration.id === id)?.value ?? null;
}

export function documentFrom(resolution: OwnedUiSettingsResolution): OwnedUiSettingsDocument {
  const values: Record<string, unknown> = { ...resolution.preserved };
  for (const setting of resolution.settings) {
    if (setting.source === "stored") values[setting.declaration.id] = setting.value;
  }
  return { version: resolution.version, values };
}

function defaultsFor(declarations: readonly OwnedUiSettingDeclaration[]): readonly OwnedUiResolvedSetting[] {
  return Object.freeze(declarations.map(declaration => ({
    declaration,
    value: declaration.defaultValue,
    source: "default" as const,
  })));
}

function isAllowed(
  declaration: OwnedUiSettingDeclaration,
  value: unknown,
): value is OwnedUiSettingValue {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return false;
  return declaration.allowedValues.includes(value);
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
