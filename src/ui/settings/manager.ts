import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { assertAgentSettingDescriptor } from "../../contracts/agent-engine/index.js";
import type {
  AgentJsonValue,
  AgentSettingApplicationBoundary,
  AgentSettingChangeOutcome,
  AgentSettingsPort,
} from "../../contracts/agent-engine/index.js";
import {
  OWNED_SETTING_DECLARATIONS,
  OWNED_UI_SETTINGS_VERSION,
  OWNED_UI_SETTING_DECLARATIONS,
  type OwnedSettingId,
  type OwnedSettingValueOf,
  type OwnedUiSettingDeclaration,
  type OwnedUiSettingValue,
} from "./declarations.js";
import { OWNED_UI_SETTINGS_MIGRATIONS, type OwnedUiSettingsMigration } from "./migrations.js";
import {
  documentFrom,
  parseOwnedUiSettingsDocument,
  resolveOwnedUiSettings,
  type OwnedUiSettingsDocument,
  type OwnedUiSettingsResolution,
} from "./resolution.js";
import {
  buildOwnedUiSettingsSections,
  findOwnedUiSettingsEntry,
  type AgentSettingsSnapshot,
  type OwnedUiSettingsBackend,
  type OwnedUiSettingsSection,
} from "./sections.js";

const PROFILE_ID_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;
const MAX_DOCUMENT_BYTES = 256 * 1024;

export interface OwnedSettingsManagerOptions {
  /** A1 configuration root. Settings live under `<configDir>/settings/`. */
  readonly configDir: string;
  readonly profileId: string;
  readonly declarations?: readonly OwnedUiSettingDeclaration[];
  readonly migrations?: readonly OwnedUiSettingsMigration[];
  readonly agent?: AgentSettingsPort | null;
  readonly agentProvider?: () => AgentSettingsPort | null;
  readonly hiddenAgentSettingIds?: readonly string[];
}

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

export type OwnedUiSettingsListener = (manager: OwnedSettingsManager) => void;

interface WriteOutcome {
  readonly stored: boolean;
  readonly failure: string | null;
}

/**
 * One profile's A1 settings: resolves the declaration table against the stored document,
 * persists each accepted change atomically without discarding unknown keys, offers the
 * grouped sections a surface presents, and routes every accepted change only to its
 * owning backend, with agent settings reached through the engine settings port.
 */
export class OwnedSettingsManager {
  readonly #file: string;
  readonly #declarations: readonly OwnedUiSettingDeclaration[];
  readonly #migrations: readonly OwnedUiSettingsMigration[];
  readonly #agent: AgentSettingsPort | null;
  readonly #agentProvider: (() => AgentSettingsPort | null) | null;
  readonly #listeners = new Set<OwnedUiSettingsListener>();
  readonly #hiddenAgentSettingIds: ReadonlySet<string>;
  #resolution: OwnedUiSettingsResolution;
  #agentSnapshot: AgentSettingsSnapshot | null = null;
  #pending = new Map<string, OwnedUiSettingValue>();
  readonly #restartEffective = new Map<string, OwnedUiSettingValue>();

  constructor(options: OwnedSettingsManagerOptions) {
    if (!PROFILE_ID_PATTERN.test(options.profileId)) {
      throw new Error(`owned UI settings profile id is not a bounded slug: ${options.profileId}`);
    }
    this.#file = path.join(path.resolve(options.configDir), "settings", `${options.profileId}.json`);
    this.#declarations = options.declarations ?? OWNED_UI_SETTING_DECLARATIONS;
    this.#migrations = options.migrations ?? OWNED_UI_SETTINGS_MIGRATIONS;
    this.#agent = options.agent ?? null;
    this.#agentProvider = options.agentProvider ?? null;
    this.#hiddenAgentSettingIds = new Set(options.hiddenAgentSettingIds ?? []);
    this.#resolution = this.read();
    for (const setting of this.#resolution.settings) {
      if (setting.declaration.application === "restart") this.#restartEffective.set(setting.declaration.id, setting.value);
    }
  }

  get file(): string {
    return this.#file;
  }

  get resolution(): OwnedUiSettingsResolution {
    return this.#resolution;
  }

