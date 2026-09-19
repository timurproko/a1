import type { SettingsManager } from "../startup-public.js";
import type {
  AgentJsonValue,
  AgentSettingApplicationBoundary,
  AgentSettingChangeOutcome,
  AgentSettingDescriptor,
  AgentSettingOwner,
  AgentSettingsPort,
} from "../../../contracts/agent-engine/index.js";
import { loadPiSettingsMetadata, type PiSettingsMetadata } from "./settings-metadata.js";

export type PiSettingKey =
  | "autoCompact" | "showImages" | "imageWidthCells" | "autoResizeImages" | "blockImages"
  | "enableSkillCommands" | "steeringMode" | "followUpMode" | "transport" | "httpIdleTimeoutMs"
  | "modelThinkingLevels" | "theme" | "hideThinkingBlock" | "mermaidRenderingMode" | "showCacheMissNotices"
  | "collapseChangelog" | "enableInstallTelemetry" | "quietStartup" | "defaultProjectTrust"
  | "doubleEscapeAction" | "treeFilterMode" | "showHardwareCursor" | "editorPaddingX" | "outputPad"
  | "autocompleteMaxVisible" | "clearOnShrink" | "showTerminalProgress" | "tuiMode"
  | "fullscreenExitOutput" | "fullscreenScrollbar" | "fullscreenCopyOnSelect" | "warnings";

export type PiSettingVisualClass =
  | "none"
  | "transcript"
  | "transcript-geometry"
  | "editor-menu"
  | "queue-transcript"
  | "status-error"
  | "retry-error"
  | "footer-transcript"
  | "markdown"
  | "transcript-notice"
  | "startup-transcript"
  | "startup-selector"
  | "selector"
  | "terminal-cursor"
  | "editor-geometry"
  | "menu-geometry"
  | "terminal-frame"
  | "terminal-status"
  | "hidden";

export interface PiSettingVisualEvidence {
  /** Reviewed visual family; `none` still names the behavior that can emit styled diagnostics. */
  readonly class: PiSettingVisualClass;
  /** Pinned component, lifecycle, or provider-visible failure surface used as the visual authority. */
  readonly pinnedSurface: string;
  /** Independent pinned/A1 test or physical checkpoint that owns acceptance. */
  readonly evidence: string;
}

export interface PiSettingEffectDefinition {
  readonly application: AgentSettingApplicationBoundary;
  readonly owner: AgentSettingOwner;
  readonly visual: PiSettingVisualEvidence;
  /** Bare A1 deliberately replaces this Pi behavior, so its settings UI omits the entry. */
  readonly hiddenInBare?: true;
}

/**
 * Reviewed effect authority for every generated Pi setting. Presentation remains
 * generated; this table states who must make each accepted value observable.
 */
