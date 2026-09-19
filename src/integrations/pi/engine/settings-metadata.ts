import { readFileSync } from "node:fs";
import type { AgentSettingFlag } from "../../../contracts/agent-engine/index.js";

export interface PiSettingPresentation {
  readonly label: string;
  readonly description: string;
  readonly opensDialog: boolean;
  readonly values?: readonly string[];
}

export interface PiSettingBounds {
  readonly minimum: number;
  readonly maximum?: number;
}

/**
 * The pinned engine's own presentation of its settings: which keys it presents, in which
 * order, with which wording, dialog parts, and numeric bounds.
 */
export interface PiSettingsMetadata {
  readonly presented: readonly string[];
  readonly order: readonly string[];
  readonly settings: Readonly<Record<string, PiSettingPresentation>>;
  readonly dialogs: Readonly<Record<string, readonly AgentSettingFlag[]>>;
  readonly bounds: Readonly<Record<string, PiSettingBounds>>;
}

/** File name of the metadata beside this module, written by `scripts/pi/build-pi-settings-metadata.mjs`. */
export const PI_SETTINGS_METADATA_FILE = "pi-settings-metadata.json";

let loaded: PiSettingsMetadata | undefined;

/**
 * Reads the generated metadata beside this module. It is produced from the pinned engine at
 * build time rather than committed, so what A1 presents cannot drift from what the engine
 * presents; a source tree that has not been built reports the missing file by name.
 */
export function loadPiSettingsMetadata(): PiSettingsMetadata {
  if (loaded !== undefined) return loaded;
  const url = new URL(`./${PI_SETTINGS_METADATA_FILE}`, import.meta.url);
  let raw: string;
  try {
    raw = readFileSync(url, "utf8");
  } catch (error) {
    throw new Error(`Pi settings metadata is not generated at ${url.href}; run npm run build (${describe(error)})`);
  }
  loaded = assertPiSettingsMetadata(JSON.parse(raw));
  return loaded;
}

export function assertPiSettingsMetadata(value: unknown): PiSettingsMetadata {
  if (!isRecord(value)) throw new TypeError("Pi settings metadata is not an object");
  const { presented, order, settings, dialogs, bounds } = value;
  if (!isStringList(presented) || !isStringList(order)) throw new TypeError("Pi settings metadata lists are invalid");
  if (!isRecord(settings) || !isRecord(dialogs) || !isRecord(bounds)) throw new TypeError("Pi settings metadata tables are invalid");
  return {
    presented,
    order,
    settings: checkedTable(settings, isPresentation, "presentation"),
    dialogs: checkedTable(dialogs, isFlagList, "dialog"),
    bounds: checkedTable(bounds, isBounds, "bound"),
  };
}

function checkedTable<T>(table: Record<string, unknown>, guard: (entry: unknown) => entry is T, what: string): Readonly<Record<string, T>> {
  const checked: Record<string, T> = {};
  for (const [key, entry] of Object.entries(table)) {
    if (!guard(entry)) throw new TypeError(`Pi settings metadata ${what} is invalid: ${key}`);
    checked[key] = entry;
  }
  return checked;
}

function isPresentation(entry: unknown): entry is PiSettingPresentation {
  return isRecord(entry) && typeof entry.label === "string" && typeof entry.description === "string"
    && typeof entry.opensDialog === "boolean" && (entry.values === undefined || isStringList(entry.values));
}

function isFlagList(entry: unknown): entry is readonly AgentSettingFlag[] {
  return Array.isArray(entry) && entry.every(flag => isRecord(flag) && typeof flag.key === "string" && typeof flag.label === "string");
}

function isBounds(entry: unknown): entry is PiSettingBounds {
  return isRecord(entry) && typeof entry.minimum === "number" && (entry.maximum === undefined || typeof entry.maximum === "number");
}

function isStringList(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(item => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
