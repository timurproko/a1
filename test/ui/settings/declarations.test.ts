import { describe, expect, it } from "vitest";
import {
  OWNED_SETTING_DECLARATIONS,
  OWNED_UI_SETTINGS_MIGRATIONS,
  OWNED_UI_SETTINGS_VERSION,
  OWNED_UI_SETTING_DECLARATIONS,
  assertOwnedUiSettingDeclarations,
  assertOwnedUiSettingsMigrations,
  findOwnedUiSettingDeclaration,
  isOwnedSettingId,
  migrationsFrom,
  resolveOwnedUiSettings,
  type OwnedUiSettingDeclaration,
  type OwnedUiSettingsMigration,
} from "../../../src/ui/settings/index.js";

describe("owned UI setting declarations", () => {
  it("is one table keyed by id, from which the ordered list and the id guard derive", () => {
    // Invariant: the key and the declared id agree, so a typed getter and the stored key name the same setting.
    for (const [key, declaration] of Object.entries(OWNED_SETTING_DECLARATIONS)) expect(declaration.id).toBe(key);
    expect(OWNED_UI_SETTING_DECLARATIONS).toEqual(Object.values(OWNED_SETTING_DECLARATIONS));
    expect(isOwnedSettingId("scrollbarSpeed")).toBe(true);
    expect(isOwnedSettingId("density")).toBe(false);
    expect(isOwnedSettingId("toString")).toBe(false);
  });

  it("declares every setting with a default inside its own allowed values", () => {
    expect(() => assertOwnedUiSettingDeclarations(OWNED_UI_SETTING_DECLARATIONS)).not.toThrow();
    expect(OWNED_UI_SETTING_DECLARATIONS.length).toBeGreaterThan(0);
    for (const declaration of OWNED_UI_SETTING_DECLARATIONS) {
      expect(declaration.allowedValues).toContain(declaration.defaultValue);
      expect(declaration.description.trim()).not.toHaveLength(0);
    }
  });

  it("declares the grouped live viewport appearance, style, and speed controls", () => {
    expect(OWNED_UI_SETTING_DECLARATIONS.map(setting => setting.id)).toEqual([
      "quitAnimation",
      "scrollbarAppearance",
      "scrollbarStyle",
      "scrollbarSpeed",
      "promptHistoryEnabled",
      "promptHistoryMaxItems",
      "promptSuggestions",
      "skillsPresentation",
    ]);
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "skillsPresentation")).toMatchObject({
      label: "Skills",
      section: { id: "agent", title: "Agent" },
      application: "live",
      defaultValue: "collapse",
      allowedValues: ["collapse", "expand"],
    });
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "skillsPresentation")?.description)
      .toMatch(/collapse.*\/skills.*dialog.*\/skills:.*expand.*\/skill:<name>/is);
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "promptSuggestions")).toMatchObject({
      label: "Prompt suggestions",
      section: { id: "agent", title: "Agent" },
      application: "live",
      defaultValue: true,
      allowedValues: [true, false],
    });
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "promptSuggestions")?.description)
      .toContain("additional background request using the selected model");
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "scrollbarAppearance")).toMatchObject({
      label: "Scrollbar mode",
      section: { id: "scroll", title: "Scroll" },
      application: "live",
      defaultValue: "auto",
      allowedValues: ["auto", "always", "hidden"],
    });
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "scrollbarStyle")).toMatchObject({
      label: "Scrollbar style",
      section: { id: "scroll", title: "Scroll" },
      application: "live",
      defaultValue: "thin",
      allowedValues: ["thin", "thick"],
    });
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "scrollbarSpeed")).toMatchObject({
      label: "Speed",
      section: { id: "scroll", title: "Scroll" },
      application: "live",
      defaultValue: "normal",
      allowedValues: ["normal", "fast", "high"],
    });
  });

  it("declares next-start persistent history controls without Pi-owned settings", () => {
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "promptHistoryEnabled")).toMatchObject({
      label: "Persistent history", section: { id: "history", title: "History" }, application: "restart", defaultValue: true, allowedValues: [true, false],
    });
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "promptHistoryMaxItems")).toMatchObject({
      label: "History limit", section: { id: "history", title: "History" }, application: "restart", defaultValue: 100, allowedValues: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    });
  });

  it("declares the leading Generic quit-animation toggle as the only quit control", () => {
    expect(OWNED_UI_SETTING_DECLARATIONS[0]).toMatchObject({
      id: "quitAnimation", label: "Quit animation", section: { id: "generic", title: "Generic" },
      application: "live", defaultValue: true, allowedValues: [true, false],
    });
    expect(OWNED_UI_SETTING_DECLARATIONS[0]?.description).toContain("fall effect");
    expect(OWNED_UI_SETTING_DECLARATIONS[0]?.description).toContain("Off returns to the terminal immediately");
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "quitEffect")).toBeNull();
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "quitEffectDurationMs")).toBeNull();
    expect(OWNED_UI_SETTING_DECLARATIONS.some(setting => setting.section?.id === "quit")).toBe(false);
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

  it("migrates the former speed and appearance names", () => {
    expect(OWNED_UI_SETTINGS_MIGRATIONS).toHaveLength(7);
    expect(OWNED_UI_SETTINGS_MIGRATIONS[0]?.migrate({ scrollbarSpeed: "high", future: true }))
      .toEqual({ scrollbarSpeed: "fast", future: true });
    expect(OWNED_UI_SETTINGS_MIGRATIONS[1]?.migrate({ scrollbarAppearance: "hover", future: true }))
      .toEqual({ scrollbarAppearance: "auto", future: true });
    expect(OWNED_UI_SETTINGS_MIGRATIONS[1]?.migrate({ scrollbarAppearance: "always" }))
      .toEqual({ scrollbarAppearance: "always" });
    expect(OWNED_UI_SETTINGS_MIGRATIONS[2]?.migrate({ future: true }))
      .toEqual({ future: true });
    expect(OWNED_UI_SETTINGS_MIGRATIONS[3]?.migrate({ scrollbarSpeed: "fast", promptSuggestions: false }))
      .toEqual({ scrollbarSpeed: "fast", promptSuggestions: false });
  });

  it("moves a disabled quit effect into the exit-animation toggle", () => {
    expect(OWNED_UI_SETTINGS_MIGRATIONS[4]?.migrate({ quitEffect: "off", quitEffectDurationMs: 500, future: true }))
      .toEqual({ quitEffectDurationMs: 500, future: true, quitAnimation: false });
    expect(OWNED_UI_SETTINGS_MIGRATIONS[4]?.migrate({ quitEffect: "waves", quitAnimation: false }))
      .toEqual({ quitEffect: "waves", quitAnimation: false });
    expect(OWNED_UI_SETTINGS_MIGRATIONS[4]?.migrate({ future: true }))
      .toEqual({ future: true });
    const resolved = resolveOwnedUiSettings({
      declarations: OWNED_UI_SETTING_DECLARATIONS, migrations: OWNED_UI_SETTINGS_MIGRATIONS,
      document: { version: 5, values: { quitEffect: "off" } },
    });
    expect(resolved).toMatchObject({ version: 8, migrated: true, notices: [] });
    expect(resolved.settings.find(setting => setting.declaration.id === "quitAnimation")).toMatchObject({ value: false, source: "stored" });
    expect(resolved.settings.some(setting => setting.declaration.id === "quitEffect")).toBe(false);
  });

  it("drops the retired quit effect and duration keys", () => {
    expect(OWNED_UI_SETTINGS_MIGRATIONS[5]?.migrate({ quitEffect: "waves", quitEffectDurationMs: 500, quitAnimation: true, future: true }))
      .toEqual({ quitAnimation: true, future: true });
    expect(OWNED_UI_SETTINGS_MIGRATIONS[5]?.migrate({ quitAnimation: false, future: true }))
      .toEqual({ quitAnimation: false, future: true });
    const resolved = resolveOwnedUiSettings({
      declarations: OWNED_UI_SETTING_DECLARATIONS, migrations: OWNED_UI_SETTINGS_MIGRATIONS,
      document: { version: 6, values: { quitEffect: "dissolve", quitEffectDurationMs: 1200 } },
    });
    expect(resolved).toMatchObject({ version: 8, migrated: true, notices: [] });
    expect(resolved.preserved).toEqual({});
    expect(resolved.settings.find(setting => setting.declaration.id === "quitAnimation")).toMatchObject({ value: true, source: "default" });
  });

  it("introduces the collapsed skills presentation without rewriting stored values", () => {
    expect(OWNED_UI_SETTINGS_MIGRATIONS[6]).toMatchObject({ to: 8 });
    expect(OWNED_UI_SETTINGS_MIGRATIONS[6]?.migrate({ promptSuggestions: false, future: true }))
      .toEqual({ promptSuggestions: false, future: true });
    const resolved = resolveOwnedUiSettings({
      declarations: OWNED_UI_SETTING_DECLARATIONS, migrations: OWNED_UI_SETTINGS_MIGRATIONS,
      document: { version: 7, values: { promptSuggestions: false, quitAnimation: false } },
    });
    expect(resolved).toMatchObject({ version: 8, migrated: true, notices: [] });
    expect(resolved.settings.find(setting => setting.declaration.id === "skillsPresentation")).toMatchObject({ value: "collapse", source: "default" });
    expect(resolved.settings.find(setting => setting.declaration.id === "promptSuggestions")).toMatchObject({ value: false, source: "stored" });
    expect(resolved.settings.find(setting => setting.declaration.id === "quitAnimation")).toMatchObject({ value: false, source: "stored" });
    const invalid = resolveOwnedUiSettings({
      declarations: OWNED_UI_SETTING_DECLARATIONS, migrations: OWNED_UI_SETTINGS_MIGRATIONS,
      document: { version: 8, values: { skillsPresentation: "hidden" } },
    });
    expect(invalid.settings.find(setting => setting.declaration.id === "skillsPresentation")).toMatchObject({ value: "collapse", source: "default" });
    expect(invalid.notices.length).toBeGreaterThan(0);
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
