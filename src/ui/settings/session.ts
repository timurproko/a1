import { assertAgentSettingDescriptor } from "../../contracts/agent-engine/index.js";
import type {
  AgentJsonValue,
  AgentSettingApplicationBoundary,
  AgentSettingChangeOutcome,
  AgentSettingsPort,
} from "../../contracts/agent-engine/index.js";
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
  readonly status: "applied" | "deferred" | "unavailable" | "failed";
  readonly applied: boolean;
  /** Compatibility projection for existing A1 restart-bound declarations. */
  readonly pendingRestart: boolean;
  readonly application: AgentSettingApplicationBoundary | null;
  readonly storedValue: AgentJsonValue | null;
  readonly effectiveValue: AgentJsonValue | null;
  readonly limitationReason: string | null;
  readonly failure: string | null;
}

export interface OwnedUiSettingsSessionOptions {
  readonly store: OwnedUiSettingsStore;
  readonly agent?: AgentSettingsPort | null;
  readonly agentProvider?: () => AgentSettingsPort | null;
  readonly hiddenAgentSettingIds?: readonly string[];
}

export type OwnedUiSettingsListener = (session: OwnedUiSettingsSession) => void;

/** Routes every accepted setting change only to its owning backend. */
export class OwnedUiSettingsSession {
  readonly #store: OwnedUiSettingsStore;
  readonly #agent: AgentSettingsPort | null;
  readonly #agentProvider: (() => AgentSettingsPort | null) | null;
  readonly #listeners = new Set<OwnedUiSettingsListener>();
  readonly #hiddenAgentSettingIds: ReadonlySet<string>;
  #resolution: OwnedUiSettingsResolution;
  #agentSnapshot: AgentSettingsSnapshot | null = null;
  #pending = new Map<string, OwnedUiSettingValue>();

  constructor(options: OwnedUiSettingsSessionOptions) {
    this.#store = options.store;
    this.#agent = options.agent ?? null;
    this.#agentProvider = options.agentProvider ?? null;
    this.#hiddenAgentSettingIds = new Set(options.hiddenAgentSettingIds ?? []);
    this.#resolution = options.store.read();
  }

  get resolution(): OwnedUiSettingsResolution {
    return this.#resolution;
  }

  async load(): Promise<void> {
    this.#resolution = this.#store.read();
    const agent = this.#currentAgent();
    this.#agentSnapshot = agent === null ? null : await snapshotOf(agent, this.#hiddenAgentSettingIds);
    this.#notify();
  }

  sections(): readonly OwnedUiSettingsSection[] {
    return buildOwnedUiSettingsSections({ resolution: this.#resolution, agent: this.#agentSnapshot });
  }

  value(id: string): OwnedUiSettingValue | null {
    return this.#resolution.settings.find(setting => setting.declaration.id === id)?.value ?? null;
  }

  pendingValue(id: string): OwnedUiSettingValue | null {
    return this.#pending.get(id) ?? null;
  }

  onChange(listener: OwnedUiSettingsListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  async changeStructured(
    backend: OwnedUiSettingsBackend,
    id: string,
    value: Readonly<Record<string, unknown>>,
  ): Promise<OwnedUiSettingsChangeOutcome> {
    if (backend !== "agent") return failed("only an agent setting holds a structured value");
    return await this.#changeAgentValue(id, value as AgentJsonValue);
  }

  async change(
    backend: OwnedUiSettingsBackend,
    id: string,
    value: OwnedUiSettingValue,
  ): Promise<OwnedUiSettingsChangeOutcome> {
    const entry = findOwnedUiSettingsEntry(this.sections(), id, backend);
    if (entry === null) return failed(`unknown ${backend} setting: ${id}`);
    if (!entry.editable) return failed(entry.limitationReason ?? `${id} is not editable from this surface`);
    return backend === "a1" ? this.#changeOwned(id, value) : await this.#changeAgentValue(id, value);
  }

  #changeOwned(id: string, value: OwnedUiSettingValue): OwnedUiSettingsChangeOutcome {
    const outcome = this.#store.write(this.#resolution, id, value);
    if (!outcome.stored) return failed(outcome.failure ?? `${id} could not be stored`);

    const previous = this.#resolution;
    this.#resolution = this.#store.read();
    const previousSetting = previous.settings.find(setting => setting.declaration.id === id);
    if (previousSetting?.declaration.application === "restart") {
      this.#pending.set(id, value);
      this.#resolution = previous;
      this.#notify();
      return changed("deferred", "next-start", value as AgentJsonValue, previousSetting.value as AgentJsonValue);
    }
    this.#pending.delete(id);
    this.#notify();
    return changed("applied", "live", value as AgentJsonValue, value as AgentJsonValue);
  }

  async #changeAgentValue(id: string, value: AgentJsonValue): Promise<OwnedUiSettingsChangeOutcome> {
    const agent = this.#currentAgent();
    if (agent === null) return failed("no agent engine is attached");
    if (!agent.capabilities.write || !agent.writeSetting) {
      return failed("the agent engine does not support changing settings from this surface");
    }
    let result: AgentSettingChangeOutcome;
    try {
      // The coordinator behind the port owns effect installation, persistence,
      // flush, and rollback. A second surface-level flush would split authority.
      result = await agent.writeSetting(id, value);
    } catch (error) {
      return failed(`${id} could not be written to the agent engine: ${describe(error)}`);
    }
    this.#agentSnapshot = await snapshotOf(agent, this.#hiddenAgentSettingIds);
    this.#notify();
    return fromAgentOutcome(result);
  }

  #currentAgent(): AgentSettingsPort | null {
    return this.#agentProvider === null ? this.#agent : this.#agentProvider();
  }

  #notify(): void {
    for (const listener of this.#listeners) listener(this);
  }
}

async function snapshotOf(agent: AgentSettingsPort, hidden: ReadonlySet<string>): Promise<AgentSettingsSnapshot> {
  try {
    const listed = await agent.listSettings();
    for (const descriptor of listed) assertAgentSettingDescriptor(descriptor);
    const descriptors = listed.filter(descriptor => !hidden.has(descriptor.key));
    return {
      descriptors,
      writeAdvertised: agent.capabilities.write && typeof agent.writeSetting === "function",
      failure: null,
    };
  } catch (error) {
    return { descriptors: [], writeAdvertised: false, failure: describe(error) };
  }
}

function failed(failure: string): OwnedUiSettingsChangeOutcome {
  return {
    status: "failed",
    applied: false,
    pendingRestart: false,
    application: null,
    storedValue: null,
    effectiveValue: null,
    limitationReason: null,
    failure,
  };
}

function changed(
  status: "applied" | "deferred",
  application: AgentSettingApplicationBoundary,
  storedValue: AgentJsonValue,
  effectiveValue: AgentJsonValue,
): OwnedUiSettingsChangeOutcome {
  return {
    status,
    applied: status === "applied",
    pendingRestart: status === "deferred" && application === "next-start",
    application,
    storedValue,
    effectiveValue,
    limitationReason: null,
    failure: null,
  };
}

function fromAgentOutcome(result: AgentSettingChangeOutcome): OwnedUiSettingsChangeOutcome {
  return {
    status: result.status,
    applied: result.status === "applied",
    pendingRestart: result.status === "deferred" && result.application === "next-start",
    application: result.application,
    storedValue: result.storedValue,
    effectiveValue: result.effectiveValue,
    limitationReason: result.limitationReason,
    failure: result.failure,
  };
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
