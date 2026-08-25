import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  OWNED_UI_SETTINGS_VERSION,
  OWNED_UI_SETTING_DECLARATIONS,
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

const PROFILE_ID_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;
const MAX_DOCUMENT_BYTES = 256 * 1024;

export interface OwnedUiSettingsStoreOptions {
  /** A1 configuration root. Settings live under `<configDir>/settings/`. */
  readonly configDir: string;
  readonly profileId: string;
  readonly declarations?: readonly OwnedUiSettingDeclaration[];
  readonly migrations?: readonly OwnedUiSettingsMigration[];
}

export interface OwnedUiSettingsWriteOutcome {
  readonly stored: boolean;
  /** Present when the write failed; the caller must not report the change as saved. */
  readonly failure: string | null;
}

export class OwnedUiSettingsStore {
  readonly #file: string;
  readonly #declarations: readonly OwnedUiSettingDeclaration[];
  readonly #migrations: readonly OwnedUiSettingsMigration[];

  constructor(options: OwnedUiSettingsStoreOptions) {
    if (!PROFILE_ID_PATTERN.test(options.profileId)) {
      throw new Error(`owned UI settings profile id is not a bounded slug: ${options.profileId}`);
    }
    this.#file = path.join(path.resolve(options.configDir), "settings", `${options.profileId}.json`);
    this.#declarations = options.declarations ?? OWNED_UI_SETTING_DECLARATIONS;
    this.#migrations = options.migrations ?? OWNED_UI_SETTINGS_MIGRATIONS;
  }

  get file(): string {
    return this.#file;
  }

  /** Reads and resolves. Never throws: every failure becomes a notice. */
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

  /**
   * Writes the resolved form with `id` set to `value`, preserving undeclared keys.
   * Atomic: a temporary sibling is renamed over the target, so an interrupted
   * write leaves either the complete previous document or the complete new one.
   */
  write(resolution: OwnedUiSettingsResolution, id: string, value: OwnedUiSettingValue): OwnedUiSettingsWriteOutcome {
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
        // A leftover temporary file is inert: read() only ever opens the target path.
      }
      return { stored: false, failure: `${this.#file} could not be written: ${describe(error)}` };
    }
  }
}

function isMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "ENOENT";
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
