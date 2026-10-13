import { randomUUID } from "node:crypto";
import { chmod, mkdir, open, readFile, rename, stat, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { ResidentTabFaultInjection } from "./fault-injection.js";

const MAX_JOURNAL_BYTES = 8 * 1024 * 1024;
const MAX_RECORD_BYTES = 2 * 1024 * 1024;

export interface SubmittedPromptRecord {
  readonly type: "submitted";
  readonly id: string;
  readonly sessionId: string;
  readonly sessionFile: string | null;
  readonly incarnation: number;
  readonly fileExisted: boolean;
  readonly kind: "prompt" | "steer" | "follow-up";
  readonly text: string;
  readonly images?: readonly unknown[];
  readonly at: string;
}
export interface CorrelatedPromptRecord { readonly type: "correlated"; readonly id: string; readonly entryId: string }
export interface SettledPromptRecord { readonly type: "settled"; readonly id: string; readonly entryId: string }
export interface RetiredPromptRecord { readonly type: "retired"; readonly id: string }
export type PromptJournalRecord = SubmittedPromptRecord | CorrelatedPromptRecord | SettledPromptRecord | RetiredPromptRecord;

export interface PromptSubmission {
  readonly sessionId: string;
  readonly sessionFile: string | null;
  readonly incarnation: number;
  readonly fileExisted: boolean;
  readonly kind: SubmittedPromptRecord["kind"];
  readonly text: string;
  readonly images?: readonly unknown[];
}

export interface SessionJournalEntry {
  readonly entryId: string;
  readonly text: string;
  readonly settled: boolean;
}

export interface PendingPrompt {
  readonly submitted: SubmittedPromptRecord;
  readonly correlatedEntryId?: string;
}

export class PromptJournal {
  readonly path: string;
  readonly #faults: ResidentTabFaultInjection;
  readonly #maximumBytes: number;
  #operation: Promise<void> = Promise.resolve();
  readonly #retired = new Set<string>();

  constructor(path: string, options: { readonly faults?: ResidentTabFaultInjection; readonly maximumBytes?: number } = {}) {
    this.path = path;
    this.#faults = options.faults ?? new ResidentTabFaultInjection();
    this.#maximumBytes = options.maximumBytes ?? MAX_JOURNAL_BYTES;
  }

  async initialize(): Promise<void> {
    await secureDirectory(dirname(this.path));
    const handle = await open(this.path, "a", 0o600);
    await handle.close();
    if (process.platform !== "win32") await chmod(this.path, 0o600);
    for (const record of await this.read()) if (record.type === "retired") this.#retired.add(record.id);
  }

  async submit(submission: PromptSubmission): Promise<SubmittedPromptRecord> {
    const record: SubmittedPromptRecord = {
      type: "submitted",
      id: randomUUID(),
      ...submission,
      ...(submission.images === undefined ? {} : { images: submission.images }),
      at: new Date().toISOString(),
    };
    await this.#append(record, "journal-before-append", "journal-after-append", "journal-after-sync");
    return record;
  }

  async adopt(record: SubmittedPromptRecord): Promise<boolean> {
    if ((await this.read()).some(existing => existing.type === "submitted" && existing.id === record.id)) return false;
    await this.#append(record, "journal-before-append", "journal-after-append", "journal-after-sync");
    return true;
  }

  async correlate(id: string, entryId: string): Promise<void> {
    await this.#append({ type: "correlated", id, entryId }, "journal-before-correlation", "journal-after-correlation");
  }

  async settle(id: string, entryId: string): Promise<void> {
    await this.#append({ type: "settled", id, entryId }, "journal-before-settled-record", "journal-after-settled-record");
  }

  async retire(id: string): Promise<void> {
    if (this.#retired.has(id)) return;
    await this.#append({ type: "retired", id }, "journal-during-retirement");
    this.#retired.add(id);
  }

  async read(): Promise<readonly PromptJournalRecord[]> {
    let text: string;
    try { text = await readFile(this.path, "utf8"); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    const records: PromptJournalRecord[] = [];
    const lines = text.split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]!;
      if (!line) continue;
      try {
        const value: unknown = JSON.parse(line);
        records.push(decodeRecord(value));
      } catch (error) {
        if (index === lines.length - 1 && !text.endsWith("\n")) break;
        throw error;
      }
    }
    return records;
  }

  async pending(sessionEntries: readonly SessionJournalEntry[] = []): Promise<readonly PendingPrompt[]> {
    const states = new Map<string, PendingPrompt>();
    const settled = new Set<string>();
    const retired = new Set<string>();
    for (const record of await this.read()) {
      if (record.type === "submitted") states.set(record.id, { submitted: record });
      else if (record.type === "correlated") {
        const state = states.get(record.id);
        if (state !== undefined) states.set(record.id, { ...state, correlatedEntryId: record.entryId });
      } else if (record.type === "settled") settled.add(record.id);
      else retired.add(record.id);
    }
    const byId = new Map(sessionEntries.map(entry => [entry.entryId, entry]));
    const pending: PendingPrompt[] = [];
    const claimedEntries = new Set<string>();
    for (const [id, state] of states) {
      if (retired.has(id) || settled.has(id)) {
        await this.retire(id);
        continue;
      }
      const correlated = state.correlatedEntryId === undefined ? undefined : byId.get(state.correlatedEntryId);
      const textMatch = correlated ?? sessionEntries.find(entry =>
        entry.text === state.submitted.text && !claimedEntries.has(entry.entryId));
      if (textMatch !== undefined) claimedEntries.add(textMatch.entryId);
      if (textMatch?.settled === true) await this.retire(id);
      else pending.push(state);
    }
    return pending;
  }

  async compactIfRetired(): Promise<boolean> {
    if ((await this.pending()).length !== 0) return false;
    await this.#serialize(async () => {
      this.#faults.at("journal-during-compaction");
      const temporary = `${this.path}.tmp-${process.pid}-${randomUUID()}`;
      const handle = await open(temporary, "wx", 0o600);
      try { await handle.sync(); } finally { await handle.close(); }
      await rename(temporary, this.path);
      await syncDirectory(dirname(this.path));
    });
    return true;
  }

  async #append(record: PromptJournalRecord, ...points: readonly string[]): Promise<void> {
    const line = `${JSON.stringify(record)}\n`;
    const bytes = Buffer.byteLength(line);
    if (bytes > MAX_RECORD_BYTES) throw new Error("resident prompt journal record exceeds its size limit");
    await this.#serialize(async () => {
      for (const point of points.slice(0, 1)) this.#faults.at(point!);
      const current = await stat(this.path).then(value => value.size, error => (error as NodeJS.ErrnoException).code === "ENOENT" ? 0 : Promise.reject(error));
      if (current + bytes > this.#maximumBytes) throw new Error("resident prompt journal is full");
      const handle = await open(this.path, "a", 0o600);
      try {
        await handle.write(line, undefined, "utf8");
        if (points[1] !== undefined) this.#faults.at(points[1]);
        await handle.sync();
        if (points[2] !== undefined) this.#faults.at(points[2]);
      } finally { await handle.close(); }
    });
  }

  async #serialize(operation: () => Promise<void>): Promise<void> {
    const next = this.#operation.then(operation, operation);
    this.#operation = next.catch(() => undefined);
    await next;
  }
}

