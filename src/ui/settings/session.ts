import type { AgentJsonValue, AgentSettingsPort } from "../../contracts/agent-engine/index.js";
import type { OwnedUiSettingValue } from "./declarations.js";
import type { OwnedUiSettingsResolution } from "./resolution.js";
import {
  buildOwnedUiSettingsSections,
  findOwnedUiSettingsEntry,
  type AgentSettingsSnapshot,
  type OwnedUiSettingsBackend,
  type OwnedUiSettingsSection,
} from "./sections.js";
import type { OwnedUiSettingsStore } from "./store.js";

export interface OwnedUiSettingsChangeOutcome {
  readonly applied: boolean;
  /** True when the value is stored but only takes effect on the next start. */
  readonly pendingRestart: boolean;
  /** Present when the change could not be persisted; the surface must not show it as saved. */
  readonly failure: string | null;
}

export interface OwnedUiSettingsSessionOptions {
  readonly store: OwnedUiSettingsStore;
  /** Null when no engine is attached; the Agent section then reports itself unavailable. */
  readonly agent?: AgentSettingsPort | null;
  /**
   * Resolves the port at load time instead of construction time, for an engine
   * whose runtime is not up yet. Takes precedence over `agent`.
   */
  readonly agentProvider?: () => AgentSettingsPort | null;
}

export type OwnedUiSettingsListener = (session: OwnedUiSettingsSession) => void;

/**
 * Holds the resolved settings for one owned UI session and routes every accepted
 * change to the backend that owns it: A1 settings to the A1 document, agent
 * settings to the engine settings port. Neither backend ever sees the other's value.
 */
export class OwnedUiSettingsSession {
  readonly #store: OwnedUiSettingsStore;
  readonly #agent: AgentSettingsPort | null;
  readonly #agentProvider: (() => AgentSettingsPort | null) | null;
  readonly #listeners = new Set<OwnedUiSettingsListener>();
  #resolution: OwnedUiSettingsResolution;
  #agentSnapshot: AgentSettingsSnapshot | null = null;
  #pending = new Map<string, OwnedUiSettingValue>();

  constructor(options: OwnedUiSettingsSessionOptions) {
    this.#store = options.store;
    this.#agent = options.agent ?? null;
    this.#agentProvider = options.agentProvider ?? null;
    this.#resolution = options.store.read();
  }

  get resolution(): OwnedUiSettingsResolution {
    return this.#resolution;
  }

  /** Reads the engine's settings so the Agent section can be built. Never throws. */
  async load(): Promise<void> {
    this.#resolution = this.#store.read();
    const agent = this.#agentProvider === null ? this.#agent : this.#agentProvider();
    this.#agentSnapshot = agent === null ? null : await snapshotOf(agent);
    this.#notify();
  }

  sections(): readonly OwnedUiSettingsSection[] {
    return buildOwnedUiSettingsSections({ resolution: this.#resolution, agent: this.#agentSnapshot });
  }

  /** Resolved value of an A1 setting, or null when it is not declared. */
  value(id: string): OwnedUiSettingValue | null {
    return this.#resolution.settings.find(setting => setting.declaration.id === id)?.value ?? null;
  }

  /** Value stored this session but not yet in effect, for a restart-required setting. */
  pendingValue(id: string): OwnedUiSettingValue | null {
    return this.#pending.get(id) ?? null;
  }

  onChange(listener: OwnedUiSettingsListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /** Writes a structured value, which only an engine-backed setting can hold. */
  async changeStructured(
    backend: OwnedUiSettingsBackend,
    id: string,
    value: Readonly<Record<string, unknown>>,
  ): Promise<OwnedUiSettingsChangeOutcome> {
    if (backend !== "agent") return failed("only an agent setting holds a structured value");
    const agent = this.#agentProvider === null ? this.#agent : this.#agentProvider();
    if (agent === null) return failed("no agent engine is attached");
    if (!agent.capabilities.write || !agent.writeSetting) {
      return failed("the agent engine does not support changing settings from this surface");
    }
    try {
      await agent.writeSetting(id, value as AgentJsonValue);
      if (agent.capabilities.flush && agent.flush) await agent.flush();
    } catch (error) {
      return failed(`${id} could not be written to the agent engine: ${describe(error)}`);
    }
    this.#agentSnapshot = await snapshotOf(agent);
    this.#notify();
    return { applied: true, pendingRestart: false, failure: null };
  }

  async change(
    backend: OwnedUiSettingsBackend,
    id: string,
    value: OwnedUiSettingValue,
  ): Promise<OwnedUiSettingsChangeOutcome> {
    const entry = findOwnedUiSettingsEntry(this.sections(), id, backend);
    if (entry === null) return failed(`unknown ${backend} setting: ${id}`);
    if (!entry.editable) return failed(`${id} is not editable from this surface`);

    return backend === "a1" ? this.#changeOwned(id, value) : await this.#changeAgent(id, value);
  }

  #changeOwned(id: string, value: OwnedUiSettingValue): OwnedUiSettingsChangeOutcome {
    const outcome = this.#store.write(this.#resolution, id, value);
    if (!outcome.stored) return failed(outcome.failure ?? `${id} could not be stored`);

    const previous = this.#resolution;
    this.#resolution = this.#store.read();
    const declaration = previous.settings.find(setting => setting.declaration.id === id)?.declaration;
    if (declaration?.application === "restart") {
      this.#pending.set(id, value);
      this.#resolution = previous;
      this.#notify();
      return { applied: false, pendingRestart: true, failure: null };
    }
    this.#pending.delete(id);
    this.#notify();
    return { applied: true, pendingRestart: false, failure: null };
  }

  async #changeAgent(id: string, value: OwnedUiSettingValue): Promise<OwnedUiSettingsChangeOutcome> {
    const agent = this.#agentProvider === null ? this.#agent : this.#agentProvider();
    if (agent === null) return failed("no agent engine is attached");
    if (!agent.capabilities.write || !agent.writeSetting) {
      return failed("the agent engine does not support changing settings from this surface");
    }
    try {
      await agent.writeSetting(id, value satisfies AgentJsonValue);
      if (agent.capabilities.flush && agent.flush) await agent.flush();
    } catch (error) {
      return failed(`${id} could not be written to the agent engine: ${describe(error)}`);
    }
    this.#agentSnapshot = await snapshotOf(agent);
    this.#notify();
    return { applied: true, pendingRestart: false, failure: null };
  }

  #notify(): void {
    for (const listener of this.#listeners) listener(this);
  }
}

async function snapshotOf(agent: AgentSettingsPort): Promise<AgentSettingsSnapshot> {
  try {
    const descriptors = await agent.listSettings();
    const values: Record<string, unknown> = {};
    for (const descriptor of descriptors) {
      try {
        values[descriptor.key] = await agent.readSetting(descriptor.key) ?? null;
      } catch {
        values[descriptor.key] = null;
      }
    }
    return {
      descriptors,
      values,
      writeAdvertised: agent.capabilities.write && typeof agent.writeSetting === "function",
      failure: null,
    };
  } catch (error) {
    return { descriptors: [], values: {}, writeAdvertised: false, failure: describe(error) };
  }
}

function failed(failure: string): OwnedUiSettingsChangeOutcome {
  return { applied: false, pendingRestart: false, failure };
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
