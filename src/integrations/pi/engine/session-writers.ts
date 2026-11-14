import { closeSync, mkdirSync, openSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { SessionWriterHandle } from "../../../foundation/session-writer-lock/index.js";
import type { SessionManager } from "../startup-public.js";

const selectedSessionWriters = new WeakMap<SessionManager, SessionWriterHandle>();

export function takeSelectedSessionWriter(manager: SessionManager): SessionWriterHandle | undefined {
  const writer = selectedSessionWriters.get(manager);
  selectedSessionWriters.delete(manager);
  return writer;
}

export function holdSelectedWriter(manager: SessionManager, writer: SessionWriterHandle): SessionManager {
  selectedSessionWriters.set(manager, writer);
  return manager;
}

interface PendingSessionWriter {
  readonly handle: SessionWriterHandle;
  readonly alreadyCurrent: boolean;
}

/** Existing per-runtime writer lifetime, independent of optional selector/picker loading. */
export class SessionWriterCoordinator {
  #current: SessionWriterHandle | undefined;
  readonly #acquire: (path: string) => SessionWriterHandle;
  constructor(acquire: (path: string) => SessionWriterHandle) { this.#acquire = acquire; }

  prepare(manager: SessionManager): PendingSessionWriter | undefined {
    const selected = takeSelectedSessionWriter(manager);
    if (selected !== undefined) return { handle: selected, alreadyCurrent: false };
    const path = manager.getSessionFile();
    if (path === undefined) return undefined;
    if (this.#current?.path === path) return { handle: this.#current, alreadyCurrent: true };
    const handle = this.#acquire(path);
    try {
      if (!handle.bound) {
        const header = manager.getHeader();
        if (header === null) throw new Error("new session is missing its generated header");
        mkdirSync(dirname(path), { recursive: true });
        const descriptor = openSync(path, "wx", 0o600);
        try {
          handle.bind(path);
          writeFileSync(descriptor, `${JSON.stringify(header)}\n`);
        } finally { closeSync(descriptor); }
        manager.setSessionFile(path);
      }
      return { handle, alreadyCurrent: false };
    } catch (error) { handle.release(); throw error; }
  }

  activate(pending: PendingSessionWriter | undefined): void {
    if (pending?.alreadyCurrent) return;
    const previous = this.#current;
    this.#current = pending?.handle;
    previous?.release();
  }

  abandon(pending: PendingSessionWriter | undefined): void {
    if (pending !== undefined && !pending.alreadyCurrent) pending.handle.release();
  }

  release(): void {
    this.#current?.release();
    this.#current = undefined;
  }
}
