import type {
  AgentJsonValue,
  AgentSettingApplicationBoundary,
  AgentSettingChangeOutcome,
  AgentSettingOwner,
} from "../../../contracts/agent-engine/index.js";

export type PiSettingKey =
  | "autoCompact" | "showImages" | "imageWidthCells" | "autoResizeImages" | "blockImages"
  | "enableSkillCommands" | "steeringMode" | "followUpMode" | "transport" | "httpIdleTimeoutMs"
  | "thinkingLevel" | "theme" | "hideThinkingBlock" | "mermaidRenderingMode" | "showCacheMissNotices"
  | "collapseChangelog" | "enableInstallTelemetry" | "quietStartup" | "defaultProjectTrust"
  | "doubleEscapeAction" | "treeFilterMode" | "showHardwareCursor" | "editorPaddingX" | "outputPad"
  | "autocompleteMaxVisible" | "clearOnShrink" | "showTerminalProgress" | "tuiMode"
  | "fullscreenExitOutput" | "fullscreenScrollbar" | "warnings";

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
  | "restored-parent-output"
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
  thinkingLevel: effect("live", "agent", "footer-transcript", "pinned footer indicator, thinking rows, and clamp notice", "pinned-status-indicator-parity"),
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
  fullscreenExitOutput: effect("current-exit", "shutdown", "restored-parent-output", "pinned styled transcript and compact dim resume hint", "pinned-fullscreen-exit-parity"),
  fullscreenScrollbar: hiddenEffect("live", "shell", "pinned fullscreen scrollbar reservation", "pi-terminal-operation-parity"),
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
