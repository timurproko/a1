import { describe, expect, it } from "vitest";
import {
  OWNED_UI_SETTINGS_MIGRATIONS,
  OWNED_UI_SETTINGS_VERSION,
  OWNED_UI_SETTING_DECLARATIONS,
  assertOwnedUiSettingDeclarations,
  assertOwnedUiSettingsMigrations,
  findOwnedUiSettingDeclaration,
  migrationsFrom,
  type OwnedUiSettingDeclaration,
  type OwnedUiSettingsMigration,
} from "../../../src/ui/settings/index.js";

describe("owned UI setting declarations", () => {
  it("declares every setting with a default inside its own allowed values", () => {
    expect(() => assertOwnedUiSettingDeclarations(OWNED_UI_SETTING_DECLARATIONS)).not.toThrow();
    expect(OWNED_UI_SETTING_DECLARATIONS.length).toBeGreaterThan(0);
    for (const declaration of OWNED_UI_SETTING_DECLARATIONS) {
      expect(declaration.allowedValues).toContain(declaration.defaultValue);
      expect(declaration.description.trim()).not.toHaveLength(0);
    }
  });

  it("rejects a default outside the allowed values", () => {
    const broken: OwnedUiSettingDeclaration = {
      id: "brokenSetting",
      description: "Default is not allowed.",
      application: "live",
      defaultValue: "nope",
      allowedValues: ["yes", "no"],
    };
    expect(() => assertOwnedUiSettingDeclarations([broken])).toThrow(/default is not an allowed value/);
  });

  it("rejects duplicate ids, empty allowed values, and mixed value types", () => {
    const one: OwnedUiSettingDeclaration = {
      id: "sameId",
      description: "First.",
      application: "live",
      defaultValue: "a",
      allowedValues: ["a"],
    };
    expect(() => assertOwnedUiSettingDeclarations([one, { ...one, description: "Second." }]))
      .toThrow(/duplicate owned UI setting id/);
    expect(() => assertOwnedUiSettingDeclarations([{ ...one, allowedValues: [] }]))
      .toThrow(/declares no allowed values/);
    expect(() => assertOwnedUiSettingDeclarations([{ ...one, allowedValues: ["a", 1] }]))
      .toThrow(/mixes allowed value types/);
  });

  it("rejects an id that is not a bounded camelCase identifier", () => {
    const base: OwnedUiSettingDeclaration = {
      id: "ok",
      description: "Fine.",
      application: "restart",
      defaultValue: true,
      allowedValues: [true, false],
    };
    for (const id of ["Not-Camel", "with space", "UPPER", "trailing-", "a".repeat(65)]) {
      expect(() => assertOwnedUiSettingDeclarations([{ ...base, id }])).toThrow(/camelCase identifier/);
    }
  });

  it("finds a declaration by id and reports an unknown id as null", () => {
    const first = OWNED_UI_SETTING_DECLARATIONS[0];
    expect(first).toBeDefined();
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, first!.id)).toBe(first);
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "absentSetting")).toBeNull();
  });
});

describe("owned UI settings migrations", () => {
  it("declares an ordered, contiguous list ending at the current version", () => {
    expect(() => assertOwnedUiSettingsMigrations(OWNED_UI_SETTINGS_MIGRATIONS)).not.toThrow();
    expect(OWNED_UI_SETTINGS_MIGRATIONS).toHaveLength(OWNED_UI_SETTINGS_VERSION - 1);
  });

  it("rejects a list with a gap or a wrong end version", () => {
    const migration = (to: number): OwnedUiSettingsMigration => ({
      to,
      description: `to ${to}`,
      migrate: values => ({ ...values }),
    });
    expect(() => assertOwnedUiSettingsMigrations([migration(2), migration(4)], 4)).toThrow(/expected 3/);
    expect(() => assertOwnedUiSettingsMigrations([migration(2)], 3)).toThrow(/expected 3/);
    expect(() => assertOwnedUiSettingsMigrations([{ ...migration(2), description: "  " }], 2))
      .toThrow(/has no description/);
  });

  it("selects only the migrations newer than the stored version", () => {
    const migrations = [2, 3, 4].map(to => ({ to, description: `to ${to}`, migrate: (v: Readonly<Record<string, unknown>>) => ({ ...v }) }));
    expect(migrationsFrom(migrations, 1).map(entry => entry.to)).toEqual([2, 3, 4]);
    expect(migrationsFrom(migrations, 3).map(entry => entry.to)).toEqual([4]);
    expect(migrationsFrom(migrations, 4)).toHaveLength(0);
  });
});