export const PI_SETTING_EFFECTS: Readonly<Record<PiSettingKey, PiSettingEffectDefinition>> = Object.freeze({
  autoCompact: effect("live", "agent", "transcript", "compaction status, summary, completion, and failure rows", "pinned-transcript-lifecycle-parity"),
  showImages: effect("live", "shell", "transcript", "pinned inline image and textual fallback components", "pinned-transcript-image-parity"),
  imageWidthCells: effect("live", "shell", "transcript-geometry", "pinned image component width and clipping", "pinned-transcript-image-parity"),
  autoResizeImages: effect("live", "agent", "none", "provider image preparation and pinned warning row", "settings-effects-provider-parity"),
  blockImages: effect("live", "agent", "none", "provider context conversion and pinned blocked-image notice", "settings-effects-provider-parity"),
  enableSkillCommands: effect("live", "shell", "editor-menu", "pinned command autocomplete list", "pinned-editor-input-parity"),
  steeringMode: effect("live", "agent", "queue-transcript", "pinned steering queue and submitted prompt rows", "pinned-status-indicator-parity"),
  followUpMode: effect("live", "agent", "queue-transcript", "pinned follow-up queue and submitted prompt rows", "pinned-status-indicator-parity"),
  transport: effect("live", "agent", "status-error", "pinned provider request status and failure rows", "settings-effects-provider-parity"),
  httpIdleTimeoutMs: effect("live", "agent", "retry-error", "pinned timeout, retry, and terminal failure rows", "pinned-transcript-lifecycle-parity"),
  modelThinkingLevels: effect("live", "agent", "footer-transcript", "pinned per-model thinking override, footer indicator, and thinking rows", "pinned-status-indicator-parity"),
  theme: hiddenEffect("live", "shell", "pinned theme selector and complete themed shell", "pinned-theme-parity"),
  hideThinkingBlock: effect("live", "shell", "transcript", "pinned thinking block presence and spacing", "pinned-transcript-lifecycle-parity"),
  mermaidRenderingMode: effect("live", "shell", "markdown", "pinned Mermaid Markdown transformation", "pinned-assistant-content-parity"),
  showCacheMissNotices: effect("live", "shell", "transcript-notice", "pinned cache-miss transcript notice", "pinned-transcript-lifecycle-parity"),
  collapseChangelog: effect("next-start", "startup", "startup-transcript", "pinned startup and command changelog components", "pi-startup-composition-parity"),
  enableInstallTelemetry: effect("next-start", "installation", "none", "install lifecycle and its pinned failure diagnostic", "settings-effects-installation-parity"),
  quietStartup: hiddenEffect("next-start", "startup", "pinned startup suppression lifecycle", "pi-startup-composition-parity"),
  defaultProjectTrust: effect("next-start", "startup", "startup-selector", "pinned pre-resource project trust selector", "project-trust-startup-parity"),
  doubleEscapeAction: effect("live", "shell", "selector", "pinned tree or fork selector", "pinned-selector-parity"),
  treeFilterMode: effect("live", "shell", "selector", "pinned tree selector filter, rows, and hints", "pinned-selector-parity"),
  showHardwareCursor: effect("live", "terminal", "terminal-cursor", "pinned editor, overlay, blur, failure, and exit cursor operations", "pi-terminal-operation-parity"),
  editorPaddingX: effect("live", "shell", "editor-geometry", "pinned editor border, padding, wrapping, and cursor column", "pinned-editor-input-parity"),
  outputPad: effect("live", "shell", "transcript-geometry", "pinned transcript, tool, status, and error horizontal padding", "pinned-transcript-lifecycle-parity"),
  autocompleteMaxVisible: effect("live", "shell", "menu-geometry", "pinned autocomplete clipping and editor anchoring", "pinned-editor-input-parity"),
  clearOnShrink: effect("live", "terminal", "terminal-frame", "pinned resize clearing and resulting terminal frame", "pi-terminal-operation-parity"),
  showTerminalProgress: effect("live", "terminal", "terminal-status", "pinned OSC progress lifecycle", "pi-terminal-operation-parity"),
  tuiMode: hiddenEffect("next-session", "shell", "pinned regular/fullscreen selector and terminal lifecycle", "pi-terminal-operation-parity"),
  fullscreenExitOutput: hiddenEffect("current-exit", "shutdown", "pinned styled transcript and compact dim resume hint", "pinned-fullscreen-exit-parity"),
  fullscreenScrollbar: hiddenEffect("live", "shell", "pinned fullscreen scrollbar reservation", "pi-terminal-operation-parity"),
  fullscreenCopyOnSelect: hiddenEffect("live", "shell", "pinned fullscreen copy-on-select toggle", "pi-terminal-operation-parity"),
  warnings: effect("live", "agent", "transcript-notice", "pinned warning rows by warning part", "pinned-transcript-lifecycle-parity"),
});

function effect(
  application: AgentSettingApplicationBoundary,
  owner: AgentSettingOwner,
  visualClass: Exclude<PiSettingVisualClass, "hidden">,
  pinnedSurface: string,
  evidence: string,
): PiSettingEffectDefinition {
  return { application, owner, visual: { class: visualClass, pinnedSurface, evidence } };
}

function hiddenEffect(
  application: AgentSettingApplicationBoundary,
  owner: AgentSettingOwner,
  pinnedSurface: string,
  evidence: string,
): PiSettingEffectDefinition {
  return { application, owner, hiddenInBare: true, visual: { class: "hidden", pinnedSurface, evidence } };
}

export interface PiSettingEffectHandler {
  /** Install one value in the active owner. Handlers must be idempotent and reversible. */
  apply(value: AgentJsonValue): void | Promise<void>;
}

export type PiSettingOwnerHandlers = Partial<Record<PiSettingKey, PiSettingEffectHandler>>;

export interface PiSettingStorageOperation {
  readonly key: PiSettingKey;
  read(): AgentJsonValue;
  validate(value: AgentJsonValue): void;
  write(value: AgentJsonValue): void;
}

