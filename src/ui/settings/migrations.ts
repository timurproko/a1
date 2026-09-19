import { OWNED_UI_SETTINGS_VERSION } from "./declarations.js";

export interface OwnedUiSettingsMigration {
  /** Version this migration produces. A migration from N-1 declares `to: N`. */
  readonly to: number;
  readonly description: string;
  migrate(values: Readonly<Record<string, unknown>>): Record<string, unknown>;
}

/**
 * Ordered, contiguous migrations ending at OWNED_UI_SETTINGS_VERSION. Version 1
 * is the first stored shape.
 */
export const OWNED_UI_SETTINGS_MIGRATIONS: readonly OwnedUiSettingsMigration[] = Object.freeze([
  Object.freeze({
    to: 2,
    description: "Rename scrollbar speed high to fast.",
    migrate(values: Readonly<Record<string, unknown>>): Record<string, unknown> {
      return values.scrollbarSpeed === "high"
        ? { ...values, scrollbarSpeed: "fast" }
        : { ...values };
    },
  }),
  Object.freeze({
    to: 3,
    description: "Match Pi's auto scrollbar appearance name and ordering.",
    migrate(values: Readonly<Record<string, unknown>>): Record<string, unknown> {
      return values.scrollbarAppearance === "hover"
        ? { ...values, scrollbarAppearance: "auto" }
        : { ...values };
    },
  }),
  Object.freeze({
    to: 4,
    description: "Introduce contextual prompt suggestions with an enabled default.",
    migrate(values: Readonly<Record<string, unknown>>): Record<string, unknown> {
      return { ...values };
    },
  }),
  Object.freeze({
    to: 5,
    description: "Introduce the quit outro effect and duration with prototype defaults.",
    migrate(values: Readonly<Record<string, unknown>>): Record<string, unknown> {
      return { ...values };
    },
  }),
  Object.freeze({
    to: 6,
    description: "Move the disabled quit effect into the exit-animation toggle.",
    migrate(values: Readonly<Record<string, unknown>>): Record<string, unknown> {
      // Invariant: a profile that chose off keeps quitting without an animation; the
      // effect it stored is no longer a choice, so it resolves to the default.
      if (values.quitEffect !== "off") return { ...values };
      const migrated: Record<string, unknown> = { ...values, quitAnimation: false };
      delete migrated.quitEffect;
      return migrated;
    },
  }),
  Object.freeze({
    to: 7,
    description: "Drop the quit effect and duration; the outro always plays fall for 800 ms.",
    migrate(values: Readonly<Record<string, unknown>>): Record<string, unknown> {
      // Invariant: the manager keeps unknown keys, so the retired ids are removed here rather than lingering.
      const migrated: Record<string, unknown> = { ...values };
      delete migrated.quitEffect;
      delete migrated.quitEffectDurationMs;
      return migrated;
    },
  }),
  Object.freeze({
    to: 8,
    description: "Introduce the collapsed skills presentation with the collapse default.",
    migrate(values: Readonly<Record<string, unknown>>): Record<string, unknown> {
      return { ...values };
    },
  }),
]);

export function assertOwnedUiSettingsMigrations(
  migrations: readonly OwnedUiSettingsMigration[],
  currentVersion: number = OWNED_UI_SETTINGS_VERSION,
): void {
  const firstProduced = currentVersion - migrations.length + 1;
  if (migrations.length > 0 && firstProduced < 2) {
    throw new Error("owned UI settings migrations cannot produce a version below 2");
  }
  migrations.forEach((migration, index) => {
    const expected = firstProduced + index;
    if (migration.to !== expected) {
      throw new Error(`owned UI settings migration ${index} produces version ${migration.to}, expected ${expected}`);
    }
    if (migration.description.trim().length === 0) {
      throw new Error(`owned UI settings migration to version ${migration.to} has no description`);
    }
  });
  const last = migrations.at(-1);
  if (last && last.to !== currentVersion) {
    throw new Error(`owned UI settings migrations end at version ${last.to}, expected ${currentVersion}`);
  }
}

export function migrationsFrom(
  migrations: readonly OwnedUiSettingsMigration[],
  storedVersion: number,
): readonly OwnedUiSettingsMigration[] {
  return migrations.filter(migration => migration.to > storedVersion);
}
