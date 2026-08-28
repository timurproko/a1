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

export interface PiSettingEffectDefinition {
  readonly application: AgentSettingApplicationBoundary;
  readonly owner: AgentSettingOwner;
  /** Bare A1 deliberately replaces this Pi behavior and therefore cannot apply it. */
  readonly bareLimitation?: string;
}

const PRODUCT_FIXED = {
  theme: "Bare A1 uses its product-fixed dark owned theme",
  quietStartup: "Bare A1 owns startup composition and does not expose Pi startup suppression",
  tuiMode: "Bare A1 uses its product-fixed custom fullscreen viewport",
  fullscreenScrollbar: "Bare A1 replaces Pi's scrollbar with declared A1 viewport settings",
  enableInstallTelemetry: "Bare A1 does not run Pi's install/update telemetry lifecycle",
} as const;

/**
 * Reviewed effect authority for every generated Pi setting. Presentation remains
 * generated; this table states who must make each accepted value observable.
 */
export const PI_SETTING_EFFECTS: Readonly<Record<PiSettingKey, PiSettingEffectDefinition>> = Object.freeze({
  autoCompact: { application: "live", owner: "agent" },
  showImages: { application: "live", owner: "shell" },
  imageWidthCells: { application: "live", owner: "shell" },
  autoResizeImages: { application: "live", owner: "agent" },
  blockImages: { application: "live", owner: "agent" },
  enableSkillCommands: { application: "live", owner: "shell" },
  steeringMode: { application: "live", owner: "agent" },
  followUpMode: { application: "live", owner: "agent" },
  transport: { application: "live", owner: "agent" },
  httpIdleTimeoutMs: { application: "live", owner: "agent" },
  thinkingLevel: { application: "live", owner: "agent" },
  theme: { application: "live", owner: "shell", bareLimitation: PRODUCT_FIXED.theme },
  hideThinkingBlock: { application: "live", owner: "shell" },
  mermaidRenderingMode: { application: "live", owner: "shell" },
  showCacheMissNotices: { application: "live", owner: "shell" },
  collapseChangelog: { application: "next-start", owner: "startup" },
  enableInstallTelemetry: { application: "next-start", owner: "installation", bareLimitation: PRODUCT_FIXED.enableInstallTelemetry },
  quietStartup: { application: "next-start", owner: "startup", bareLimitation: PRODUCT_FIXED.quietStartup },
  defaultProjectTrust: { application: "next-start", owner: "startup" },
  doubleEscapeAction: { application: "live", owner: "shell" },
  treeFilterMode: { application: "live", owner: "shell" },
  showHardwareCursor: { application: "live", owner: "terminal" },
  editorPaddingX: { application: "live", owner: "shell" },
  outputPad: { application: "live", owner: "shell" },
  autocompleteMaxVisible: { application: "live", owner: "shell" },
  clearOnShrink: { application: "live", owner: "terminal" },
  showTerminalProgress: { application: "live", owner: "terminal" },
  tuiMode: { application: "next-session", owner: "shell", bareLimitation: PRODUCT_FIXED.tuiMode },
  fullscreenExitOutput: { application: "current-exit", owner: "shutdown" },
  fullscreenScrollbar: { application: "live", owner: "shell", bareLimitation: PRODUCT_FIXED.fullscreenScrollbar },
  warnings: { application: "live", owner: "agent" },
});

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
      if (this.#productMode === "bare" && definition.bareLimitation !== undefined) {
        throw new Error(`${key} is product-fixed in bare A1`);
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
    if (this.#productMode === "bare" && definition.bareLimitation !== undefined) return definition.bareLimitation;
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
