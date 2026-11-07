import { describe, expect, it } from "vitest";
import {
  resolveOwnedUiSettings,
  settingValue,
  type OwnedUiSettingDeclaration,
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

function resolve(values: unknown) {
  return resolveOwnedUiSettings({ declarations: DECLARATIONS, values: values as never });
}

describe("resolving owned UI settings", () => {
  it("resolves every setting to its default when nothing is stored", () => {
    const resolution = resolve(null);
    expect(resolution.settings.map(setting => setting.source)).toEqual(["default", "default"]);
    expect(settingValue(resolution, "density")).toBe("comfortable");
    expect(settingValue(resolution, "confirmExit")).toBe(false);
    expect(resolution.notices).toHaveLength(0);
  });

  it("applies supplied values and defaults the omitted ones", () => {
    const resolution = resolve({ density: "compact" });
    expect(settingValue(resolution, "density")).toBe("compact");
    expect(settingValue(resolution, "confirmExit")).toBe(false);
    expect(resolution.settings.find(setting => setting.declaration.id === "density")?.source).toBe("stored");
    expect(resolution.settings.find(setting => setting.declaration.id === "confirmExit")?.source).toBe("default");
  });

  it("rejects an out-of-range value, keeps the rest, and reports once", () => {
    const resolution = resolve({ density: "enormous", confirmExit: true });
    expect(settingValue(resolution, "density")).toBe("comfortable");
    expect(settingValue(resolution, "confirmExit")).toBe(true);
    const rejected = resolution.notices.filter(notice => notice.code === "value-rejected");
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.settingId).toBe("density");
  });

  it("rejects a value of the wrong type", () => {
    const resolution = resolve({ confirmExit: "yes" });
    expect(settingValue(resolution, "confirmExit")).toBe(false);
    expect(resolution.notices.map(notice => notice.code)).toContain("value-rejected");
  });

  it("preserves an unknown key without exposing it as a setting", () => {
    const resolution = resolve({ density: "compact", futureSetting: { nested: 1 } });
    expect(resolution.preserved).toEqual({ futureSetting: { nested: 1 } });
    expect(resolution.settings.map(setting => setting.declaration.id)).toEqual(["density", "confirmExit"]);
  });

  it("reports unreadable stored values alongside resolved defaults", () => {
    const resolution = resolveOwnedUiSettings({
      declarations: DECLARATIONS,
      values: null,
      unreadableDetail: "settings.json is not valid JSON",
    });
    expect(resolution.notices.map(notice => notice.code)).toEqual(["document-unreadable"]);
    expect(resolution.settings).toHaveLength(2);
  });

  it("never throws and always resolves a complete set for arbitrary values", () => {
    const inputs: unknown[] = [
      null,
      {},
      { density: null },
      { density: [] },
      { density: { nested: true } },
      { density: Number.NaN },
      { __proto__: { polluted: true } },
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
