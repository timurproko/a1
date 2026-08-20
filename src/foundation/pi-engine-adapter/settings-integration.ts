import type { SettingsManager } from "@earendil-works/pi-coding-agent";
import type { AgentJsonValue, AgentSettingDescriptor, AgentSettingsPort } from "../agent-engine-contracts/index.js";

type Operation = { readonly descriptor: AgentSettingDescriptor; readonly read: () => AgentJsonValue; readonly write: (value: AgentJsonValue) => void };

export const A1_EXPOSED_SETTING_KEYS = Object.freeze([
  "autoCompact", "showImages", "imageWidthCells", "autoResizeImages", "blockImages", "enableSkillCommands",
  "steeringMode", "followUpMode", "transport", "httpIdleTimeoutMs", "thinkingLevel", "theme", "hideThinkingBlock",
  "mermaidRenderingMode", "showCacheMissNotices", "collapseChangelog", "enableInstallTelemetry", "quietStartup",
  "defaultProjectTrust", "doubleEscapeAction", "treeFilterMode", "showHardwareCursor", "editorPaddingX", "outputPad",
  "autocompleteMaxVisible", "clearOnShrink", "showTerminalProgress", "tuiMode", "fullscreenExitOutput", "fullscreenScrollbar", "warnings",
] as const);

export class PiSettingsIntegration implements AgentSettingsPort {
  readonly capabilities = { write: true, flush: true };
  readonly #operations: ReadonlyMap<string, Operation>;
  constructor(private readonly settings: SettingsManager) {
    this.#operations = new Map(operations(settings).map(operation => [operation.descriptor.key, operation]));
    if (this.#operations.size !== A1_EXPOSED_SETTING_KEYS.length || A1_EXPOSED_SETTING_KEYS.some(key => !this.#operations.has(key))) {
      throw new Error("Pi settings integration does not cover every A1-exposed setting");
    }
  }
  async listSettings(): Promise<readonly AgentSettingDescriptor[]> { return [...this.#operations.values()].map(operation => operation.descriptor); }
  async readSetting(key: string): Promise<AgentJsonValue | undefined> { return this.#operations.get(key)?.read(); }
  async writeSetting(key: string, value: AgentJsonValue): Promise<void> {
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
    choice("steeringMode", ["all", "one-at-a-time"], () => settings.getSteeringMode(), value => settings.setSteeringMode(value as "all" | "one-at-a-time")),
    choice("followUpMode", ["all", "one-at-a-time"], () => settings.getFollowUpMode(), value => settings.setFollowUpMode(value as "all" | "one-at-a-time")),
    choice("transport", ["sse", "websocket", "websocket-cached", "auto"], () => settings.getTransport(), value => settings.setTransport(value as ReturnType<SettingsManager["getTransport"]>)),
    numberSetting("httpIdleTimeoutMs", () => settings.getHttpIdleTimeoutMs(), value => settings.setHttpIdleTimeoutMs(value), 0),
    choice("thinkingLevel", ["off", "minimal", "low", "medium", "high", "xhigh"], () => settings.getDefaultThinkingLevel() ?? "medium", value => settings.setDefaultThinkingLevel(value as NonNullable<ReturnType<SettingsManager["getDefaultThinkingLevel"]>>)),
    stringSetting("theme", () => settings.getTheme() ?? "default", value => settings.setTheme(value)),
    bool("hideThinkingBlock", () => settings.getHideThinkingBlock(), value => settings.setHideThinkingBlock(value)),
    choice("mermaidRenderingMode", ["off", "final", "streaming"], () => settings.getMermaidRenderingMode(), value => settings.setMermaidRenderingMode(value as ReturnType<SettingsManager["getMermaidRenderingMode"]>)),
    bool("showCacheMissNotices", () => settings.getShowCacheMissNotices(), value => settings.setShowCacheMissNotices(value)),
    bool("collapseChangelog", () => settings.getCollapseChangelog(), value => settings.setCollapseChangelog(value)),
    bool("enableInstallTelemetry", () => settings.getEnableInstallTelemetry(), value => settings.setEnableInstallTelemetry(value)),
    bool("quietStartup", () => settings.getQuietStartup(), value => settings.setQuietStartup(value)),
    choice("defaultProjectTrust", ["ask", "always", "never"], () => settings.getDefaultProjectTrust(), value => settings.setDefaultProjectTrust(value as ReturnType<SettingsManager["getDefaultProjectTrust"]>)),
    choice("doubleEscapeAction", ["fork", "tree", "none"], () => settings.getDoubleEscapeAction(), value => settings.setDoubleEscapeAction(value as ReturnType<SettingsManager["getDoubleEscapeAction"]>)),
    choice("treeFilterMode", ["default", "no-tools", "user-only", "labeled-only", "all"], () => settings.getTreeFilterMode(), value => settings.setTreeFilterMode(value as ReturnType<SettingsManager["getTreeFilterMode"]>)),
    bool("showHardwareCursor", () => settings.getShowHardwareCursor(), value => settings.setShowHardwareCursor(value)),
    numberSetting("editorPaddingX", () => settings.getEditorPaddingX(), value => settings.setEditorPaddingX(value), 0),
    choice("outputPad", [0, 1], () => settings.getOutputPad(), value => settings.setOutputPad(value as 0 | 1)),
    numberSetting("autocompleteMaxVisible", () => settings.getAutocompleteMaxVisible(), value => settings.setAutocompleteMaxVisible(value), 1),
    bool("clearOnShrink", () => settings.getClearOnShrink(), value => settings.setClearOnShrink(value)),
    bool("showTerminalProgress", () => settings.getShowTerminalProgress(), value => settings.setShowTerminalProgress(value)),
    choice("tuiMode", ["regular", "fullscreen"], () => settings.getTuiMode(), value => settings.setTuiMode(value as ReturnType<SettingsManager["getTuiMode"]>)),
    choice("fullscreenExitOutput", ["transcript", "resume-hint"], () => settings.getFullscreenExitOutput(), value => settings.setFullscreenExitOutput(value as ReturnType<SettingsManager["getFullscreenExitOutput"]>)),
    choice("fullscreenScrollbar", ["hidden", "auto", "always"], () => settings.getFullscreenScrollbar(), value => settings.setFullscreenScrollbar(value as ReturnType<SettingsManager["getFullscreenScrollbar"]>)),
    jsonObject("warnings", () => settings.getWarnings(), value => settings.setWarnings(value as ReturnType<SettingsManager["getWarnings"]>)),
  ];
}

function bool(key: string, read: () => boolean, write: (value: boolean) => void): Operation {
  return { descriptor: { key, valueType: "boolean", writable: true }, read, write(value) { if (typeof value !== "boolean") invalid(key); write(value); } };
}
function numberSetting(key: string, read: () => number, write: (value: number) => void, minimum: number): Operation {
  return { descriptor: { key, valueType: "number", writable: true }, read, write(value) { if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) invalid(key); write(value); } };
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
