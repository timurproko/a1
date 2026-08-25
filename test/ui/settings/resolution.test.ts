import { describe, expect, it } from "vitest";
import {
  documentFrom,
  parseOwnedUiSettingsDocument,
  resolveOwnedUiSettings,
  settingValue,
  type OwnedUiSettingDeclaration,
  type OwnedUiSettingsMigration,
} from "../../../src/ui/settings/index.js";

const DECLARATIONS: readonly OwnedUiSettingDeclaration[] = [
  {
    id: "density",
    description: "Vertical density.",
    application: "live",
    defaultValue: "comfortable",
    allowedValues: ["comfortable", "compact"],
  },
  {
    id: "confirmExit",
    description: "Ask before exiting.",
    application: "restart",
    defaultValue: false,
    allowedValues: [true, false],
  },
];

function resolve(document: unknown, migrations: readonly OwnedUiSettingsMigration[] = [], currentVersion = 1) {
  return resolveOwnedUiSettings({
    declarations: DECLARATIONS,
    migrations,
    document: document as never,
    currentVersion,
  });
}

describe("resolving owned UI settings", () => {
  it("resolves every setting to its default when no document exists", () => {
    const resolution = resolve(null);
    expect(resolution.settings.map(setting => setting.source)).toEqual(["default", "default"]);
    expect(settingValue(resolution, "density")).toBe("comfortable");
    expect(settingValue(resolution, "confirmExit")).toBe(false);
    expect(resolution.notices).toHaveLength(0);
  });

  it("applies supplied values and defaults the omitted ones", () => {
    const resolution = resolve({ version: 1, values: { density: "compact" } });
    expect(settingValue(resolution, "density")).toBe("compact");
    expect(settingValue(resolution, "confirmExit")).toBe(false);
    expect(resolution.settings.find(setting => setting.declaration.id === "density")?.source).toBe("stored");
    expect(resolution.settings.find(setting => setting.declaration.id === "confirmExit")?.source).toBe("default");
  });

  it("rejects an out-of-range value, keeps the rest, and reports once", () => {
    const resolution = resolve({ version: 1, values: { density: "enormous", confirmExit: true } });
    expect(settingValue(resolution, "density")).toBe("comfortable");
    expect(settingValue(resolution, "confirmExit")).toBe(true);
    const rejected = resolution.notices.filter(notice => notice.code === "value-rejected");
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.settingId).toBe("density");
  });

  it("rejects a value of the wrong type", () => {
    const resolution = resolve({ version: 1, values: { confirmExit: "yes" } });
    expect(settingValue(resolution, "confirmExit")).toBe(false);
    expect(resolution.notices.map(notice => notice.code)).toContain("value-rejected");
  });

  it("preserves an unknown key without exposing it as a setting", () => {
    const resolution = resolve({ version: 1, values: { density: "compact", futureSetting: { nested: 1 } } });
    expect(resolution.preserved).toEqual({ futureSetting: { nested: 1 } });
    expect(resolution.settings.map(setting => setting.declaration.id)).toEqual(["density", "confirmExit"]);
    expect(documentFrom(resolution).values).toEqual({ futureSetting: { nested: 1 }, density: "compact" });
  });

  it("defaults everything and preserves the document when the stored version is newer", () => {
    const resolution = resolve({ version: 9, values: { density: "compact" } });
    expect(settingValue(resolution, "density")).toBe("comfortable");
    expect(resolution.preserved).toEqual({ density: "compact" });
    expect(resolution.notices.map(notice => notice.code)).toEqual(["version-newer-than-supported"]);
    expect(resolution.migrated).toBe(false);
  });

  it("migrates a renamed setting forward and keeps the user's value", () => {
    const migration: OwnedUiSettingsMigration = {
      to: 2,
      description: "rename spacing to density",
      migrate: values => {
        const { spacing, ...rest } = values as { spacing?: unknown };
        return spacing === undefined ? { ...rest } : { ...rest, density: spacing };
      },
    };
    const resolution = resolve({ version: 1, values: { spacing: "compact" } }, [migration], 2);
    expect(settingValue(resolution, "density")).toBe("compact");
    expect(resolution.migrated).toBe(true);
    expect(resolution.preserved).toEqual({});
    expect(resolution.version).toBe(2);
  });

  it("defaults everything when a required migration is missing", () => {
    const resolution = resolve({ version: 1, values: { density: "compact" } }, [], 3);
    expect(settingValue(resolution, "density")).toBe("comfortable");
    expect(resolution.notices.map(notice => notice.code)).toEqual(["migration-unavailable"]);
    expect(resolution.preserved).toEqual({ density: "compact" });
  });

  it("defaults everything when a migration throws", () => {
    const failing: OwnedUiSettingsMigration = {
      to: 2,
      description: "always fails",
      migrate: () => { throw new Error("synthetic migration failure"); },
    };
    const resolution = resolve({ version: 1, values: { density: "compact" } }, [failing], 2);
    expect(settingValue(resolution, "density")).toBe("comfortable");
    expect(resolution.notices[0]?.code).toBe("migration-unavailable");
    expect(resolution.notices[0]?.detail).toContain("synthetic migration failure");
  });

  it("reports an unreadable document alongside resolved defaults", () => {
    const resolution = resolveOwnedUiSettings({
      declarations: DECLARATIONS,
      migrations: [],
      document: null,
      unreadableDetail: "settings.json is not valid JSON",
      currentVersion: 1,
    });
    expect(resolution.notices.map(notice => notice.code)).toEqual(["document-unreadable"]);
    expect(resolution.settings).toHaveLength(2);
  });

  it("never throws and always resolves a complete set for arbitrary input", () => {
    const inputs: unknown[] = [
      null,
      {},
      { version: 1 },
      { version: 1, values: null },
      { version: 1, values: [] },
      { version: 0, values: {} },
      { version: 1.5, values: {} },
      { version: "1", values: {} },
      { version: 1, values: { density: null } },
      { version: 1, values: { density: [] } },
      { version: 1, values: { density: { nested: true } } },
      { version: 1, values: { density: Number.NaN } },
      { version: 1, values: { __proto__: { polluted: true } } },
    ];
    for (const input of inputs) {
      const resolution = resolve(input);
      expect(resolution.settings.map(setting => setting.declaration.id)).toEqual(["density", "confirmExit"]);
      for (const setting of resolution.settings) {
        expect(setting.declaration.allowedValues).toContain(setting.value);
      }
    }
  });
});

describe("parsing an owned UI settings document", () => {
  it("accepts a well-formed document", () => {
    expect(parseOwnedUiSettingsDocument('{"version":1,"values":{"density":"compact"}}'))
      .toEqual({ version: 1, values: { density: "compact" } });
  });

  it("rejects malformed, non-object, and badly versioned input", () => {
    for (const raw of ["", "not json", "[]", "null", '"text"', "42", '{"values":{}}', '{"version":0,"values":{}}', '{"version":1,"values":[]}']) {
      expect(parseOwnedUiSettingsDocument(raw)).toBeNull();
    }
  });
});
