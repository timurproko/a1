import type { SettingsManager } from "@earendil-works/pi-coding-agent";
import type {
  AgentJsonValue,
  AgentSettingChangeOutcome,
  AgentSettingDescriptor,
  AgentSettingFlag,
  AgentSettingOwner,
  AgentSettingsPort,
} from "../../../contracts/agent-engine/index.js";
import piSettingsMetadata from "./pi-settings-metadata.json" with { type: "json" };
import {
  PI_SETTING_EFFECTS,
  PiSettingsCoordinator,
  type PiSettingKey,
  type PiSettingOwnerHandlers,
  type PiSettingStorageOperation,
  settingsEffectInventoryDrift,
} from "./settings-effects.js";

/** Values only the running engine knows. */
export interface PiSettingsProviders {
  readonly themes?: () => readonly string[];
  readonly thinkingLevels?: () => readonly string[];
  readonly productMode?: "bare" | "comparison";
}

export const AUTOMATIC_THEME = "automatic";
const LIGHT_APPEARANCE_THEME = "light";
const DARK_APPEARANCE_THEME = "dark";
const THEME_KEY: PiSettingKey = "theme";
const THINKING_KEY: PiSettingKey = "thinkingLevel";

interface AutomaticTheme {
  readonly light: string;
  readonly dark: string;
}

export function parseAutomaticTheme(stored: string): AutomaticTheme | null {
  const at = stored.indexOf("/");
  if (at < 0 || stored.indexOf("/", at + 1) >= 0) return null;
  const light = stored.slice(0, at).trim();
  const dark = stored.slice(at + 1).trim();
  return light.length > 0 && dark.length > 0 ? { light, dark } : null;
}

type DescriptorSeed = Pick<AgentSettingDescriptor, "key" | "valueType" | "choices">;
type Operation = PiSettingStorageOperation & { readonly descriptor: DescriptorSeed };

const PRESENTATION: {
  readonly presented: readonly string[];
  readonly order: readonly string[];
  readonly settings: Readonly<Record<string, { readonly label: string; readonly description: string; readonly opensDialog: boolean; readonly values?: readonly string[] }>>;
  readonly dialogs: Readonly<Record<string, readonly AgentSettingFlag[]>>;
  readonly bounds: Readonly<Record<string, { readonly minimum: number; readonly maximum?: number }>>;
} = piSettingsMetadata;

export const EXPOSED_SETTING_KEYS: readonly string[] = PRESENTATION.presented;

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

function offered(key: string): readonly string[] {
  return PRESENTATION.settings[key]?.values ?? [];
}

function offeredNumbers(key: string): readonly number[] {
  return offered(key).map(value => Number.parseInt(value, 10)).filter(value => Number.isSafeInteger(value));
}

/**
 * Pi settings boundary backed by the transactional settings coordinator. The
 * generated metadata owns presentation while the reviewed effect registry owns
 * timing, availability, and active behavior.
 */
export class PiSettingsIntegration implements AgentSettingsPort {
  readonly capabilities = { write: true, flush: true };
  readonly #operations: ReadonlyMap<PiSettingKey, Operation>;
  readonly #providers: PiSettingsProviders;
  readonly #coordinator: PiSettingsCoordinator;

  constructor(private readonly settings: SettingsManager, providers: PiSettingsProviders = {}) {
    this.#providers = providers;
    const mapped = operations(settings, providers);
    this.#operations = new Map(mapped.map(operation => [operation.key, operation]));
    const presentationDrift = settingsInventoryDrift(EXPOSED_SETTING_KEYS, mapped.map(operation => operation.key));
    const effectDrift = settingsEffectInventoryDrift(EXPOSED_SETTING_KEYS);
    if (presentationDrift.unmapped.length > 0 || presentationDrift.stale.length > 0
      || effectDrift.unmapped.length > 0 || effectDrift.stale.length > 0 || effectDrift.duplicated.length > 0) {
      throw new Error([
        `unmapped operations: ${presentationDrift.unmapped.join(", ")}`,
        `stale operations: ${presentationDrift.stale.join(", ")}`,
        `unmapped effects: ${effectDrift.unmapped.join(", ")}`,
        `stale effects: ${effectDrift.stale.join(", ")}`,
        `duplicated effects: ${effectDrift.duplicated.join(", ")}`,
      ].join("; "));
    }
    this.#coordinator = new PiSettingsCoordinator(mapped, {
      productMode: providers.productMode ?? "bare",
      flush: () => settings.flush(),
      drainErrors: () => settings.drainErrors(),
    });
  }

  bindOwner(owner: AgentSettingOwner, handlers: PiSettingOwnerHandlers): () => void {
    return this.#coordinator.bindOwner(owner, handlers);
  }

  unbindOwner(owner: AgentSettingOwner): void {
    this.#coordinator.unbindOwner(owner);
  }

  async listSettings(): Promise<readonly AgentSettingDescriptor[]> {
    const rank = (key: string): number => {
      const at = PRESENTATION.order.indexOf(key);
      return at < 0 ? PRESENTATION.order.length : at;
    };
    return [...this.#operations.values()]
      .filter(operation => this.#coordinator.available(operation.key))
      .map(operation => {
        const key = operation.key;
        const wording = PRESENTATION.settings[key];
        const flags = PRESENTATION.dialogs[key];
        const bounds = PRESENTATION.bounds[key];
        const descriptor: AgentSettingDescriptor = {
          ...operation.descriptor,
          application: PI_SETTING_EFFECTS[key].application,
          owner: PI_SETTING_EFFECTS[key].owner,
          available: true,
          limitationReason: null,
          writable: true,
          storedValue: this.#coordinator.storedValue(key),
          effectiveValue: this.#coordinator.effectiveValue(key),
          ...(bounds === undefined ? {} : bounds),
          ...(wording === undefined ? {} : { label: wording.label, description: wording.description }),
          ...(flags === undefined ? {} : { flags }),
        };
        return this.#resolved(descriptor);
      })
      .sort((left, right) => rank(left.key) - rank(right.key));
  }

  #resolved(descriptor: AgentSettingDescriptor): AgentSettingDescriptor {
    if (descriptor.key === THEME_KEY) {
      const themes = this.#themes();
      if (themes.length === 0) return descriptor;
      return { ...descriptor, valueType: "enum", resolvedWhenRead: true, choices: [AUTOMATIC_THEME, ...themes] };
    }
    if (descriptor.key === THINKING_KEY) {
      const levels = this.#providers.thinkingLevels?.() ?? [];
      if (levels.length === 0) return descriptor;
      return { ...descriptor, resolvedWhenRead: true, choices: [...levels] };
    }
    return descriptor;
  }

  #themes(): readonly string[] {
    return this.#providers.themes?.() ?? [];
  }

  async readSetting(key: string): Promise<AgentJsonValue | undefined> {
    return isPiSettingKey(key) && this.#operations.has(key) ? this.#coordinator.storedValue(key) : undefined;
  }

  async writeSetting(key: string, value: AgentJsonValue): Promise<AgentSettingChangeOutcome> {
    if (!isPiSettingKey(key) || !this.#operations.has(key)) throw new Error(`setting is unavailable: ${key}`);
    return await this.#coordinator.apply(key, value);
  }

  /** Shared route used by the pinned selector and owned settings surface. */
  async writeSettingNow(key: string, value: AgentJsonValue): Promise<AgentSettingChangeOutcome> {
    return await this.writeSetting(key, value);
  }

  async flush(): Promise<void> {
    await this.#coordinator.flush();
  }
}