export interface PiSettingsCoordinatorOptions {
  readonly productMode?: "bare" | "comparison";
  readonly flush: () => Promise<void>;
  readonly drainErrors?: () => readonly { readonly error: Error }[];
}

interface EffectiveState {
  stored: AgentJsonValue;
  effective: AgentJsonValue;
  inconsistentReason: string | null;
}

/**
 * One transactional authority for Pi setting validation, active effects,
 * persistence, durability, rollback, and owner lifecycle.
 */
export class PiSettingsCoordinator {
  readonly #operations: ReadonlyMap<PiSettingKey, PiSettingStorageOperation>;
  readonly #handlers = new Map<PiSettingKey, PiSettingEffectHandler>();
  readonly #state = new Map<PiSettingKey, EffectiveState>();
  readonly #productMode: "bare" | "comparison";
  readonly #flushStorage: () => Promise<void>;
  readonly #drainErrors: (() => readonly { readonly error: Error }[]) | undefined;

  constructor(operations: readonly PiSettingStorageOperation[], options: PiSettingsCoordinatorOptions) {
    this.#operations = new Map(operations.map(operation => [operation.key, operation]));
    this.#productMode = options.productMode ?? "bare";
    this.#flushStorage = options.flush;
    this.#drainErrors = options.drainErrors;
    for (const operation of operations) {
      const stored = operation.read();
      this.#state.set(operation.key, { stored, effective: stored, inconsistentReason: null });
    }
  }

  bindOwner(owner: AgentSettingOwner, handlers: PiSettingOwnerHandlers): () => void {
    const bound: PiSettingKey[] = [];
    for (const [candidate, handler] of Object.entries(handlers)) {
      if (handler === undefined) continue;
      const key = candidate as PiSettingKey;
      const definition = PI_SETTING_EFFECTS[key];
      if (definition === undefined) throw new Error(`unknown Pi setting effect: ${key}`);
      if (definition.owner !== owner) throw new Error(`${key} belongs to ${definition.owner}, not ${owner}`);
      if (this.#productMode === "bare" && definition.hiddenInBare === true) {
        throw new Error(`${key} is hidden in bare A1`);
      }
      this.#handlers.set(key, handler);
      bound.push(key);
    }
    return () => this.unbindOwner(owner, bound);
  }

