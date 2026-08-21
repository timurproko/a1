import type { SettingsManager } from "@earendil-works/pi-coding-agent";
import type { AgentJsonValue, AgentSettingDescriptor, AgentSettingsPort } from "../agent-engine-contracts/index.js";

type Operation = { readonly descriptor: AgentSettingDescriptor; readonly read: () => AgentJsonValue; readonly write: (value: AgentJsonValue) => void };

export const EXPOSED_SETTING_KEYS = Object.freeze([
  "autoCompact", "showImages", "imageWidthCells", "autoResizeImages", "blockImages", "enableSkillCommands",
  "steeringMode", "followUpMode", "transport", "httpIdleTimeoutMs", "thinkingLevel", "theme", "hideThinkingBlock",
  "mermaidRenderingMode", "showCacheMissNotices", "collapseChangelog", "enableInstallTelemetry", "quietStartup",
  "defaultProjectTrust", "doubleEscapeAction", "treeFilterMode", "showHardwareCursor", "editorPaddingX", "outputPad",
  "autocompleteMaxVisible", "clearOnShrink", "showTerminalProgress", "tuiMode", "fullscreenExitOutput", "fullscreenScrollbar", "warnings",
] as const);


/**
 * Labels and descriptions as the pinned engine words them, so an owned screen
 * reads the same as the vanilla settings route rather than inventing its own
 * phrasing from the key. Recorded in docs/architecture/ui-reference-provenance.md.
 */
const SETTING_LABELS: Readonly<Record<string, { readonly label: string; readonly description: string }>> = Object.freeze({
  autoCompact: { label: "Auto-compact", description: "Automatically compact context when it gets too large" },
  showImages: { label: "Show images", description: "Render images inline in terminal" },
  imageWidthCells: { label: "Image width", description: "Preferred inline image width in terminal cells" },
  autoResizeImages: { label: "Auto-resize images", description: "Resize large images for better model compatibility" },
  blockImages: { label: "Block images", description: "Prevent images from being sent to LLM providers" },
  enableSkillCommands: { label: "Skill commands", description: "Register skills as /skill:name commands" },
  steeringMode: { label: "Steering mode", description: "How Enter queues steering messages while streaming" },
  followUpMode: { label: "Follow-up mode", description: "How follow-up messages are queued" },
  transport: { label: "Transport", description: "Preferred transport for providers that support several" },
  httpIdleTimeoutMs: { label: "HTTP idle timeout", description: "Maximum idle gap while waiting for HTTP headers or body chunks" },
  thinkingLevel: { label: "Thinking level", description: "Reasoning depth for thinking-capable models" },
  theme: { label: "Theme", description: "Color theme for the interface" },
  hideThinkingBlock: { label: "Hide thinking", description: "Hide thinking blocks in assistant responses" },
  mermaidRenderingMode: { label: "Mermaid diagrams", description: "Render Mermaid code blocks as Unicode diagrams" },
  showCacheMissNotices: { label: "Cache miss notices", description: "Show transcript notices for significant prompt-cache misses" },
  collapseChangelog: { label: "Collapse changelog", description: "Show condensed changelog after updates" },
  enableInstallTelemetry: { label: "Install telemetry", description: "Send an anonymous version ping after changelog detection" },
  quietStartup: { label: "Quiet startup", description: "Disable verbose printing at startup" },
  defaultProjectTrust: { label: "Default project trust", description: "Fallback when no saved trust decision applies" },
  doubleEscapeAction: { label: "Double-escape action", description: "Action when pressing Escape twice with an empty editor" },
  treeFilterMode: { label: "Tree filter mode", description: "Default filter when opening /tree" },
  showHardwareCursor: { label: "Show hardware cursor", description: "Show the terminal cursor while positioning it for IME" },
  editorPaddingX: { label: "Editor padding", description: "Horizontal padding for the input editor (0-3)" },
  outputPad: { label: "Output padding", description: "Horizontal padding for messages and thinking" },
  autocompleteMaxVisible: { label: "Autocomplete max items", description: "Max visible items in the autocomplete dropdown (3-20)" },
  clearOnShrink: { label: "Clear on shrink", description: "Clear empty rows when content shrinks (may cause flicker)" },
  showTerminalProgress: { label: "Terminal progress", description: "Show progress indicators in the terminal tab bar" },
  tuiMode: { label: "TUI mode", description: "Interface layout; fullscreen mode is experimental" },
  fullscreenExitOutput: { label: "Fullscreen exit output", description: "Print the transcript or a resume hint when exiting fullscreen" },
  fullscreenScrollbar: { label: "Fullscreen scrollbar", description: "Scrollbar behavior in fullscreen mode" },
  warnings: { label: "Warnings", description: "Enable or disable individual warnings" },
});

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
    return [...this.#operations.values()].map(operation => {
      const wording = SETTING_LABELS[operation.descriptor.key];
      return wording === undefined ? operation.descriptor : { ...operation.descriptor, ...wording };
    });
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
