import { DatabaseSync } from "node:sqlite";
import { chmodSync, closeSync, lstatSync, mkdirSync, openSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { PRODUCT_IDENTITY } from "../../product-identity.js";
import { assertPromptHistorySubmission, PROMPT_HISTORY_MAX_ENTRY_BYTES, PROMPT_HISTORY_MAX_TEXT_BYTES, type PromptHistoryFailure, type PromptHistorySnapshot, type PromptHistorySubmission } from "../../contracts/owned-ui/index.js";
import { collectImageChipIdentifiers, PromptImageSidecar } from "./image-sidecar.js";

export class HistoryStorageError extends Error {
  constructor(readonly code: PromptHistoryFailure, readonly certainty: "uncommitted" | "unknown" = "uncommitted") { super(`Prompt history ${code}`); }
}

const MAX_STORAGE_BYTES = 64 * 1024 * 1024;

export class PromptHistoryStore {
  readonly #database: DatabaseSync;
  readonly #sidecar: PromptImageSidecar | undefined;
  constructor(readonly path: string, readonly profileId: string, limit: number, imagesDir?: string) {
    if (!Number.isInteger(limit) || limit < 10 || limit > 100 || limit % 10 !== 0) throw new HistoryStorageError("schema");
    this.#sidecar = imagesDir === undefined ? undefined : new PromptImageSidecar(imagesDir);
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    if (lstatSync(dirname(path)).isSymbolicLink()) throw new HistoryStorageError("unavailable");
    if (process.platform !== "win32") chmodSync(dirname(path), 0o700);
    try { closeSync(openSync(path, "wx", 0o600)); } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
    }
    if (lstatSync(path).isSymbolicLink() || !lstatSync(path).isFile()) throw new HistoryStorageError("unavailable");
    if (process.platform !== "win32") chmodSync(path, 0o600);
    this.#checkSize();
    this.#database = new DatabaseSync(path);
    try {
      this.#database.exec("PRAGMA busy_timeout = 25");
      this.#transaction(() => {
        const version = Number(this.#database.prepare("PRAGMA user_version").get()?.user_version);
        if (version === 0) {
          const tables = this.#database.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
          if (tables.length !== 0) throw new HistoryStorageError("schema");
          this.#database.exec(`CREATE TABLE history_meta (id INTEGER PRIMARY KEY CHECK(id=1), schema TEXT NOT NULL, profile TEXT NOT NULL, revision INTEGER NOT NULL, limit_count INTEGER NOT NULL);
            CREATE TABLE prompts (text TEXT PRIMARY KEY COLLATE BINARY, submission_id TEXT NOT NULL, sequence INTEGER NOT NULL UNIQUE, timestamp INTEGER NOT NULL, kind TEXT NOT NULL, cwd TEXT, session_id TEXT, bytes INTEGER NOT NULL CHECK(bytes>0 AND bytes<=1048576));
            PRAGMA user_version=1;`);
          this.#database.prepare("INSERT INTO history_meta VALUES (1,?,?,0,?)").run(PRODUCT_IDENTITY.protocol.promptHistorySchema, profileId, limit);
        } else if (version !== 1) throw new HistoryStorageError("schema");
        const meta = this.#database.prepare("SELECT schema,profile FROM history_meta WHERE id=1").get();
        if (meta?.schema !== PRODUCT_IDENTITY.protocol.promptHistorySchema || meta?.profile !== profileId) throw new HistoryStorageError("schema");
        this.#database.prepare("UPDATE history_meta SET limit_count=?,revision=revision+1 WHERE id=1").run(limit);
        this.#prune(limit);
      });
      this.#database.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA wal_autocheckpoint=128; PRAGMA journal_size_limit=8388608; PRAGMA max_page_count=8192;");
    } catch (error) { this.#database.close(); throw error; }
    // Rationale: opportunistically reclaim any sidecar whose row was pruned in a prior process
    // crash or by another concurrent opener. Bounded by the number of files on disk minus the
    // surviving reference set; failures are swallowed to preserve honest history behavior.
    this.#sweepOrphanedSidecars();
  }

  record(input: PromptHistorySubmission): void {
    assertPromptHistorySubmission(input);
    const bytes = Buffer.byteLength(input.text);
    if (bytes > PROMPT_HISTORY_MAX_ENTRY_BYTES) throw new HistoryStorageError("oversized");
    this.#checkSize(true);
    this.#transaction(() => {
      const duplicate = this.#database.prepare("SELECT submission_id FROM prompts WHERE text=?").get(input.text);
      if (duplicate?.submission_id === input.id) return;
      this.#database.exec("UPDATE history_meta SET revision=revision+1 WHERE id=1");
      const meta = this.#database.prepare("SELECT revision,limit_count FROM history_meta WHERE id=1").get()!;
      this.#database.prepare(`INSERT INTO prompts VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(text) DO UPDATE SET submission_id=excluded.submission_id,sequence=excluded.sequence,timestamp=excluded.timestamp,kind=excluded.kind,cwd=excluded.cwd,session_id=excluded.session_id,bytes=excluded.bytes`)
        .run(input.text, input.id, meta.revision!, input.timestamp, input.kind, bounded(input.cwd, 8192), bounded(input.sessionId, 256), bytes);
      this.#prune(Number(meta.limit_count));
    });
  }

  snapshot(): PromptHistorySnapshot {
    this.#database.exec("BEGIN");
    try {
      const meta = this.#database.prepare("SELECT revision,limit_count FROM history_meta WHERE id=1").get()!;
      const entries = this.#database.prepare("SELECT text,submission_id FROM prompts ORDER BY sequence DESC LIMIT 100").all();
      let bytes = 0;
      const result = entries.map(row => {
        if (typeof row.text !== "string" || typeof row.submission_id !== "string") throw new HistoryStorageError("corrupt");
        bytes += Buffer.byteLength(row.text);
        if (bytes > PROMPT_HISTORY_MAX_TEXT_BYTES) throw new HistoryStorageError("corrupt");
        return { text: row.text, submissionId: row.submission_id };
      });
      this.#database.exec("COMMIT");
      return { revision: Number(meta.revision), limit: Number(meta.limit_count), entries: result };
    } catch (error) { this.#database.exec("ROLLBACK"); throw error; }
  }

  close(): void { this.#database.close(); }

  #transaction(work: () => void): void {
    try { this.#database.exec("BEGIN IMMEDIATE"); }
    catch (error) { throw new HistoryStorageError(classifyHistoryError(error), "uncommitted"); }
    try { work(); this.#database.exec("COMMIT"); }
    catch (error) {
      // Invariant: only a successful rollback proves that replay cannot advance recency twice.
      try { this.#database.exec("ROLLBACK"); }
      catch { throw new HistoryStorageError(classifyHistoryError(error), "unknown"); }
      throw new HistoryStorageError(classifyHistoryError(error), "uncommitted");
    }
  }

  #prune(limit: number): void {
    const rows = this.#database.prepare("SELECT sequence,bytes FROM prompts ORDER BY sequence DESC").all();
    let bytes = 0;
    const dropped: number[] = [];
    for (const [index, row] of rows.entries()) {
      bytes += Number(row.bytes);
      if (index >= limit || bytes > PROMPT_HISTORY_MAX_TEXT_BYTES) dropped.push(row.sequence as number);
    }
    if (dropped.length === 0) return;
    // Invariant: sidecar reap uses text still referenced by SURVIVING rows so a row still
    // referencing an id shared with a pruned row keeps the file. Collect surviving ids before
    // deleting so a concurrent snapshot cannot see a live row whose sidecar is already gone.
    const droppedTexts = dropped.map(sequence =>
      this.#database.prepare("SELECT text FROM prompts WHERE sequence=?").get(sequence)?.text).filter((value): value is string => typeof value === "string");
    for (const sequence of dropped) this.#database.prepare("DELETE FROM prompts WHERE sequence=?").run(sequence);
    if (this.#sidecar === undefined) return;
    const survivingIds = this.#collectReferencedIdentifiers();
    for (const text of droppedTexts) {
      for (const id of collectImageChipIdentifiers(text)) {
        if (!survivingIds.has(id)) this.#sidecar.unlink(id);
      }
    }
  }

  #collectReferencedIdentifiers(): Set<string> {
    const identifiers = new Set<string>();
    const rows = this.#database.prepare("SELECT text FROM prompts").all();
    for (const row of rows) {
      if (typeof row.text !== "string") continue;
      for (const id of collectImageChipIdentifiers(row.text)) identifiers.add(id);
    }
    return identifiers;
  }

  #sweepOrphanedSidecars(): void {
    if (this.#sidecar === undefined) return;
    try { this.#sidecar.sweep(this.#collectReferencedIdentifiers()); }
    catch { /* Rationale: sidecar sweep never blocks history readiness. */ }
  }

  #checkSize(maintain = false): void {
    let size = 0;
    for (const suffix of ["", "-wal", "-shm"]) {
      try {
        if (lstatSync(this.path + suffix).isSymbolicLink()) throw new HistoryStorageError("unavailable");
        size += statSync(this.path + suffix).size;
      }
      catch (error) { if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error; }
    }
    if (size > MAX_STORAGE_BYTES && maintain) {
      this.#database.exec("PRAGMA wal_checkpoint(TRUNCATE)");
      this.#checkSize();
    } else if (size > MAX_STORAGE_BYTES) throw new HistoryStorageError("capacity");
  }
}

function bounded(value: string | undefined, bytes: number): string | null {
  return value !== undefined && Buffer.byteLength(value) <= bytes ? value : null;
}

export function classifyHistoryError(error: unknown): PromptHistoryFailure {
  if (error instanceof HistoryStorageError) return error.code;
  if (error instanceof Error && "errcode" in error) {
    const code = Number(error.errcode) & 0xff;
    if (code === 5 || code === 6) return "busy";
    if (code === 11 || code === 26) return "corrupt";
    if (code === 13) return "capacity";
  }
  return "unavailable";
}