  unbindOwner(owner: AgentSettingOwner, keys?: readonly PiSettingKey[]): void {
    const candidates = keys ?? [...this.#handlers.keys()];
    for (const key of candidates) if (PI_SETTING_EFFECTS[key].owner === owner) this.#handlers.delete(key);
  }

  definition(key: PiSettingKey): PiSettingEffectDefinition {
    return PI_SETTING_EFFECTS[key];
  }

  storedValue(key: PiSettingKey): AgentJsonValue {
    const operation = this.#requireOperation(key);
    const stored = operation.read();
    const state = this.#requireState(key);
    state.stored = stored;
    return stored;
  }

  effectiveValue(key: PiSettingKey): AgentJsonValue {
    return this.#requireState(key).effective;
  }

  limitationReason(key: PiSettingKey): string | null {
    const definition = PI_SETTING_EFFECTS[key];
    if (this.#productMode === "bare" && definition.hiddenInBare === true) return "setting is not available in the active product mode";
    const inconsistent = this.#requireState(key).inconsistentReason;
    if (inconsistent !== null) return inconsistent;
    if (!this.#handlers.has(key)) return `${definition.owner} effect is not bound for ${definition.application} application`;
    return null;
  }

  available(key: PiSettingKey): boolean {
    return this.limitationReason(key) === null;
  }

  validate(key: PiSettingKey, value: AgentJsonValue): void {
    this.#requireOperation(key).validate(value);
  }

  async apply(key: PiSettingKey, value: AgentJsonValue): Promise<AgentSettingChangeOutcome> {
    const operation = this.#requireOperation(key);
    operation.validate(value);
    const definition = PI_SETTING_EFFECTS[key];
    const previousStored = operation.read();
    const state = this.#requireState(key);
    const previousEffective = state.effective;
    const limitationReason = this.limitationReason(key);
    if (limitationReason !== null) {
      return outcome("unavailable", definition.application, previousStored, previousEffective, null, limitationReason);
    }

    const handler = this.#handlers.get(key)!;
    if (definition.application !== "live") {
      try {
        operation.write(value);
        await this.flush();
        state.stored = value;
        return outcome("deferred", definition.application, value, previousEffective, null, null);
      } catch (error) {
        const failure = await this.#restorePersistence(operation, previousStored, error);
        state.stored = operation.read();
        return outcome("failed", definition.application, state.stored, previousEffective, failure, null);
      }
    }

    try {
      await handler.apply(value);
    } catch (error) {
      return outcome("failed", definition.application, previousStored, previousEffective, describe(error), null);
    }

    state.effective = value;
    try {
      operation.write(value);
      await this.flush();
      state.stored = value;
      state.inconsistentReason = null;
      return outcome("applied", definition.application, value, value, null, null);
    } catch (error) {
      const persistenceFailure = await this.#restorePersistence(operation, previousStored, error);
      try {
        await handler.apply(previousEffective);
        state.effective = previousEffective;
        state.stored = operation.read();
        return outcome("failed", definition.application, state.stored, previousEffective, persistenceFailure, null);
      } catch (rollbackError) {
        state.stored = operation.read();
        state.inconsistentReason = `rollback failed after ${persistenceFailure}: ${describe(rollbackError)}`;
        return outcome("failed", definition.application, state.stored, state.effective, state.inconsistentReason, state.inconsistentReason);
      }
    }
  }

  async flush(): Promise<void> {
    await this.#flushStorage();
    const errors = this.#drainErrors?.() ?? [];
    if (errors.length > 0) throw new Error(errors.map(value => value.error.message).join("; "));
  }

  async rollback(key: PiSettingKey, value: AgentJsonValue): Promise<void> {
    const handler = this.#handlers.get(key);
    if (handler === undefined) throw new Error(`cannot roll back unbound setting: ${key}`);
    await handler.apply(value);
    this.#requireState(key).effective = value;
  }

  async #restorePersistence(operation: PiSettingStorageOperation, previous: AgentJsonValue, cause: unknown): Promise<string> {
    const original = describe(cause);
    try {
      operation.write(previous);
      await this.flush();
      return original;
    } catch (rollbackError) {
      return `${original}; persistence rollback failed: ${describe(rollbackError)}`;
    }
  }

  #requireOperation(key: PiSettingKey): PiSettingStorageOperation {
    const operation = this.#operations.get(key);
    if (operation === undefined) throw new Error(`setting is unavailable: ${key}`);
    return operation;
  }

  #requireState(key: PiSettingKey): EffectiveState {
    const state = this.#state.get(key);
    if (state === undefined) throw new Error(`setting state is unavailable: ${key}`);
    return state;
  }
}

export function settingsEffectInventoryDrift(
  presented: readonly string[],
  reviewed: readonly string[] = Object.keys(PI_SETTING_EFFECTS),
): { readonly unmapped: readonly string[]; readonly stale: readonly string[]; readonly duplicated: readonly string[] } {
  const reviewedSet = new Set(reviewed);
  const presentedSet = new Set(presented);
  const counts = new Map<string, number>();
  for (const key of reviewed) counts.set(key, (counts.get(key) ?? 0) + 1);
  return {
    unmapped: presented.filter(key => !reviewedSet.has(key)),
    stale: reviewed.filter(key => !presentedSet.has(key)),
    duplicated: [...counts].filter(([, count]) => count > 1).map(([key]) => key),
  };
}

export function settingsVisualInventoryViolations(
  presented: readonly string[],
  reviewed: Readonly<Partial<Record<PiSettingKey, PiSettingEffectDefinition>>> = PI_SETTING_EFFECTS,
): readonly string[] {
  const violations: string[] = [];
  for (const candidate of presented) {
    const key = candidate as PiSettingKey;
    const definition = reviewed[key];
    if (definition === undefined) {
      violations.push(`${candidate}: missing visual classification`);
      continue;
    }
    const visual = definition.visual;
    if (!visual || visual.pinnedSurface.trim().length === 0) violations.push(`${candidate}: missing pinned visual source`);
    if (!visual || visual.evidence.trim().length === 0) violations.push(`${candidate}: missing independent visual evidence`);
    if (definition.hiddenInBare === true && visual?.class !== "hidden") violations.push(`${candidate}: hidden setting declares a visible frame`);
    if (definition.hiddenInBare !== true && visual?.class === "hidden") violations.push(`${candidate}: visible setting declares hidden evidence`);
  }
  return violations;
}

