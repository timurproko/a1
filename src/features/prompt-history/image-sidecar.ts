import { chmodSync, mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync, lstatSync } from "node:fs";
import { posix, win32 } from "node:path";

export interface PromptImageSidecarAttachment {
  readonly type: "image";
  readonly data: string;
  readonly mimeType: string;
}

const IMAGE_TAG_PATTERN = /\[📷 screenshot-([a-f0-9]+)(?:-resized)?\]/gu;
const IMAGE_FILENAME_PATTERN = /^([a-f0-9]+)\.json$/u;
const MAX_SIDECAR_BYTES = 12 * 1024 * 1024;

export interface PromptImageSidecarRecord {
  readonly tag: string;
  readonly data: string;
  readonly mimeType: string;
  readonly savedAt: string;
}

/** Extract every image chip identifier referenced by a recall text; identifiers are the hex bytes
 * embedded in the tag by `PromptChipStore`. Ordering is left-to-right; duplicates are dropped. */
export function collectImageChipIdentifiers(text: string): string[] {
  const seen = new Set<string>();
  IMAGE_TAG_PATTERN.lastIndex = 0;
  for (;;) {
    const match = IMAGE_TAG_PATTERN.exec(text);
    if (match === null) break;
    seen.add(match[1]!);
  }
  return [...seen];
}

/** Per-profile filesystem sidecar owning image chip payloads that survive a process restart.
 * Writes are idempotent, reads are validated, and unlinks tolerate missing files. Callers must
 * treat every failure as "the sidecar is unavailable"; that maps to the silent-strip contract. */
export class PromptImageSidecar {
  readonly #directory: string;

  constructor(directory: string) {
    this.#directory = directory;
  }

  get directory(): string { return this.#directory; }

  write(id: string, record: PromptImageSidecarRecord): void {
    if (!isValidId(id)) return;
    this.#ensureDirectory();
    const target = this.#pathFor(id);
    try {
      // Concurrency: another process may have written the same id; a subsequent overwrite is
      // idempotent because sidecar payloads are keyed to a chip tag whose id already collided.
      const temporary = `${target}.tmp`;
      writeFileSync(temporary, JSON.stringify(record), { encoding: "utf8", mode: 0o600, flag: "w" });
      try { if (process.platform !== "win32") chmodSync(temporary, 0o600); } catch { /* Portability: chmod is best-effort where the platform ignores it. */ }
      renameSync(temporary, target);
    } catch {
      // Security: sidecar write failures never propagate into shell diagnostics or history rows.
    }
  }

  read(id: string): PromptImageSidecarRecord | null {
    if (!isValidId(id)) return null;
    try {
      const target = this.#pathFor(id);
      const status = lstatSync(target);
      if (status.isSymbolicLink() || !status.isFile() || status.size > MAX_SIDECAR_BYTES) return null;
      const parsed: unknown = JSON.parse(readFileSync(target, "utf8"));
      if (typeof parsed !== "object" || parsed === null) return null;
      const record = parsed as Partial<PromptImageSidecarRecord>;
      if (typeof record.tag !== "string" || typeof record.data !== "string"
        || typeof record.mimeType !== "string" || typeof record.savedAt !== "string"
        || record.data.length === 0 || record.tag.length === 0 || record.mimeType.length === 0) return null;
      return { tag: record.tag, data: record.data, mimeType: record.mimeType, savedAt: record.savedAt };
    } catch { return null; }
  }

  readAttachment(id: string): PromptImageSidecarAttachment | null {
    const record = this.read(id);
    if (record === null) return null;
    return Object.freeze({ type: "image" as const, data: record.data, mimeType: record.mimeType });
  }

  /** Enumerate every sidecar identifier that currently has a file on disk. Ignores unrelated
   * files silently; corrupt payloads are still listed so a caller sweep can reclaim them. */
  list(): string[] {
    try {
      const entries = readdirSync(this.#directory, { withFileTypes: true });
      const ids: string[] = [];
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const match = IMAGE_FILENAME_PATTERN.exec(entry.name);
        if (match !== null) ids.push(match[1]!);
      }
      return ids;
    } catch { return []; }
  }

  unlink(id: string): void {
    if (!isValidId(id)) return;
    try { unlinkSync(this.#pathFor(id)); }
    catch { /* Reliability: ENOENT / EBUSY is indistinguishable from a already-reaped sidecar. */ }
  }

  /** Delete sidecars whose identifier is not present in `keep`. Used both by retention pruning
   * of a specific row and by the store-open orphan sweep against every surviving row. */
  sweep(keep: Iterable<string>): void {
    const survivors = new Set(keep);
    for (const id of this.list()) {
      if (!survivors.has(id)) this.unlink(id);
    }
  }

  #ensureDirectory(): void {
    try {
      mkdirSync(this.#directory, { recursive: true, mode: 0o700 });
      if (process.platform !== "win32") chmodSync(this.#directory, 0o700);
    } catch {
      // Reliability: the directory may already exist with a different mode we cannot change.
    }
  }

  #pathFor(id: string): string {
    const paths = process.platform === "win32" ? win32 : posix;
    return paths.join(this.#directory, `${id}.json`);
  }
}

function isValidId(value: string): boolean {
  return typeof value === "string" && value.length > 0 && value.length <= 64 && /^[a-f0-9]+$/u.test(value);
}
