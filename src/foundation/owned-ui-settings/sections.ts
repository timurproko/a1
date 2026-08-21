import type { OwnedUiSettingValue } from "./declarations.js";
import type { OwnedUiSettingsResolution } from "./resolution.js";

export type OwnedUiSettingsBackend = "a1" | "agent";

export interface OwnedUiSettingsEntry {
  readonly id: string;
  /** Label to show, when its source provides one. Falls back to the id. */
  readonly label: string | null;
  readonly backend: OwnedUiSettingsBackend;
  readonly description: string | null;
  /** Present when the value is a scalar the surface can offer as a choice. */
  readonly value: OwnedUiSettingValue | null;
  /** Raw value as reported by its backend, for entries the surface can only display. */
  readonly rawValue: unknown;
  readonly editable: boolean;
  readonly choices: readonly OwnedUiSettingValue[] | null;
  /** True when the value is a structured object edited through its own surface. */
  readonly structured: boolean;
  readonly origin: "default" | "stored" | "engine";
  readonly application: "live" | "restart" | "engine";
}

export interface OwnedUiSettingsSection {
  readonly id: string;
  readonly title: string;
  readonly entries: readonly OwnedUiSettingsEntry[];
  /** Set when the section could not be built; entries is then empty. */
  readonly unavailableReason: string | null;
  /** Set when the section is present but nothing in it can be changed here. */
  readonly readOnlyReason: string | null;
}

export interface AgentSettingsSnapshot {
  readonly descriptors: readonly {
    readonly key: string;
    readonly valueType: "boolean" | "number" | "string" | "enum" | "json";
    readonly writable: boolean;
    readonly choices?: readonly unknown[];
    readonly label?: string;
    readonly description?: string;
  }[];
  readonly values: Readonly<Record<string, unknown>>;
  /** Whether the engine advertises settings write capability at all. */
  readonly writeAdvertised: boolean;
  /** Set when the engine could not report its settings. */
  readonly failure: string | null;
}

export interface BuildOwnedUiSettingsSectionsInput {
  readonly resolution: OwnedUiSettingsResolution;
  /** Null when no engine is attached, which is not a failure. */
  readonly agent: AgentSettingsSnapshot | null;
}

export const AGENT_SECTION_ID = "agent";
const BOOLEAN_CHOICES: readonly OwnedUiSettingValue[] = Object.freeze([true, false]);

export function buildOwnedUiSettingsSections(
  input: BuildOwnedUiSettingsSectionsInput,
): readonly OwnedUiSettingsSection[] {
  const ownedSection: OwnedUiSettingsSection = {
    id: "a1",
    title: "A1",
    entries: Object.freeze(input.resolution.settings.map(setting => ({
      id: setting.declaration.id,
      label: null,
      backend: "a1" as const,
      description: setting.declaration.description,
      value: setting.value,
      rawValue: setting.value,
      editable: true,
      structured: false,
      choices: setting.declaration.allowedValues,
      origin: setting.source,
      application: setting.declaration.application,
    }))),
    unavailableReason: null,
    readOnlyReason: null,
  };

  return Object.freeze([ownedSection, agentSection(input.agent)]);
}

export function findOwnedUiSettingsEntry(
  sections: readonly OwnedUiSettingsSection[],
  id: string,
  backend: OwnedUiSettingsBackend,
): OwnedUiSettingsEntry | null {
  for (const section of sections) {
    const entry = section.entries.find(candidate => candidate.id === id && candidate.backend === backend);
    if (entry) return entry;
  }
  return null;
}

function agentSection(snapshot: AgentSettingsSnapshot | null): OwnedUiSettingsSection {
  if (snapshot === null) {
    return frozenSection("Agent settings are unavailable because no agent engine is attached", null, []);
  }
  if (snapshot.failure !== null) {
    return frozenSection(`Agent settings are unavailable: ${snapshot.failure}`, null, []);
  }
  if (snapshot.descriptors.length === 0) {
    return frozenSection("The agent engine reported no settings", null, []);
  }

  const entries = snapshot.descriptors.map(descriptor => {
    const raw = Object.hasOwn(snapshot.values, descriptor.key) ? snapshot.values[descriptor.key] : null;
    return {
      id: descriptor.key,
      label: descriptor.label ?? null,
      backend: "agent" as const,
      description: descriptor.description ?? null,
      value: scalar(raw),
      rawValue: raw,
      // A structured value is editable through its own surface rather than a
      // value menu, so it stays reachable instead of being reported as fixed.
      editable: snapshot.writeAdvertised && descriptor.writable,
      structured: descriptor.valueType === "json",
      // A boolean is a two-value choice even when the engine names no choices,
      // so it opens the same menu as any other enumerated setting.
      choices: descriptor.valueType === "boolean" ? BOOLEAN_CHOICES : choicesOf(descriptor.choices),
      origin: "engine" as const,
      application: "engine" as const,
    };
  });

  const readOnlyReason = snapshot.writeAdvertised
    ? (entries.some(entry => entry.editable)
      ? null
      : "The agent engine reports no writable settings")
    : "The agent engine does not support changing settings from this surface";

  return {
    id: AGENT_SECTION_ID,
    title: "Agent",
    entries: Object.freeze(entries),
    unavailableReason: null,
    readOnlyReason,
  };
}

function frozenSection(
  unavailableReason: string,
  readOnlyReason: string | null,
  entries: readonly OwnedUiSettingsEntry[],
): OwnedUiSettingsSection {
  return { id: AGENT_SECTION_ID, title: "Agent", entries: Object.freeze(entries), unavailableReason, readOnlyReason };
}

function scalar(value: unknown): OwnedUiSettingValue | null {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : null;
}

function choicesOf(choices: readonly unknown[] | undefined): readonly OwnedUiSettingValue[] | null {
  if (choices === undefined) return null;
  const scalars = choices.map(scalar).filter((choice): choice is OwnedUiSettingValue => choice !== null);
  return scalars.length === choices.length ? Object.freeze(scalars) : null;
}
