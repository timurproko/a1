import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { DraftCheckpointer } from "./draft-checkpoint.js";
import { ResidentTabFaultInjection } from "./fault-injection.js";
import { PromptJournal, type PromptSubmission, type SessionJournalEntry, type SubmittedPromptRecord } from "./prompt-journal.js";
import { SettledTurnSynchronizer, synchronizeSessionFile } from "./session-sync.js";

export interface ResidentTabRecoveredInput {
  readonly prompts: readonly SubmittedPromptRecord[];
  readonly draft: string | null;
}

export interface ResidentTabAdmission extends Omit<PromptSubmission, "fileExisted" | "incarnation"> {
  readonly incarnation: number;
}

export class ResidentTabRecovery {
  readonly #journal: PromptJournal;
  readonly #draft: DraftCheckpointer;
  readonly #synchronizer: SettledTurnSynchronizer;
  readonly #faults: ResidentTabFaultInjection;
  readonly #onDegraded: (degraded: boolean) => void;
  readonly #active: { id: string; entryId: string }[] = [];
  #recovered: ResidentTabRecoveredInput = { prompts: [], draft: null };

  constructor(dataDir: string, options: {
    readonly faults?: ResidentTabFaultInjection;
    readonly onDegraded?: (degraded: boolean) => void;
  } = {}) {
    const faults = options.faults ?? new ResidentTabFaultInjection();
    this.#faults = faults;
    this.#onDegraded = options.onDegraded ?? (() => {});
    this.#journal = new PromptJournal(join(dataDir, "journal.jsonl"), { faults });
    this.#draft = new DraftCheckpointer(join(dataDir, "draft.json"), { faults, onDegraded: this.#onDegraded });
    this.#synchronizer = new SettledTurnSynchronizer(this.#journal, faults);
  }

