import type { SettingsManager } from "@earendil-works/pi-coding-agent";
import type { AgentJsonValue, AgentSettingDescriptor, AgentSettingFlag, AgentSettingsPort } from "../agent-engine-contracts/index.js";
import piSettingsMetadata from "./pi-settings-metadata.json" with { type: "json" };

type Operation = { readonly descriptor: AgentSettingDescriptor; readonly read: () => AgentJsonValue; readonly write: (value: AgentJsonValue) => void };



/**
 * How the engine presents these settings — wording, order, and the flags a
 * dialog-backed setting offers — generated from its own source by
 * `npm run update:pi-settings-metadata` and verified by a governance test, so a
 * Pi upgrade cannot silently reword or reorder what A1 shows.
 */
const PRESENTATION: {
  readonly presented: readonly string[];
  readonly order: readonly string[];
  readonly settings: Readonly<Record<string, { readonly label: string; readonly description: string; readonly opensDialog: boolean; readonly values?: readonly string[] }>>;
  readonly dialogs: Readonly<Record<string, readonly AgentSettingFlag[]>>;
  readonly bounds: Readonly<Record<string, { readonly minimum: number; readonly maximum?: number }>>;
} = piSettingsMetadata;

/**
 * The settings A1 exposes: the ones the engine presents. Kept as the engine's
 * own inventory rather than a list beside it, so a setting it adds or renames
 * shows up as a named test failure instead of quietly going missing.
 */
export const EXPOSED_SETTING_KEYS: readonly string[] = PRESENTATION.presented;

/**
 * What has drifted between the settings the engine presents and the settings A1
 * maps to its API: the ones A1 has not caught up with, and the ones it kept
 * after the engine dropped them. Either is a build failure with a name in it.
 */
export function settingsInventoryDrift(
  presented: readonly string[],
  mapped: readonly string[],
): { readonly unmapped: readonly string[]; readonly stale: readonly string[] } {
  const has = new Set(mapped);
  const engine = new Set(presented);
  return {
    unmapped: presented.filter(key => !has.has(key)),
    stale: mapped.filter(key => !engine.has(key)),
  };
}

/** What the engine offers for a setting, as the strings it words them with. */
function offered(key: string): readonly string[] {
  return PRESENTATION.settings[key]?.values ?? [];
}

/**
 * The same, read as the numbers a numeric setting stores. Only for a setting
 * whose list is its whole domain: where the engine offers a few numbers but
 * accepts any within a range, the range governs and the list is only shortcuts.
 */
function offeredNumbers(key: string): readonly number[] {
  return offered(key).map(value => Number.parseInt(value, 10)).filter(value => Number.isSafeInteger(value));
}

