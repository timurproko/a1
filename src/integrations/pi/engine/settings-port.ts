import { configureOwnedHttpDispatcher } from "./http-dispatcher.js";
import { isRecord, readThinkingLevel, stringProperty } from "./message-values.js";
import { collectionResult } from "./resource-catalog.js";
import { MODEL_THINKING_DEFAULT, PiSettingsBridge, type PiSettingsModelChoice } from "./settings-bridge.js";
import { workflowResult } from "./workflow-support.js";
import type { PiSettingOwnerHandlers } from "./settings-bridge.js";
import type { AgentSession, AgentSessionRuntime } from "../startup-public.js";
import type { OwnedUiThinkingLevel } from "../../../contracts/owned-ui/index.js";
import type { AgentJsonValue, AgentSettingOwner } from "../../../contracts/agent-engine/index.js";
import { PINNED_PI_SETTINGS_CALLBACKS, type PiPinnedSettingsCallback, type PiPinnedSettingsSnapshot, type PiWorkflowResult } from "./workflows.js";

export interface PiEngineSettingsOptions {
  /** Themes installed on this machine, when the component adapter that owns the theme unit supplies them. */
  readonly availableThemes: (() => readonly string[]) | null;
  readonly productMode: "bare" | "comparison";
}

export interface PiEngineSettingsPorts {
  runtime(): AgentSessionRuntime | undefined;
  /** The bound session, or a thrown "not running" error before one exists. */
  requireSession(): AgentSession;
  /** The session's thinking level was written through the settings port; the adapter mirrors and publishes it. */
  thinkingLevelChanged(level: OwnedUiThinkingLevel): void;
  emitView(): void;
}

/**
 * Pinned Pi's settings as the owned UI reads and writes them: the lazily built settings port
 * over the runtime's settings manager with its owner bindings, the pinned settings snapshot the
 * settings dialog renders, and the pinned callback protocol that applies one setting and words
 * its result. The runtime and session are reached through ports; the adapter publishes views.
 */
export class PiEngineSettings {
  readonly #availableThemes: (() => readonly string[]) | null;
  readonly #settingsProductMode: "bare" | "comparison";
  readonly #ports: PiEngineSettingsPorts;
  #settingsIntegration: PiSettingsBridge | undefined;
  #settingsIntegrationManager: unknown;

  constructor(options: PiEngineSettingsOptions, ports: PiEngineSettingsPorts) {
    this.#availableThemes = options.availableThemes;
    this.#settingsProductMode = options.productMode;
    this.#ports = ports;
  }

  /** Which settings surface this adapter serves; hidden-in-bare effects are unbindable in bare mode. */
  get productMode(): "bare" | "comparison" {
    return this.#settingsProductMode;
  }

  /**
   * The theme the engine is configured with, in the engine's own grammar: a
   * theme's name, or a `light/dark` pair meaning "follow the terminal".
   */
  configuredTheme(): string | undefined {
    return this.#ports.runtime()?.services.settingsManager.getThemeSetting();
  }