export function classifyMissingSession(record: SubmittedPromptRecord, sessionExists: boolean): "available" | "first-turn" | "missing-transcript" {
  if (sessionExists) return "available";
  return record.fileExisted ? "missing-transcript" : "first-turn";
}

function decodeRecord(value: unknown): PromptJournalRecord {
  if (typeof value !== "object" || value === null) throw new Error("invalid resident prompt journal record");
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || record.id.length === 0) throw new Error("invalid resident prompt journal id");
  if (record.type === "submitted") {
    if (typeof record.sessionId !== "string" || !(typeof record.sessionFile === "string" || record.sessionFile === null)
      || typeof record.incarnation !== "number" || typeof record.fileExisted !== "boolean"
      || !["prompt", "steer", "follow-up"].includes(String(record.kind)) || typeof record.text !== "string" || typeof record.at !== "string") {
      throw new Error("invalid submitted prompt journal record");
    }
    return record as unknown as SubmittedPromptRecord;
  }
  if ((record.type === "correlated" || record.type === "settled") && typeof record.entryId === "string") return record as unknown as CorrelatedPromptRecord | SettledPromptRecord;
  if (record.type === "retired") return record as unknown as RetiredPromptRecord;
  throw new Error("invalid resident prompt journal record type");
}

async function secureDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true, mode: 0o700 });
  if (process.platform !== "win32") await chmod(path, 0o700);
}

async function syncDirectory(path: string): Promise<void> {
  if (process.platform === "win32") return;
  const handle = await open(path, "r");
  try { await handle.sync(); } finally { await handle.close(); }
}

export async function removeJournalTemporary(path: string): Promise<void> {
  await unlink(path).catch(error => { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; });
}