  /** Reads and resolves the stored document. Never throws: every failure becomes a notice. */
  read(): OwnedUiSettingsResolution {
    let raw: string | null = null;
    let unreadable: string | null = null;
    try {
      raw = readFileSync(this.#file, "utf8");
    } catch (error) {
      if (!isMissing(error)) unreadable = `${this.#file} could not be read: ${describe(error)}`;
    }

    if (raw !== null && Buffer.byteLength(raw, "utf8") > MAX_DOCUMENT_BYTES) {
      unreadable = `${this.#file} exceeds the ${MAX_DOCUMENT_BYTES}-byte settings limit and was ignored`;
      raw = null;
    }

    const document = raw === null ? null : parseOwnedUiSettingsDocument(raw);
    if (raw !== null && document === null && unreadable === null) {
      unreadable = `${this.#file} is not a valid settings document and was ignored`;
    }

    return resolveOwnedUiSettings({
      declarations: this.#declarations,
      migrations: this.#migrations,
      document,
      ...(unreadable === null ? {} : { unreadableDetail: unreadable }),
      currentVersion: OWNED_UI_SETTINGS_VERSION,
    });
  }

  async load(): Promise<void> {
    this.#resolution = this.read();
    const agent = this.#currentAgent();
    this.#agentSnapshot = agent === null ? null : await snapshotOf(agent, this.#hiddenAgentSettingIds);
    this.#notify();
  }

  sections(): readonly OwnedUiSettingsSection[] {
    return buildOwnedUiSettingsSections({ resolution: this.#resolution, agent: this.#agentSnapshot }).map(section => ({
      ...section,
      entries: section.entries.map(entry => entry.backend === "a1" && this.#restartEffective.has(entry.id)
        ? { ...entry, effectiveValue: this.#restartEffective.get(entry.id)! }
        : entry),
    }));
  }

  /**
   * The value in effect for a declared setting, typed by its declaration. A restart-bound
   * setting reads as the value the session started with until the next start.
   */
  value<Id extends OwnedSettingId>(id: Id): OwnedSettingValueOf<Id> {
    return (this.valueOf(id) ?? OWNED_SETTING_DECLARATIONS[id].defaultValue) as OwnedSettingValueOf<Id>;
  }

  /** The value in effect for any setting id, or null when nothing declares it. */
  valueOf(id: string): OwnedUiSettingValue | null {
    return this.#restartEffective.get(id) ?? this.#resolution.settings.find(setting => setting.declaration.id === id)?.value ?? null;
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
    if (!entry.editable) return failed(`${id} is not editable from this surface`);
    return backend === "a1" ? this.#changeOwned(id, value) : await this.#changeAgentValue(id, value);
  }

  #changeOwned(id: string, value: OwnedUiSettingValue): OwnedUiSettingsChangeOutcome {
    const outcome = this.#write(this.#resolution, id, value);
    if (!outcome.stored) return failed(outcome.failure ?? `${id} could not be stored`);

    const previous = this.#resolution;
    this.#resolution = this.read();
    const previousSetting = previous.settings.find(setting => setting.declaration.id === id);
    if (previousSetting?.declaration.application === "restart") {
      this.#pending.set(id, value);
      this.#notify();
      return changed("deferred", "next-start", value as AgentJsonValue, this.#restartEffective.get(id) as AgentJsonValue);
    }
    this.#pending.delete(id);
    this.#notify();
    return changed("applied", "live", value as AgentJsonValue, value as AgentJsonValue);
  }

  // Invariant: the resolved form is written with `id` set to `value` and undeclared keys preserved.
  // Concurrency: a temporary sibling is renamed over the target, so an interrupted write leaves
  // either the complete previous document or the complete new one.
  #write(resolution: OwnedUiSettingsResolution, id: string, value: OwnedUiSettingValue): WriteOutcome {
    const declaration = this.#declarations.find(candidate => candidate.id === id);
    if (!declaration) return { stored: false, failure: `unknown owned UI setting: ${id}` };
    if (!declaration.allowedValues.includes(value)) {
      return { stored: false, failure: `value ${JSON.stringify(value)} is not allowed for ${id}` };
    }

    const current = documentFrom(resolution);
    const next: OwnedUiSettingsDocument = {
      version: OWNED_UI_SETTINGS_VERSION,
      values: { ...current.values, [id]: value },
    };

    const temporary = `${this.#file}.${process.pid}.tmp`;
    try {
      mkdirSync(path.dirname(this.#file), { recursive: true, mode: 0o700 });
      writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
      renameSync(temporary, this.#file);
      return { stored: true, failure: null };
    } catch (error) {
      try {
        rmSync(temporary, { force: true });
      } catch {
        // Security: a leftover temporary file is inert: read() only ever opens the target path.
      }
      return { stored: false, failure: `${this.#file} could not be written: ${describe(error)}` };
    }
  }

  async #changeAgentValue(id: string, value: AgentJsonValue): Promise<OwnedUiSettingsChangeOutcome> {
    const agent = this.#currentAgent();
    if (agent === null) return failed("no agent engine is attached");
    if (!agent.capabilities.write || !agent.writeSetting) {
      return failed("the agent engine does not support changing settings from this surface");
    }
    let result: AgentSettingChangeOutcome;
    try {
      // Invariant: the bridge behind the port owns effect installation, persistence,
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
    const writeAdvertised = agent.capabilities.write && typeof agent.writeSetting === "function";
    const descriptors = listed.filter(descriptor =>
      !hidden.has(descriptor.key) && writeAdvertised && descriptor.writable && descriptor.available,
    );
    return {
      descriptors,
      writeAdvertised,
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

function isMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "ENOENT";
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