  /** Settings port for the live runtime, or null before the runtime is available. */
  settingsPort(): PiSettingsBridge | null {
    const settings = this.#ports.runtime()?.services.settingsManager;
    if (!settings || typeof settings.getCompactionEnabled !== "function") return null;
    if (this.#settingsIntegration === undefined || this.#settingsIntegrationManager !== settings) {
      this.#settingsIntegrationManager = settings;
      configureOwnedHttpDispatcher(settings.getHttpIdleTimeoutMs());
      this.#settingsIntegration = new PiSettingsBridge(settings, {
        ...(this.#availableThemes === null ? {} : { themes: this.#availableThemes }),
        models: () => this.#modelChoices(),
        productMode: this.#settingsProductMode,
      });
      this.#settingsIntegration.bindOwner("shell", {
        enableSkillCommands: { apply: value => {
          if (typeof value !== "boolean") throw new TypeError("Skill commands value is invalid");
          settings.setEnableSkillCommands(value);
        } },
        doubleEscapeAction: { apply: value => {
          if (value !== "tree" && value !== "fork" && value !== "none") throw new TypeError("Double-Escape action is invalid");
          settings.setDoubleEscapeAction(value);
        } },
        treeFilterMode: { apply: value => {
          if (value !== "default" && value !== "no-tools" && value !== "user-only" && value !== "labeled-only" && value !== "all") throw new TypeError("Tree filter mode is invalid");
          settings.setTreeFilterMode(value);
        } },
        showCacheMissNotices: { apply: value => {
          if (typeof value !== "boolean") throw new TypeError("Cache-miss notice setting is invalid");
          settings.setShowCacheMissNotices(value);
        } },
      });
      this.#settingsIntegration.bindOwner("startup", {
        // Invariant: deferred application is the owner operation: the next preflight reads
        // the persisted default before constructing project-backed services.
        defaultProjectTrust: { apply() {} },
        collapseChangelog: { apply() {} },
      });
      this.#settingsIntegration.bindOwner("agent", {
        autoCompact: { apply: value => {
          if (typeof value !== "boolean") throw new TypeError("Auto compact value is invalid");
          this.#ports.requireSession().setAutoCompactionEnabled(value);
        } },
        autoResizeImages: { apply: value => {
          if (typeof value !== "boolean") throw new TypeError("Auto-resize images value is invalid");
          settings.setImageAutoResize(value);
        } },
        blockImages: { apply: value => {
          if (typeof value !== "boolean") throw new TypeError("Block images value is invalid");
          settings.setBlockImages(value);
        } },
        steeringMode: { apply: value => {
          if (value !== "all" && value !== "one-at-a-time") throw new TypeError("Steering mode is invalid");
          this.#ports.requireSession().setSteeringMode(value);
        } },
        followUpMode: { apply: value => {
          if (value !== "all" && value !== "one-at-a-time") throw new TypeError("Follow-up mode is invalid");
          this.#ports.requireSession().setFollowUpMode(value);
        } },
        transport: { apply: value => {
          if (value !== "sse" && value !== "websocket" && value !== "websocket-cached" && value !== "auto") throw new TypeError("Transport is invalid");
          this.#ports.requireSession().agent.transport = value;
        } },
        httpIdleTimeoutMs: { apply: value => {
          if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new TypeError("HTTP idle timeout is invalid");
          // Invariant: provider streaming reads the manager per request; global fetch uses
          // the matching owned dispatcher and zero maps to disabled semantics.
          configureOwnedHttpDispatcher(value);
          settings.setHttpIdleTimeoutMs(value);
        } },
        cacheWarmingMode: { apply: value => {
          if (value !== "off" && value !== "streaming" && value !== "idle") throw new TypeError("Cache warming mode is invalid");
          // Invariant: the warmer reads the mode per decision, but only the session route
          // also retires an in-flight idle loop when the mode stops allowing one.
          this.#ports.requireSession().setCacheWarmingMode(value);
        } },
        modelThinkingLevels: { apply: value => {
          if (!isRecord(value)) throw new TypeError("Per-model thinking levels are invalid");
          // Invariant: an override for the model in use takes effect now, as the pinned selector applies it;
          // clearing it returns the session to the engine's global default.
          const session = this.#ports.requireSession();
          const model = session.model;
          if (!model) return;
          const level = value[`${model.provider}/${model.id}`] ?? settings.getDefaultThinkingLevel() ?? "medium";
          if (!isThinkingLevel(level)) throw new TypeError("Thinking level is invalid");
          session.setThinkingLevel(level);
          this.#ports.thinkingLevelChanged(readThinkingLevel(session.thinkingLevel));
        } },
        warnings: { apply: value => {
          if (!isRecord(value) || Object.values(value).some(flag => typeof flag !== "boolean")) throw new TypeError("Warnings setting is invalid");
          settings.setWarnings(value);
        } },
      });
    }
    return this.#settingsIntegration;
  }

  // Rationale: the rows are the models the running engine offers, each with the levels the engine says it supports.
  #modelChoices(): readonly PiSettingsModelChoice[] {
    const runtime = this.#ports.runtime();
    const models = runtime?.services.modelRuntime.getAvailableSnapshot?.() ?? [];
    const overrides = runtime?.services.settingsManager.getAllModelThinkingLevels?.() ?? {};
    return models.map(model => {
      const key = `${model.provider}/${model.id}`;
      return {
        key,
        label: `${model.id} [${model.provider}]`,
        description: overrides[key] === undefined ? "global default" : `override: ${overrides[key]}`,
        levels: supportedThinkingLevels(model),
      };
    });
  }

  bindSettingsOwner(owner: AgentSettingOwner, handlers: PiSettingOwnerHandlers): () => void {
    const settings = this.settingsPort();
    if (settings === null) return () => {};
    return settings.bindOwner(owner, handlers);
  }

  pinnedSettingsSnapshot(): PiPinnedSettingsSnapshot {
    const session = this.#ports.requireSession();
    const settings = this.#ports.runtime()?.services.settingsManager;
    const setting = <T>(getter: (() => unknown) | undefined, fallback: T): T => {
      const value = getter?.call(settings);
      return value === undefined ? fallback : value as T;
    };
    const levels = session.getAvailableThinkingLevels?.();
    const defaultProvider = settings?.getDefaultProvider?.();
    const defaultModelId = settings?.getDefaultModel?.();
    const themes = collectionResult(this.#ports.runtime()?.services.resourceLoader?.getThemes?.(), "themes").values
      .map(theme => stringProperty(theme, "name"))
      .filter((name): name is string => !!name);
    return {
      autoCompact: typeof session.autoCompactionEnabled === "boolean"
        ? session.autoCompactionEnabled
        : setting(settings?.getCompactionEnabled, true),
      showImages: setting(settings?.getShowImages, true),
      imageWidthCells: setting(settings?.getImageWidthCells, 80),
      autoResizeImages: setting(settings?.getImageAutoResize, true),
      blockImages: setting(settings?.getBlockImages, false),
      enableSkillCommands: setting(settings?.getEnableSkillCommands, true),
      steeringMode: session.steeringMode ?? setting(settings?.getSteeringMode, "one-at-a-time"),
      followUpMode: session.followUpMode ?? setting(settings?.getFollowUpMode, "one-at-a-time"),
      transport: setting(settings?.getTransport, "sse"),
      httpIdleTimeoutMs: setting(settings?.getHttpIdleTimeoutMs, 300_000),
      cacheWarmingMode: setting(settings?.getCacheWarmingMode, "streaming"),
      thinkingLevel: readThinkingLevel(session.thinkingLevel),
      availableThinkingLevels: Array.isArray(levels) ? levels.map(readThinkingLevel) : ["off", "minimal", "low", "medium", "high", "xhigh"],
      defaultThinkingLevel: readThinkingLevel(settings?.getDefaultThinkingLevel?.() ?? "medium"),
      modelThinkingLevels: { ...(settings?.getAllModelThinkingLevels?.() ?? {}) },
      defaultModel: defaultProvider && defaultModelId ? `${defaultProvider}/${defaultModelId}` : "not set",
      ...(session.model === undefined ? {} : { currentModel: session.model }),
      availableDefaultModels: this.#ports.runtime()?.services.modelRuntime.getAvailableSnapshot?.() ?? [],
      currentTheme: setting(settings?.getThemeSetting, setting(settings?.getTheme, "dark")),
      terminalTheme: "dark",
      availableThemes: themes.length > 0 ? themes : ["dark", "light"],
      hideThinkingBlock: setting(settings?.getHideThinkingBlock, false),
      mermaidRenderingMode: setting(settings?.getMermaidRenderingMode, "off"),
      showCacheMissNotices: setting(settings?.getShowCacheMissNotices, false),
      collapseChangelog: setting(settings?.getCollapseChangelog, true),
      enableInstallTelemetry: setting(settings?.getEnableInstallTelemetry, true),
      doubleEscapeAction: setting(settings?.getDoubleEscapeAction, "tree"),
      treeFilterMode: setting(settings?.getTreeFilterMode, "default"),
      showHardwareCursor: setting(settings?.getShowHardwareCursor, false),
      editorPaddingX: setting(settings?.getEditorPaddingX, 0),
      outputPad: setting(settings?.getOutputPad, 1),
      autocompleteMaxVisible: setting(settings?.getAutocompleteMaxVisible, 5),
      quietStartup: setting(settings?.getQuietStartup, false),
      defaultProjectTrust: setting(settings?.getDefaultProjectTrust, "ask"),
      clearOnShrink: setting(settings?.getClearOnShrink, false),
      showTerminalProgress: setting(settings?.getShowTerminalProgress, false),
      tuiMode: setting(settings?.getTuiMode, "regular"),
      fullscreenExitOutput: setting(settings?.getFullscreenExitOutput, "transcript"),
      fullscreenScrollbar: setting(settings?.getFullscreenScrollbar, "auto"),
      fullscreenCopyOnSelect: setting(settings?.getFullscreenCopyOnSelect, false),
      warnings: setting(settings?.getWarnings, { anthropicExtraUsage: true }),
    };
  }

  async applyPinnedSettingValue(callback: PiPinnedSettingsCallback, value: unknown): Promise<PiWorkflowResult> {
    try {
      return await this.applyPinnedSetting(callback, value, true);
    } catch (error) {
      return workflowResult("settings", "failed", error instanceof Error ? error.message : String(error));
    }
  }

  async applyPinnedSetting(selection: string, selectedValue?: unknown, hasSelectedValue = false): Promise<PiWorkflowResult> {
    if (!(PINNED_PI_SETTINGS_CALLBACKS as readonly string[]).includes(selection)) {
      return workflowResult("settings", "failed", `Unknown setting callback: ${selection}`);
    }
    const callback = selection as PiPinnedSettingsCallback;
    if (callback === "onCancel") return workflowResult("settings", "cancelled", "Settings cancelled");
    if (callback === "onThemePreview") return workflowResult("settings", "completed", "Theme preview refreshed");
    if (!hasSelectedValue) {
      const snapshot = this.pinnedSettingsSnapshot();
      const currentValues: Partial<Record<PiPinnedSettingsCallback, unknown>> = {
        onAutoCompactChange: snapshot.autoCompact,
        onShowImagesChange: snapshot.showImages,
        onImageWidthCellsChange: snapshot.imageWidthCells,
        onAutoResizeImagesChange: snapshot.autoResizeImages,
        onBlockImagesChange: snapshot.blockImages,
        onEnableSkillCommandsChange: snapshot.enableSkillCommands,
        onSteeringModeChange: snapshot.steeringMode,
        onFollowUpModeChange: snapshot.followUpMode,
        onTransportChange: snapshot.transport,
        onHttpIdleTimeoutMsChange: snapshot.httpIdleTimeoutMs,
        onCacheWarmingModeChange: snapshot.cacheWarmingMode,
        onModelThinkingLevelChange: snapshot.modelThinkingLevels,
        onModelThinkingLevelRemove: snapshot.modelThinkingLevels,
        onFullscreenCopyOnSelectChange: snapshot.fullscreenCopyOnSelect,
        onThemeChange: snapshot.currentTheme,
        onHideThinkingBlockChange: snapshot.hideThinkingBlock,
        onMermaidRenderingModeChange: snapshot.mermaidRenderingMode,
        onShowCacheMissNoticesChange: snapshot.showCacheMissNotices,
        onCollapseChangelogChange: snapshot.collapseChangelog,
        onEnableInstallTelemetryChange: snapshot.enableInstallTelemetry,
        onQuietStartupChange: snapshot.quietStartup,
        onDefaultProjectTrustChange: snapshot.defaultProjectTrust,
        onDoubleEscapeActionChange: snapshot.doubleEscapeAction,
        onTreeFilterModeChange: snapshot.treeFilterMode,
        onShowHardwareCursorChange: snapshot.showHardwareCursor,
        onEditorPaddingXChange: snapshot.editorPaddingX,
        onOutputPadChange: snapshot.outputPad,
        onAutocompleteMaxVisibleChange: snapshot.autocompleteMaxVisible,
        onClearOnShrinkChange: snapshot.clearOnShrink,
        onShowTerminalProgressChange: snapshot.showTerminalProgress,
        onTuiModeChange: snapshot.tuiMode,
        onFullscreenExitOutputChange: snapshot.fullscreenExitOutput,
        onFullscreenScrollbarChange: snapshot.fullscreenScrollbar,
        onWarningsChange: snapshot.warnings,
      };
      selectedValue = currentValues[callback];
      hasSelectedValue = true;
    }
    const port = this.settingsPort();
    if (port === null) return workflowResult("settings", "failed", "Settings are unavailable");
    const key = settingKeyForCallback(callback);
    if (key === null) return workflowResult("settings", "failed", `${settingLabel(callback)} is unavailable in this runtime`);
    // Protocol: the pinned selector reports one model's override as (provider, modelId, level) or (provider, modelId);
    // the port stores the whole record, so the change is folded into the current one.
    if ((callback === "onModelThinkingLevelChange" || callback === "onModelThinkingLevelRemove") && Array.isArray(selectedValue)) {
      const [provider, modelId, level] = selectedValue as readonly unknown[];
      if (typeof provider !== "string" || typeof modelId !== "string") return workflowResult("settings", "failed", "Per-model thinking override is invalid");
      const overrides = { ...this.pinnedSettingsSnapshot().modelThinkingLevels };
      const modelKey = `${provider}/${modelId}`;
      if (callback === "onModelThinkingLevelRemove" || level === MODEL_THINKING_DEFAULT) delete overrides[modelKey];
      else if (typeof level === "string") overrides[modelKey] = level;
      selectedValue = overrides;
    }
    const result = await port.writeSetting(key, agentJsonValue(selectedValue));
    if (result.status === "failed" || result.status === "unavailable") {
      return workflowResult("settings", "failed", result.failure ?? result.limitationReason ?? `${settingLabel(callback)} is unavailable`);
    }
    this.#ports.emitView();
    const suffix = result.status === "deferred" ? ` (${result.application})` : "";
    return workflowResult("settings", "completed", `${settingLabel(callback)}: ${String(selectedValue)}${suffix}`);
  }
}