function outcome(
  status: AgentSettingChangeOutcome["status"],
  application: AgentSettingApplicationBoundary,
  storedValue: AgentJsonValue,
  effectiveValue: AgentJsonValue,
  failure: string | null,
  limitationReason: string | null,
): AgentSettingChangeOutcome {
  return { status, application, storedValue, effectiveValue, failure, limitationReason };
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Values only the running engine knows. */
export interface PiSettingsProviders {
  readonly themes?: () => readonly string[];
  /** Models a per-model thinking override may name, with the levels each one supports. */
  readonly models?: () => readonly PiSettingsModelChoice[];
  readonly productMode?: "bare" | "comparison";
}

export interface PiSettingsModelChoice {
  /** `provider/modelId`, the key the engine stores the override under. */
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly levels: readonly string[];
}

/** The choice that clears a per-model override; the engine then applies its global default. */
export const MODEL_THINKING_DEFAULT = "default";

export const AUTOMATIC_THEME = "automatic";
const LIGHT_APPEARANCE_THEME = "light";
const DARK_APPEARANCE_THEME = "dark";
const THEME_KEY: PiSettingKey = "theme";
const MODEL_THINKING_KEY: PiSettingKey = "modelThinkingLevels";

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

const PRESENTATION: PiSettingsMetadata = loadPiSettingsMetadata();

/** The keys the pinned engine presents, in the engine's order, read from the generated metadata. */
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
 * The one Pi settings boundary the owned UI reads and writes through: the agent settings
 * port over the pinned settings manager, backed by the transactional coordinator. The
 * generated metadata owns presentation while the reviewed effect table owns timing,
 * availability, owner, and active behavior.
 */
export class PiSettingsBridge implements AgentSettingsPort {
  readonly capabilities = { write: true, flush: true };
  readonly #operations: ReadonlyMap<PiSettingKey, Operation>;
  readonly #providers: PiSettingsProviders;
  readonly #coordinator: PiSettingsCoordinator;

  private readonly settings: SettingsManager;
  constructor(settings: SettingsManager, providers: PiSettingsProviders = {}) {
    this.settings = settings;
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
    if (descriptor.key === MODEL_THINKING_KEY) {
      const models = this.#providers.models?.() ?? [];
      if (models.length === 0) return descriptor;
      // Rationale: the rows are the models the running engine offers, each with the levels it supports.
      return { ...descriptor, resolvedWhenRead: true, flags: models.map(model => ({
        key: model.key, label: model.label, description: model.description, fallback: MODEL_THINKING_DEFAULT, choices: [MODEL_THINKING_DEFAULT, ...model.levels],
      })) };
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
    modelThinkingLevels(settings),
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
    bool("fullscreenCopyOnSelect", () => settings.getFullscreenCopyOnSelect(), value => settings.setFullscreenCopyOnSelect(value)),
    jsonObject("warnings", () => settings.getWarnings(), value => settings.setWarnings(value as ReturnType<SettingsManager["getWarnings"]>)),
  ];
}

const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const;
type PiThinkingLevel = typeof THINKING_LEVELS[number];

/**
 * Per-model thinking overrides as one record keyed `provider/modelId`. Writing a record removes the
 * overrides it no longer names and sets the ones it does, so the stored set equals the written set.
 */
function modelThinkingLevels(settings: SettingsManager): Operation {
  // Compatibility: an in-memory manager with no overrides reports nothing rather than an empty record.
  const read = (): Record<string, string> => ({ ...(settings.getAllModelThinkingLevels() ?? {}) });
  return operation("modelThinkingLevels", "json", read, value => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) invalid("modelThinkingLevels");
    for (const [key, level] of Object.entries(value as Record<string, unknown>)) {
      if (!key.includes("/") || typeof level !== "string" || !(THINKING_LEVELS as readonly string[]).includes(level)) invalid("modelThinkingLevels");
    }
  }, value => {
    const next = value as Record<string, PiThinkingLevel>;
    for (const key of Object.keys(settings.getAllModelThinkingLevels() ?? {})) {
      if (!(key in next)) settings.removeModelThinkingLevel(...splitModelKey(key));
    }
    for (const [key, level] of Object.entries(next)) settings.setModelThinkingLevel(...splitModelKey(key), level);
  });
}

/** The engine keys overrides as `provider/modelId`; the model id may itself contain slashes. */
export function splitModelKey(key: string): [provider: string, modelId: string] {
  const at = key.indexOf("/");
  return [key.slice(0, at), key.slice(at + 1)];
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
