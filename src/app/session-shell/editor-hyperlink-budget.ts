/** Aggregate explicit URL-chip metadata allowance for one owned editor decoration pass. */
export const EDITOR_HYPERLINK_METADATA_BYTES = 64 * 1024;
const CLOSE_BYTES = 7;
const PAIR_BYTES = CLOSE_BYTES * 2;

/** Accounts complete OSC 8 controls before construction, without scanning oversized backing URLs. */
export class EditorHyperlinkBudget {
  #remaining = EDITOR_HYPERLINK_METADATA_BYTES;

  reset(): void { this.#remaining = EDITOR_HYPERLINK_METADATA_BYTES; }

  takeCleanup(): boolean { return this.#reserve(CLOSE_BYTES); }

  take(target: string): boolean {
    // Performance: UTF-16 length is a lower bound on UTF-8 bytes, including replacement surrogates.
    // Reject large backing values before byte counting, flattening, interpolation, or signatures.
    if (target.length > this.#remaining - PAIR_BYTES) return false;
    return this.#reserve(PAIR_BYTES + Buffer.byteLength(target, "utf8"));
  }

  #reserve(bytes: number): boolean {
    if (bytes > this.#remaining) return false;
    this.#remaining -= bytes;
    return true;
  }
}
