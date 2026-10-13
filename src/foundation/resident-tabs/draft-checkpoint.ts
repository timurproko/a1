import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { ResidentTabFaultInjection } from "./fault-injection.js";

export interface DraftCheckpointState {
  readonly text: string;
  readonly savedAt: string;
}

export interface DraftCheckpointOptions {
  readonly intervalMs?: number;
  readonly maximumDirtyMs?: number;
  readonly faults?: ResidentTabFaultInjection;
  readonly now?: () => number;
  readonly onDegraded?: (degraded: boolean) => void;
  readonly write?: (path: string, text: string) => Promise<void>;
  readonly move?: (from: string, to: string) => Promise<void>;
  readonly schedule?: (callback: () => void | Promise<void>, delayMs: number) => unknown;
  readonly cancel?: (timer: unknown) => void;
}

/** Periodic rather than inactivity-debounced: continuous input still checkpoints every interval. */
export class DraftCheckpointer {
  readonly path: string;
  readonly #intervalMs: number;
  readonly #maximumDirtyMs: number;
  readonly #faults: ResidentTabFaultInjection;
  readonly #now: () => number;
  readonly #onDegraded: (degraded: boolean) => void;
  readonly #write: (path: string, text: string) => Promise<void>;
  readonly #move: (from: string, to: string) => Promise<void>;
  readonly #scheduleTimer: (callback: () => void | Promise<void>, delayMs: number) => unknown;
  readonly #cancelTimer: (timer: unknown) => void;
  #text = "";
  #dirtySince: number | null = null;
  #timer: unknown | null = null;
  #degradedTimer: unknown | null = null;
  #writing: Promise<void> | null = null;
  #closed = false;
  #degraded = false;

  constructor(path: string, options: DraftCheckpointOptions = {}) {
    this.path = path;
    this.#intervalMs = options.intervalMs ?? 500;
    this.#maximumDirtyMs = options.maximumDirtyMs ?? 1_000;
    this.#faults = options.faults ?? new ResidentTabFaultInjection();
    this.#now = options.now ?? Date.now;
    this.#onDegraded = options.onDegraded ?? (() => {});
    this.#write = options.write ?? (async (target, text) => writeFile(target, text, { encoding: "utf8", mode: 0o600, flag: "wx" }));
    this.#move = options.move ?? rename;
    this.#scheduleTimer = options.schedule ?? ((callback, delayMs) => setTimeout(callback, delayMs));
    this.#cancelTimer = options.cancel ?? (timer => clearTimeout(timer as ReturnType<typeof setTimeout>));
  }

  get degraded(): boolean { return this.#degraded; }

  change(text: string): void {
    if (this.#closed) return;
    this.#text = text;
    this.#dirtySince ??= this.#now();
    this.#schedule();
    this.#armDegradedDeadline();
  }

  async restore(): Promise<DraftCheckpointState | null> {
    try {
      const value: unknown = JSON.parse(await readFile(this.path, "utf8"));
      if (typeof value !== "object" || value === null || typeof (value as Record<string, unknown>).text !== "string"
        || typeof (value as Record<string, unknown>).savedAt !== "string") return null;
      return value as DraftCheckpointState;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT" || error instanceof SyntaxError) return null;
      throw error;
    }
  }

  async flush(): Promise<void> {
    if (this.#timer !== null) { this.#cancelTimer(this.#timer); this.#timer = null; }
    await this.#writing;
    if (this.#dirtySince !== null) await this.#checkpoint();
  }

  async close(): Promise<void> {
    await this.flush();
    this.#closed = true;
  }

  #armDegradedDeadline(): void {
    if (this.#degradedTimer !== null || this.#dirtySince === null || this.#closed) return;
    const delay = Math.max(0, this.#maximumDirtyMs - (this.#now() - this.#dirtySince));
    this.#degradedTimer = this.#scheduleTimer(() => {
      this.#degradedTimer = null;
      if (this.#dirtySince !== null && this.#now() - this.#dirtySince >= this.#maximumDirtyMs) {
        this.#setDegraded(true);
      } else if (this.#dirtySince !== null) {
        this.#armDegradedDeadline();
      }
    }, delay);
  }

  #clearDegradedDeadline(): void {
    if (this.#degradedTimer !== null) this.#cancelTimer(this.#degradedTimer);
    this.#degradedTimer = null;
  }

  #schedule(): void {
    if (this.#timer !== null || this.#writing !== null || this.#closed) return;
    const age = this.#dirtySince === null ? 0 : this.#now() - this.#dirtySince;
    if (age > this.#maximumDirtyMs) this.#setDegraded(true);
    this.#timer = this.#scheduleTimer(async () => {
      this.#timer = null;
      this.#writing = this.#checkpoint().finally(() => {
        this.#writing = null;
        if (this.#dirtySince !== null) this.#schedule();
      });
      await this.#writing.catch(() => undefined);
    }, this.#intervalMs);
  }

  async #checkpoint(): Promise<void> {
    if (this.#dirtySince === null) return;
    const snapshot = this.#text;
    const temporary = `${this.path}.tmp-${process.pid}-${randomUUID()}`;
    try {
      await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
      if (process.platform !== "win32") await chmod(dirname(this.path), 0o700);
      this.#faults.at("draft-during-temp-write");
      await this.#write(temporary, `${JSON.stringify({ text: snapshot, savedAt: new Date(this.#now()).toISOString() })}\n`);
      this.#faults.at("draft-before-rename");
      await this.#move(temporary, this.path);
      this.#faults.at("draft-after-rename");
      if (process.platform !== "win32") await chmod(this.path, 0o600);
      if (this.#text === snapshot) this.#dirtySince = null;
      else this.#dirtySince = this.#now();
      this.#clearDegradedDeadline();
      if (this.#dirtySince !== null) this.#armDegradedDeadline();
      this.#setDegraded(false);
    } catch (error) {
      await unlink(temporary).catch(() => undefined);
      this.#clearDegradedDeadline();
      this.#setDegraded(true);
      throw error;
    }
  }

  #setDegraded(value: boolean): void {
    if (this.#degraded === value) return;
    this.#degraded = value;
    this.#onDegraded(value);
  }
}
