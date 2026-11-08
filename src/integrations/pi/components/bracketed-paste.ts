export const PASTE_START = "\x1b[200~";
const PASTE_END = "\x1b[201~";

/** A bracketed paste whose end marker arrived, with the input that followed it in the same chunk. */
export interface CompletedPaste {
  readonly text: string;
  /** UTF-8 bytes counted against the cap; zero when the framer has no cap. */
  readonly bytes: number;
  /** The paste exceeded the cap, so its text was dropped. */
  readonly oversized: boolean;
  readonly remaining: string;
}

interface OpenPaste {
  parts: string[];
  piece: string;
  tail: string;
  bytes: number;
  oversized: boolean;
}

/**
 * Bracketed-paste framing across terminal input chunks. `feed` collects a paste for insertion;
 * `discard` drops pastes while forwarding the input around them, and also holds back a split
 * start marker so a paste can never leak in as typed text when paste is disabled.
 */
export class BracketedPasteFramer {
  readonly #maxBytes: number | undefined;
  #open: OpenPaste | undefined;
  #startTail = "";

  /** With `maxBytes`, a paste beyond it is reported as oversized and its text is dropped. */
  constructor(maxBytes?: number) {
    this.#maxBytes = maxBytes;
  }

  /** A paste has started and its end marker has not arrived. */
  get open(): boolean {
    return this.#open !== undefined;
  }

  clear(): void {
    this.#open = undefined;
    this.#startTail = "";
  }

  /**
   * Feed input that continues the open paste, or that begins with the start marker. Returns the
   * completed paste, or undefined while the end marker is still to come.
   */
  feed(data: string): CompletedPaste | undefined {
    return this.#feed(data, true);
  }

  /**
   * Drop any bracketed paste in `data`, forwarding the input before and after it. False means
   * `data` holds no paste and nothing was forwarded, so the caller handles it as ordinary input.
   */
  discard(data: string, forward: (data: string) => void): boolean {
    if (this.#open !== undefined) {
      const done = this.#feed(data, false);
      if (done !== undefined && done.remaining.length > 0) forward(done.remaining);
      return true;
    }
    const hadStartTail = this.#startTail.length > 0;
    const candidate = this.#startTail + data;
    this.#startTail = "";
    const start = candidate.indexOf(PASTE_START);
    if (start >= 0) {
      if (start > 0) forward(candidate.slice(0, start));
      const done = this.#feed(candidate.slice(start), false);
      if (done !== undefined && done.remaining.length > 0) forward(done.remaining);
      return true;
    }
    const partial = delimiterTail(candidate, PASTE_START);
    // Compatibility: standalone Escape still cancels; marker fragments stay pending.
    if (partial.length > 1) {
      const before = candidate.slice(0, candidate.length - partial.length);
      if (before.length > 0) forward(before);
      this.#startTail = partial;
      return true;
    }
    if (hadStartTail) { forward(candidate); return true; }
    return false;
  }

  #feed(data: string, collect: boolean): CompletedPaste | undefined {
    if (this.#open === undefined) {
      this.#open = { parts: [], piece: "", tail: "", bytes: 0, oversized: false };
      data = data.slice(data.indexOf(PASTE_START) + PASTE_START.length);
    }
    // Protocol: inspect only the new fragment plus a delimiter-sized suffix, not the whole growing body.
    const pending = this.#open;
    const fragment = pending.tail + data;
    const end = fragment.indexOf(PASTE_END);
    const append = (part: string): void => {
      if (!collect || pending.oversized || part.length === 0) return;
      if (this.#maxBytes !== undefined) {
        pending.bytes += Buffer.byteLength(part);
        if (pending.bytes > this.#maxBytes) {
          pending.oversized = true; pending.parts = []; pending.piece = ""; return;
        }
      }
      // Performance: bound fragment metadata even if a terminal supplies one character per input chunk.
      pending.piece += part;
      if (pending.piece.length >= 16_384) { pending.parts.push(pending.piece); pending.piece = ""; }
    };
    if (end < 0) {
      let cut = Math.max(0, fragment.length - (PASTE_END.length - 1));
      if (cut > 0 && /[\uD800-\uDBFF]/u.test(fragment[cut - 1]!) && /[\uDC00-\uDFFF]/u.test(fragment[cut]!)) cut--;
      append(fragment.slice(0, cut));
      pending.tail = fragment.slice(cut);
      return undefined;
    }
    append(fragment.slice(0, end));
    this.#open = undefined;
    return {
      text: pending.oversized ? "" : pending.parts.join("") + pending.piece,
      bytes: pending.bytes,
      oversized: pending.oversized,
      remaining: fragment.slice(end + PASTE_END.length),
    };
  }
}

function delimiterTail(text: string, delimiter: string): string {
  const limit = Math.min(text.length, delimiter.length - 1);
  for (let length = limit; length > 0; length -= 1) {
    const suffix = text.slice(text.length - length);
    if (delimiter.startsWith(suffix)) return suffix;
  }
  return "";
}