function settingKeyForCallback(callback: PiPinnedSettingsCallback): string | null {
  const keys: Partial<Record<PiPinnedSettingsCallback, string>> = {
    onAutoCompactChange: "autoCompact", onShowImagesChange: "showImages", onImageWidthCellsChange: "imageWidthCells",
    onAutoResizeImagesChange: "autoResizeImages", onBlockImagesChange: "blockImages", onEnableSkillCommandsChange: "enableSkillCommands",
    onSteeringModeChange: "steeringMode", onFollowUpModeChange: "followUpMode", onTransportChange: "transport",
    onHttpIdleTimeoutMsChange: "httpIdleTimeoutMs", onCacheWarmingModeChange: "cacheWarmingMode",
    onModelThinkingLevelChange: "modelThinkingLevels", onModelThinkingLevelRemove: "modelThinkingLevels",
    onThemeChange: "theme", onThemePreview: "theme", onFullscreenCopyOnSelectChange: "fullscreenCopyOnSelect",
    onHideThinkingBlockChange: "hideThinkingBlock", onMermaidRenderingModeChange: "mermaidRenderingMode",
    onShowCacheMissNoticesChange: "showCacheMissNotices", onCollapseChangelogChange: "collapseChangelog",
    onEnableInstallTelemetryChange: "enableInstallTelemetry", onQuietStartupChange: "quietStartup",
    onDefaultProjectTrustChange: "defaultProjectTrust", onDoubleEscapeActionChange: "doubleEscapeAction",
    onTreeFilterModeChange: "treeFilterMode", onShowHardwareCursorChange: "showHardwareCursor",
    onEditorPaddingXChange: "editorPaddingX", onOutputPadChange: "outputPad", onAutocompleteMaxVisibleChange: "autocompleteMaxVisible",
    onClearOnShrinkChange: "clearOnShrink", onShowTerminalProgressChange: "showTerminalProgress", onTuiModeChange: "tuiMode",
    onFullscreenExitOutputChange: "fullscreenExitOutput", onFullscreenScrollbarChange: "fullscreenScrollbar", onWarningsChange: "warnings",
  };
  return keys[callback] ?? null;
}

function agentJsonValue(value: unknown): AgentJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) return value;
  if (Array.isArray(value)) return value.map(agentJsonValue);
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).map(([key, item]) => [key, agentJsonValue(item)]));
  throw new TypeError("setting value must be JSON serializable");
}

function isThinkingLevel(value: unknown): value is "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max" {
  return typeof value === "string" && ["off", "minimal", "low", "medium", "high", "xhigh", "max"].includes(value);
}

/** The engine's own rule: no reasoning means "off" only; xhigh and max exist only where the model maps them. */
function supportedThinkingLevels(model: { readonly reasoning?: boolean; readonly thinkingLevelMap?: Readonly<Record<string, unknown>> }): readonly string[] {
  if (!model.reasoning) return ["off"];
  return ["off", "minimal", "low", "medium", "high", "xhigh", "max"].filter(level => {
    const mapped = model.thinkingLevelMap?.[level];
    if (mapped === null) return false;
    if (level === "xhigh" || level === "max") return mapped !== undefined;
    return true;
  });
}

function settingLabel(callback: PiPinnedSettingsCallback): string {
  return callback
    .replace(/^on/, "")
    .replace(/Change$|Preview$|Cancel$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, character => character.toUpperCase());
}
