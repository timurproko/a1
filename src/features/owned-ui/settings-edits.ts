import type {
  OwnedUiSettingValue,
  OwnedUiSettingsChangeOutcome,
  OwnedUiSettingsEntry,
  OwnedSettingsManager,
} from "../../ui/settings/index.js";

type SettingsRecord = Record<string, boolean | string>;

/** The structured dialog an undo may need to roll back in place; null when none is open. */
export interface OpenStructuredRecord {
  readonly entry: OwnedUiSettingsEntry;
  readonly record: SettingsRecord;
}

interface ScalarUndoRecord {
  readonly kind: "scalar";
  readonly sequence: number;
  readonly entry: OwnedUiSettingsEntry;
  readonly previous: OwnedUiSettingValue;
}

interface StructuredUndoRecord {
  readonly kind: "structured";
  readonly sequence: number;
  readonly entry: OwnedUiSettingsEntry;
  readonly previous: Readonly<SettingsRecord>;
  readonly forward: Readonly<SettingsRecord>;
}

type SettingsUndoRecord = ScalarUndoRecord | StructuredUndoRecord;

/**
 * The settings screen's edits: values shown ahead of the source, and an undo history ordered by edit
 * sequence. Undo requests drain one at a time so each restores against the result of the one before.
 */
export class SettingsEdits {
  readonly #session: Pick<OwnedSettingsManager, "change" | "changeStructured">;
  readonly #openStructured: () => OpenStructuredRecord | null;
  readonly #pending = new Map<string, OwnedUiSettingValue>();
  readonly #history: SettingsUndoRecord[] = [];
  #sequence = 0;
  #requests = 0;
  #active = false;
  #closed = false;

  constructor(session: Pick<OwnedSettingsManager, "change" | "changeStructured">, openStructured: () => OpenStructuredRecord | null) {
    this.#session = session;
    this.#openStructured = openStructured;
  }

  /** The value a row shows: a pending edit, or the source's value. */
  shown(entry: OwnedUiSettingsEntry): OwnedUiSettingValue | null {
    return this.#pending.get(pendingKey(entry)) ?? entry.value;
  }

  apply(entry: OwnedUiSettingsEntry, value: OwnedUiSettingValue): void {
    const key = pendingKey(entry);
    const previous = this.shown(entry);
    const sequence = ++this.#sequence;
    // Invariant: shown immediately so the row never lags a keypress, and so the next press
    // steps from here rather than from a value the source has not caught up to.
    this.#pending.set(key, value);
    void this.#session.change(entry.backend, entry.id, value).then(outcome => {
      const failed = changeFailure(outcome) !== null;
      if (!failed && previous !== null && previous !== value) this.#record({ kind: "scalar", sequence, entry, previous });
      // Concurrency: a later press may have moved on; only the last request clears itself.
      if (this.#pending.get(key) === value) this.#pending.delete(key);
    });
  }

  /** Saves a structured dialog's record; `rollback` runs when the change fails. */
  saveStructured(entry: OwnedUiSettingsEntry, previous: Readonly<SettingsRecord>, forward: Readonly<SettingsRecord>, rollback: () => void): void {
    const sequence = ++this.#sequence;
    void this.#session.changeStructured(entry.backend, entry.id, structuredValue(entry, forward)).then(outcome => {
      if (changeFailure(outcome) === null) this.#record({ kind: "structured", sequence, entry, previous, forward });
      else rollback();
    });
  }

  undo(): void {
    this.#requests++;
    this.#drain();
  }

  open(): void { this.#closed = false; }

  /** Drops the history and queued requests; late results no longer record undo steps. */
  close(): void {
    this.#closed = true;
    this.#history.length = 0;
    this.#requests = 0;
  }

  #record(record: SettingsUndoRecord): void {
    if (this.#closed) return;
    const after = this.#history.findIndex(candidate => candidate.sequence > record.sequence);
    if (after < 0) this.#history.push(record);
    else this.#history.splice(after, 0, record);
  }

  #drain(): void {
    if (this.#active || this.#requests === 0) return;
    const record = this.#history.pop();
    if (record === undefined) {
      this.#requests = 0;
      return;
    }
    this.#requests--;
    this.#active = true;

    if (record.kind === "scalar") {
      const key = pendingKey(record.entry);
      this.#pending.set(key, record.previous);
      void this.#session.change(record.entry.backend, record.entry.id, record.previous).then(outcome => {
        if (this.#pending.get(key) === record.previous) this.#pending.delete(key);
        this.#finish(record, outcome);
      });
      return;
    }

    const open = this.#openStructured();
    const target = open !== null && sameEntry(open.entry, record.entry) ? open : null;
    if (target !== null) replaceRecord(target.record, record.previous);
    void this.#session.changeStructured(record.entry.backend, record.entry.id, structuredValue(record.entry, record.previous)).then(outcome => {
      if (changeFailure(outcome) !== null && target !== null && this.#openStructured() === target && sameRecord(target.record, record.previous)) {
        replaceRecord(target.record, record.forward);
      }
      this.#finish(record, outcome);
    });
  }

  #finish(record: SettingsUndoRecord, outcome: OwnedUiSettingsChangeOutcome): void {
    if (changeFailure(outcome) !== null) this.#record(record);
    this.#active = false;
    this.#drain();
  }
}

function pendingKey(entry: OwnedUiSettingsEntry): string {
  return `${entry.backend}:${entry.id}`;
}

/** The record the engine stores: a choice part at its fallback is unset, so the engine's default applies. */
export function structuredValue(entry: OwnedUiSettingsEntry, record: Readonly<SettingsRecord>): SettingsRecord {
  return Object.fromEntries(Object.entries(record).filter(([key, value]) => {
    const part = entry.flags.find(candidate => candidate.key === key);
    return part?.choices === undefined || value !== part.fallback;
  }));
}

export function sameRecord(left: Readonly<SettingsRecord>, right: Readonly<SettingsRecord>): boolean {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  return leftEntries.length === rightEntries.length
    && leftEntries.every(([key, value]) => right[key] === value);
}

export function replaceRecord(target: SettingsRecord, source: Readonly<SettingsRecord>): void {
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, source);
}

/** Why a change did not take effect, or null when it did. */
export function changeFailure(outcome: OwnedUiSettingsChangeOutcome): string | null {
  if (outcome.failure !== null) return outcome.failure;
  if (outcome.status === "failed") return "the effect failed";
  if (outcome.status === "unavailable") return outcome.limitationReason ?? "the setting is unavailable";
  return outcome.limitationReason;
}

function sameEntry(left: OwnedUiSettingsEntry, right: OwnedUiSettingsEntry): boolean {
  return left.backend === right.backend && left.id === right.id;
}