export class PiSettingsIntegration implements AgentSettingsPort {
  readonly capabilities = { write: true, flush: true };
  readonly #operations: ReadonlyMap<string, Operation>;
  constructor(private readonly settings: SettingsManager) {
    this.#operations = new Map(operations(settings).map(operation => [operation.descriptor.key, operation]));
    if (this.#operations.size !== EXPOSED_SETTING_KEYS.length || EXPOSED_SETTING_KEYS.some(key => !this.#operations.has(key))) {
      throw new Error("Pi settings integration does not cover every A1-exposed setting");
    }
  }
  async listSettings(): Promise<readonly AgentSettingDescriptor[]> {
    const rank = (key: string): number => {
      const at = PRESENTATION.order.indexOf(key);
      return at < 0 ? PRESENTATION.order.length : at;
    };
    return [...this.#operations.values()]
      .map(operation => {
        const key = operation.descriptor.key;
        const wording = PRESENTATION.settings[key];
        const flags = PRESENTATION.dialogs[key];
        const bounds = PRESENTATION.bounds[key];
        return {
          ...operation.descriptor,
          ...(bounds === undefined ? {} : bounds),
          ...(wording === undefined ? {} : { label: wording.label, description: wording.description }),
          ...(flags === undefined ? {} : { flags }),
        };
      })
      .sort((left, right) => rank(left.key) - rank(right.key));
  }
  async readSetting(key: string): Promise<AgentJsonValue | undefined> { return this.#operations.get(key)?.read(); }
  async writeSetting(key: string, value: AgentJsonValue): Promise<void> { this.writeSettingNow(key, value); }
  writeSettingNow(key: string, value: AgentJsonValue): void {
    const operation = this.#operations.get(key);
    if (!operation) throw new Error(`setting is unavailable: ${key}`);
    operation.write(value);
  }
  async flush(): Promise<void> { await this.settings.flush(); }
}

function operations(settings: SettingsManager): readonly Operation[] {
  return [
    bool("autoCompact", () => settings.getCompactionEnabled(), value => settings.setCompactionEnabled(value)),
    bool("showImages", () => settings.getShowImages(), value => settings.setShowImages(value)),
    numberSetting("imageWidthCells", () => settings.getImageWidthCells(), value => settings.setImageWidthCells(value), 1),
    bool("autoResizeImages", () => settings.getImageAutoResize(), value => settings.setImageAutoResize(value)),
    bool("blockImages", () => settings.getBlockImages(), value => settings.setBlockImages(value)),
    bool("enableSkillCommands", () => settings.getEnableSkillCommands(), value => settings.setEnableSkillCommands(value)),
    choice("steeringMode", offered("steeringMode"), () => settings.getSteeringMode(), value => settings.setSteeringMode(value as "all" | "one-at-a-time")),
    choice("followUpMode", offered("followUpMode"), () => settings.getFollowUpMode(), value => settings.setFollowUpMode(value as "all" | "one-at-a-time")),
    choice("transport", offered("transport"), () => settings.getTransport(), value => settings.setTransport(value as ReturnType<SettingsManager["getTransport"]>)),
    numberSetting("httpIdleTimeoutMs", () => settings.getHttpIdleTimeoutMs(), value => settings.setHttpIdleTimeoutMs(value), 0),
    // The engine reads these from the running session rather than declaring them,
    // so they arrive through the runtime provider rather than from its source.
    choice("thinkingLevel", ["off", "minimal", "low", "medium", "high", "xhigh"], () => settings.getDefaultThinkingLevel() ?? "medium", value => settings.setDefaultThinkingLevel(value as NonNullable<ReturnType<SettingsManager["getDefaultThinkingLevel"]>>)),
    stringSetting("theme", () => settings.getTheme() ?? "default", value => settings.setTheme(value)),
    bool("hideThinkingBlock", () => settings.getHideThinkingBlock(), value => settings.setHideThinkingBlock(value)),
    choice("mermaidRenderingMode", offered("mermaidRenderingMode"), () => settings.getMermaidRenderingMode(), value => settings.setMermaidRenderingMode(value as ReturnType<SettingsManager["getMermaidRenderingMode"]>)),
    bool("showCacheMissNotices", () => settings.getShowCacheMissNotices(), value => settings.setShowCacheMissNotices(value)),
    bool("collapseChangelog", () => settings.getCollapseChangelog(), value => settings.setCollapseChangelog(value)),
    bool("enableInstallTelemetry", () => settings.getEnableInstallTelemetry(), value => settings.setEnableInstallTelemetry(value)),
    bool("quietStartup", () => settings.getQuietStartup(), value => settings.setQuietStartup(value)),
    choice("defaultProjectTrust", offered("defaultProjectTrust"), () => settings.getDefaultProjectTrust(), value => settings.setDefaultProjectTrust(value as ReturnType<SettingsManager["getDefaultProjectTrust"]>)),
    choice("doubleEscapeAction", offered("doubleEscapeAction"), () => settings.getDoubleEscapeAction(), value => settings.setDoubleEscapeAction(value as ReturnType<SettingsManager["getDoubleEscapeAction"]>)),
    choice("treeFilterMode", offered("treeFilterMode"), () => settings.getTreeFilterMode(), value => settings.setTreeFilterMode(value as ReturnType<SettingsManager["getTreeFilterMode"]>)),
    bool("showHardwareCursor", () => settings.getShowHardwareCursor(), value => settings.setShowHardwareCursor(value)),
    numberSetting("editorPaddingX", () => settings.getEditorPaddingX(), value => settings.setEditorPaddingX(value), 0),
    choice("outputPad", offeredNumbers("outputPad"), () => settings.getOutputPad(), value => settings.setOutputPad(value as 0 | 1)),
    numberSetting("autocompleteMaxVisible", () => settings.getAutocompleteMaxVisible(), value => settings.setAutocompleteMaxVisible(value), 1),
    bool("clearOnShrink", () => settings.getClearOnShrink(), value => settings.setClearOnShrink(value)),
    bool("showTerminalProgress", () => settings.getShowTerminalProgress(), value => settings.setShowTerminalProgress(value)),
    choice("tuiMode", offered("tuiMode"), () => settings.getTuiMode(), value => settings.setTuiMode(value as ReturnType<SettingsManager["getTuiMode"]>)),
    choice("fullscreenExitOutput", offered("fullscreenExitOutput"), () => settings.getFullscreenExitOutput(), value => settings.setFullscreenExitOutput(value as ReturnType<SettingsManager["getFullscreenExitOutput"]>)),
    choice("fullscreenScrollbar", offered("fullscreenScrollbar"), () => settings.getFullscreenScrollbar(), value => settings.setFullscreenScrollbar(value as ReturnType<SettingsManager["getFullscreenScrollbar"]>)),
    jsonObject("warnings", () => settings.getWarnings(), value => settings.setWarnings(value as ReturnType<SettingsManager["getWarnings"]>)),
  ];
}

function bool(key: string, read: () => boolean, write: (value: boolean) => void): Operation {
  return { descriptor: { key, valueType: "boolean", writable: true }, read, write(value) { if (typeof value !== "boolean") invalid(key); write(value); } };
}
function numberSetting(key: string, read: () => number, write: (value: number) => void, minimum: number): Operation {
  const declared = PRESENTATION.bounds[key];
  const low = declared?.minimum ?? minimum;
  const high = declared?.maximum;
  return {
    descriptor: { key, valueType: "number", writable: true },
    read,
    write(value) {
      if (typeof value !== "number" || !Number.isSafeInteger(value) || value < low || (high !== undefined && value > high)) invalid(key);
      write(value);
    },
  };
}
function stringSetting(key: string, read: () => string, write: (value: string) => void): Operation {
  return { descriptor: { key, valueType: "string", writable: true }, read, write(value) { if (typeof value !== "string" || value.length === 0) invalid(key); write(value); } };
}
function jsonObject(key: string, read: () => object, write: (value: AgentJsonValue) => void): Operation {
  return { descriptor: { key, valueType: "json", writable: true }, read: () => Object.fromEntries(Object.entries(read()).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean")), write(value) { if (!value || typeof value !== "object" || Array.isArray(value)) invalid(key); write(value); } };
}
function choice(key: string, choices: readonly AgentJsonValue[], read: () => AgentJsonValue, write: (value: AgentJsonValue) => void): Operation {
  return { descriptor: { key, valueType: "enum", writable: true, choices }, read, write(value) { if (!choices.includes(value)) invalid(key); write(value); } };
}
function invalid(key: string): never { throw new TypeError(`setting value is invalid: ${key}`); }