function operations(settings: SettingsManager, providers: PiSettingsProviders): readonly Operation[] {
  const themes = (): readonly string[] => providers.themes?.() ?? [];
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
    choice("thinkingLevel", ["off", "minimal", "low", "medium", "high", "xhigh"], () => settings.getDefaultThinkingLevel() ?? "medium", value => settings.setDefaultThinkingLevel(value as NonNullable<ReturnType<SettingsManager["getDefaultThinkingLevel"]>>)),
    themeSetting(settings, themes),
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

function bool(key: PiSettingKey, read: () => boolean, write: (value: boolean) => void): Operation {
  return operation(key, "boolean", read, value => { if (typeof value !== "boolean") invalid(key); }, value => write(value as boolean));
}

function numberSetting(key: PiSettingKey, read: () => number, write: (value: number) => void, minimum: number): Operation {
  const declared = PRESENTATION.bounds[key];
  const low = declared?.minimum ?? minimum;
  const high = declared?.maximum;
  return operation(key, "number", read, value => {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < low || (high !== undefined && value > high)) invalid(key);
  }, value => write(value as number));
}

function jsonObject(key: PiSettingKey, read: () => object, write: (value: AgentJsonValue) => void): Operation {
  const boundedRead = (): AgentJsonValue => Object.fromEntries(Object.entries(read()).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"));
  return operation(key, "json", boundedRead, value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) invalid(key);
  }, write);
}

function choice(key: PiSettingKey, choices: readonly AgentJsonValue[], read: () => AgentJsonValue, write: (value: AgentJsonValue) => void): Operation {
  return {
    ...operation(key, "enum", read, value => { if (!choices.includes(value)) invalid(key); }, write),
    descriptor: { key, valueType: "enum", choices },
  };
}

function themeSetting(settings: SettingsManager, themes: () => readonly string[]): Operation {
  const raw = (): string => settings.getThemeSetting() ?? "default";
  const read = (): string => parseAutomaticTheme(raw()) === null ? raw() : AUTOMATIC_THEME;
  return operation(THEME_KEY, "string", read, value => {
    if (typeof value !== "string" || value.length === 0) invalid(THEME_KEY);
  }, value => {
    const selected = value as string;
    if (selected !== AUTOMATIC_THEME) {
      settings.setTheme(selected);
      return;
    }
    if (parseAutomaticTheme(raw()) !== null) return;
    const installed = themes();
    const current = raw();
    const light = installed.includes(LIGHT_APPEARANCE_THEME) ? LIGHT_APPEARANCE_THEME : current;
    const dark = installed.includes(DARK_APPEARANCE_THEME) ? DARK_APPEARANCE_THEME : current;
    settings.setTheme(`${light}/${dark}`);
  });
}

function operation(
  key: PiSettingKey,
  valueType: AgentSettingDescriptor["valueType"],
  read: () => AgentJsonValue,
  validate: (value: AgentJsonValue) => void,
  write: (value: AgentJsonValue) => void,
): Operation {
  return { key, descriptor: { key, valueType }, read, validate, write };
}

function isPiSettingKey(key: string): key is PiSettingKey {
  return Object.hasOwn(PI_SETTING_EFFECTS, key);
}

function invalid(key: string): never {
  throw new TypeError(`setting value is invalid: ${key}`);
}