  get recovered(): ResidentTabRecoveredInput { return this.#recovered; }

  async initialize(currentSessionFile: string | null = null, currentSessionId: string | null = null): Promise<ResidentTabRecoveredInput> {
    await this.#journal.initialize();
    await adoptHistoricalJournals(
      dirname(dirname(this.#journal.path)),
      this.#journal,
      currentSessionFile,
      currentSessionId,
    );
    const records = await this.#journal.read();
    const sessionFiles = new Set(records.flatMap(record =>
      record.type === "submitted" && record.sessionFile !== null ? [record.sessionFile] : []));
    if (currentSessionFile !== null) sessionFiles.add(currentSessionFile);
    const sessionEntries = (await Promise.all([...sessionFiles].map(readSessionJournal))).flat();
    const [pending, draft] = await Promise.all([
      this.#journal.pending(sessionEntries),
      this.#draft.restore(),
    ]);
    this.#recovered = { prompts: pending.map(value => value.submitted), draft: draft?.text ?? null };
    return this.#recovered;
  }

  async admit(input: ResidentTabAdmission, timeoutMs = 2_000): Promise<SubmittedPromptRecord> {
    const fileExisted = input.sessionFile === null ? false : await stat(input.sessionFile).then(() => true, error => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw error;
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        this.#journal.submit({ ...input, fileExisted }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("resident prompt journal admission timed out")), timeoutMs);
          timer.unref();
        }),
      ]);
    } finally { if (timer !== undefined) clearTimeout(timer); }
  }

  dispatched(): void { this.#faults.at("journal-after-dispatch"); }

  async correlated(submissionId: string, entryId: string): Promise<void> {
    await this.#journal.correlate(submissionId, entryId);
    this.#active.push({ id: submissionId, entryId });
  }

  checkpoint(text: string): void { this.#draft.change(text); }

  async settled(sessionFile: string | null): Promise<void> {
    const active = this.#active.splice(0);
    if (active.length === 0 || sessionFile === null) return;
    await this.#synchronizer.settleMany(sessionFile, active);
    for (const entry of active) await this.#journal.retire(entry.id);
    await this.#journal.compactIfRetired();
  }

  async gracefulStop(sessionFile: string | null): Promise<void> {
    await this.#draft.flush();
    if (sessionFile !== null) await synchronizeSessionFile(sessionFile);
    await this.#synchronizer.flush();
  }
}

const MAX_SESSION_RECONCILE_BYTES = 64 * 1024 * 1024;
const MAX_ADOPTION_AGE_MS = 7 * 24 * 60 * 60 * 1_000;

async function adoptHistoricalJournals(
  profileTabsRoot: string,
  target: PromptJournal,
  currentSessionFile: string | null,
  currentSessionId: string | null,
): Promise<void> {
  if (currentSessionFile === null && currentSessionId === null) return;
  const history = join(profileTabsRoot, "registry-history");
  const names = await readdir(history).catch(() => [] as string[]);
  for (const name of names.filter(value => /^tabset-.+\.json$/.test(value)).sort().reverse()) {
    const path = join(history, name);
    const metadata = await stat(path).catch(() => null);
    if (metadata === null || Date.now() - metadata.mtimeMs > MAX_ADOPTION_AGE_MS) continue;
    let document: unknown;
    try { document = JSON.parse(await readFile(path, "utf8")); } catch { continue; }
    const tabs = typeof document === "object" && document !== null && Array.isArray((document as Record<string, unknown>).tabs)
      ? (document as { tabs: unknown[] }).tabs : [];
    for (const value of tabs) {
      if (typeof value !== "object" || value === null) continue;
      const tab = value as Record<string, unknown>;
      if (typeof tab.tabId !== "string") continue;
      const fileMatches = currentSessionFile !== null && typeof tab.sessionFile === "string"
        && resolve(tab.sessionFile) === resolve(currentSessionFile);
      const sourcePath = join(profileTabsRoot, tab.tabId, "journal.jsonl");
      if (resolve(sourcePath) === resolve(target.path)) continue;
      if (!await stat(sourcePath).then(() => true, () => false)) continue;
      const source = new PromptJournal(sourcePath);
      await source.initialize();
      const records = await source.read();
      const submitted = records.filter((record): record is SubmittedPromptRecord => record.type === "submitted");
      const idMatches = currentSessionId !== null && submitted.some(record => record.sessionId === currentSessionId);
      if (!fileMatches && !idMatches) continue;
      const pending = await source.pending(currentSessionFile === null ? [] : await readSessionJournal(currentSessionFile));
      for (const entry of pending) {
        await target.adopt(entry.submitted);
        await source.retire(entry.submitted.id);
      }
    }
  }
}


/** Reconcile only durable user/assistant ancestry; a torn final JSONL record is not authority. */
export async function readSessionJournal(path: string): Promise<readonly SessionJournalEntry[]> {
  let text: string;
  try {
    const metadata = await stat(path);
    if (metadata.size > MAX_SESSION_RECONCILE_BYTES) throw new Error("resident session exceeds the recovery scan limit");
    text = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const raw: { id: string; parentId: string | null; role: string; text: string }[] = [];
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (line.length === 0) continue;
    let value: unknown;
    try { value = JSON.parse(line); }
    catch (error) {
      if (index === lines.length - 1 && !text.endsWith("\n")) break;
      throw error;
    }
    if (typeof value !== "object" || value === null) continue;
    const record = value as Record<string, unknown>;
    const message = typeof record.message === "object" && record.message !== null
      ? record.message as Record<string, unknown>
      : null;
    if (record.type !== "message" || typeof record.id !== "string" || message === null
      || typeof message.role !== "string") continue;
    const content = message.content;
    const promptText = typeof content === "string" ? content : Array.isArray(content)
      ? content.flatMap(part => typeof part === "object" && part !== null
        && (part as Record<string, unknown>).type === "text"
        && typeof (part as Record<string, unknown>).text === "string"
        ? [(part as Record<string, unknown>).text as string] : []).join("")
      : "";
    raw.push({
      id: record.id,
      parentId: typeof record.parentId === "string" ? record.parentId : null,
      role: message.role,
      text: promptText,
    });
  }
  const byId = new Map(raw.map(record => [record.id, record]));
  const settled = new Set<string>();
  for (const record of raw) {
    if (record.role !== "assistant") continue;
    let parent = record.parentId;
    const visited = new Set<string>();
    while (parent !== null && !visited.has(parent)) {
      visited.add(parent);
      const ancestor = byId.get(parent);
      if (ancestor === undefined) break;
      if (ancestor.role === "user") { settled.add(ancestor.id); break; }
      parent = ancestor.parentId;
    }
  }
  return raw
    .filter(record => record.role === "user")
    .map(record => ({ entryId: record.id, text: record.text, settled: settled.has(record.id) }));
}
