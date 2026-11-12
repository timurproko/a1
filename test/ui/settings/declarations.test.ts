import { describe, expect, it } from "vitest";
import {
  OWNED_SETTING_DECLARATIONS,
  OWNED_UI_SETTING_DECLARATIONS,
  assertOwnedUiSettingDeclarations,
  findOwnedUiSettingDeclaration,
  isOwnedSettingId,
  type OwnedUiSettingDeclaration,
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
      "updateCheck",
      "accentColor",
      "backgroundStyle",
      "quitAnimation",
      "spinnerStyle",
      "scrollbarAppearance",
      "scrollbarStyle",
      "scrollbarSpeed",
      "promptHistoryEnabled",
      "promptHistoryScope",
      "promptHistoryMaxItems",
      "sessionAutoName",
      "sessionNameFormat",
      "promptSuggestions",
      "skillsPresentation",
      "promptImageLimit",
    ]);
    for (const retired of ["timeFormat", "tabsPosition", "tabBarPlusMenu", "tabBarRightItems", "tabBarBackgroundStyle", "tabsAutoName"]) {
      expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, retired), retired).toBeNull();
    }
    expect(OWNED_UI_SETTING_DECLARATIONS.some(setting => setting.section?.id === "tabs")).toBe(false);
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "accentColor")).toMatchObject({
      label: "Accent color",
      section: { id: "appearance", title: "Appearance" },
      application: "live",
      defaultValue: "blue",
      allowedValues: ["blue", "green", "orange", "pink", "purple", "cyan", "grey"],
    });
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "accentColor")?.description)
      .toMatch(/list markers.*tonal interface surfaces/i);
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "backgroundStyle")).toMatchObject({
      label: "Background",
      section: { id: "appearance", title: "Appearance" },
      application: "live",
      defaultValue: "transparent",
      allowedValues: ["transparent", "accent", "dark"],
    });
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "spinnerStyle")).toMatchObject({
      label: "Spinner style", section: { id: "appearance", title: "Appearance" },
      application: "live", defaultValue: "current", allowedValues: ["current", "circle", "diamond", "square", "none"],
    });
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "skillsPresentation")).toMatchObject({
      label: "Skills",
      section: { id: "agent", title: "Agent" },
      application: "live",
      defaultValue: "collapse",
      allowedValues: ["collapse", "expand"],
    });
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "skillsPresentation")?.description)
      .toMatch(/collapse.*\/skills.*dialog.*\/skills:.*expand.*\/skill:<name>/is);
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "promptImageLimit")).toMatchObject({
      label: "Prompt image limit",
      section: { id: "agent", title: "Agent" },
      application: "live",
      defaultValue: 8,
      allowedValues: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    });
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "sessionAutoName")).toMatchObject({
      section: { id: "agent", title: "Agent" }, application: "live", defaultValue: true, allowedValues: [true, false],
    });
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "sessionNameFormat")).toMatchObject({
      label: "Session name format", section: { id: "agent", title: "Agent" },
      application: "live", defaultValue: "sentence", allowedValues: ["sentence", "kebab", "title"],
    });
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "promptSuggestions")).toMatchObject({
      label: "Prompt suggestions",
      section: { id: "agent", title: "Agent" },
      application: "live",
      defaultValue: true,
      allowedValues: [true, false],
    });
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "promptSuggestions")?.description)
      .toContain("one background request, plus one bounded recovery request when needed");
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "residentTabs")).toBeNull();
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "tabsMax")).toBeNull();
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "tabsMaxConcurrentStarts")).toBeNull();
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "tabsUnresponsiveRestartSeconds")).toBeNull();
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "tabsStallNoticeSeconds")).toBeNull();
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
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "promptHistoryScope")).toMatchObject({
      label: "History scope", section: { id: "history", title: "History" }, application: "live", defaultValue: "unique", allowedValues: ["unique", "shared"],
    });
    expect(findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "promptHistoryMaxItems")).toMatchObject({
      label: "History limit", section: { id: "history", title: "History" }, application: "restart", defaultValue: 100, allowedValues: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
    });
  });

  it("declares the Appearance background and quit-animation controls after the accent", () => {
    expect(OWNED_UI_SETTING_DECLARATIONS.slice(0, 4).map(setting => setting.id)).toEqual([
      "updateCheck", "accentColor", "backgroundStyle", "quitAnimation",
    ]);
    const declaration = findOwnedUiSettingDeclaration(OWNED_UI_SETTING_DECLARATIONS, "quitAnimation");
    expect(declaration).toMatchObject({
      id: "quitAnimation", label: "Quit animation", section: { id: "appearance", title: "Appearance" },
      application: "live", defaultValue: true, allowedValues: [true, false],
    });
    expect(declaration?.description).toContain("fall effect");
    expect(declaration?.description).toContain("Off returns to the terminal immediately");
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
