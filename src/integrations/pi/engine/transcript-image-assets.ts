import { createHash } from "node:crypto";
import type { OwnedUiEvent, OwnedUiImageAttachment, OwnedUiTranscriptBlock, OwnedUiTranscriptImageReference } from "../../../contracts/owned-ui/index.js";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

// Security: current blocks and admitted delivery snapshots own assets independently; superseded state owns none.
export class TranscriptImageAssets {
  readonly #assets = new Map<string, { asset: OwnedUiImageAttachment; byteLength: number; owners: number; pending: number }>();
  readonly #events = new WeakMap<object, { owners: number; release(): void; exclusiveBytes(): number }>();
  #captureBytes = 0;

  /** Encoded assets held only by delivery, plus shared pending lease metadata. */
  pendingBytesExcluding(event?: OwnedUiEvent): number {
    const key = event === undefined ? undefined : event.type === "transcript-block" ? event.block : event.type === "session-view" ? event.view.transcript : undefined;
    const shared = key === undefined ? undefined : this.#events.get(key);
    return this.pendingBytes - (shared?.owners === 1 ? shared.exclusiveBytes() : 0);
  }

  get pendingBytes(): number {
    let bytes = this.#captureBytes;
    for (const entry of this.#assets.values()) {
      if (entry.pending > 0 && entry.owners === entry.pending) bytes += 64 + entry.asset.data.length * 2;
    }
    return bytes;
  }
  readonly #byData = new Map<string, Map<string, string>>();
  readonly #unowned = new Set<string>();

  resolve(id: string): OwnedUiImageAttachment | null { return this.#assets.get(id)?.asset ?? null; }
  clear(): void { this.#assets.clear(); this.#byData.clear(); this.#unowned.clear(); }

  reference(value: unknown, source: OwnedUiTranscriptImageReference["source"]): OwnedUiTranscriptImageReference | undefined {
    if (typeof value !== "object" || value === null || !("type" in value) || value.type !== "image"
      || !("data" in value) || typeof value.data !== "string" || value.data.length === 0
      || !("mimeType" in value) || typeof value.mimeType !== "string" || !/^image\/[a-z0-9.+-]+$/i.test(value.mimeType)) return;
    // Performance: reject oversized encoded data before allocating a decoded buffer or hashing it.
    if (value.data.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) return;
    // Performance: repeated accumulated results reuse the same retained bytes without decoding and hashing per chunk.
    const cachedId = this.#byData.get(value.mimeType)?.get(value.data);
    if (cachedId !== undefined) return { assetId: cachedId, mimeType: value.mimeType, byteLength: this.#assets.get(cachedId)!.byteLength, source };
    const byteLength = Buffer.from(value.data, "base64").byteLength;
    if (byteLength < 1 || byteLength > MAX_IMAGE_BYTES) return;
    const assetId = `image-${createHash("sha256").update(value.mimeType).update("\0").update(value.data).digest("hex").slice(0, 24)}`;
    if (!this.#assets.has(assetId)) {
      this.#assets.set(assetId, { asset: { type: "image", data: value.data, mimeType: value.mimeType }, byteLength, owners: 0, pending: 0 });
      let byData = this.#byData.get(value.mimeType);
      if (byData === undefined) this.#byData.set(value.mimeType, byData = new Map());
      byData.set(value.data, assetId);
      this.#unowned.add(assetId);
    }
    return { assetId, mimeType: value.mimeType, byteLength, source };
  }

  retain(block: OwnedUiTranscriptBlock): void {
    for (const reference of block.imageReferences ?? []) {
      const entry = this.#assets.get(reference.assetId);
      if (entry === undefined) continue;
      entry.owners++;
      this.#unowned.delete(reference.assetId);
    }
  }

  release(block: OwnedUiTranscriptBlock): void {
    for (const reference of block.imageReferences ?? []) {
      const entry = this.#assets.get(reference.assetId);
      if (entry !== undefined && --entry.owners === 0) this.#delete(reference.assetId);
    }
  }

  retainEvent(event: OwnedUiEvent): () => void {
    const key = event.type === "transcript-block" ? event.block : event.type === "session-view" ? event.view.transcript : undefined;
    if (key === undefined) return () => {};
    let shared = this.#events.get(key);
    if (shared === undefined) {
      const blocks = event.type === "transcript-block" ? [event.block] : event.type === "session-view" ? event.view.transcript : [];
      // Capture entries, not ids: obsolete generations cannot decrement replacement assets.
      const entries = blocks.flatMap(block => (block.imageReferences ?? []).map(ref => [ref.assetId, this.#assets.get(ref.assetId)] as const));
      this.#captureBytes += entries.length * 32;
      for (const [id, entry] of entries) {
        if (entry === undefined) continue;
        entry.owners++; entry.pending++;
        this.#unowned.delete(id);
      }
      shared = { owners: 0, exclusiveBytes: () => {
        let bytes = entries.length * 32;
        const counts = new Map<string, number>();
        for (const [id, entry] of entries) if (entry !== undefined && this.#assets.get(id) === entry) counts.set(id, (counts.get(id) ?? 0) + 1);
        for (const [id, count] of counts) {
          const entry = this.#assets.get(id)!;
          if (entry.owners === count && entry.pending === count) bytes += 64 + entry.asset.data.length * 2;
        }
        return bytes;
      }, release: () => {
        this.#captureBytes -= entries.length * 32;
        for (const [id, entry] of entries) {
          if (entry !== undefined && this.#assets.get(id) === entry) {
            entry.pending--;
            if (--entry.owners === 0) this.#delete(id);
          }
        }
        entries.length = 0;
        this.#events.delete(key);
      } };
      this.#events.set(key, shared);
    }
    shared.owners++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (--shared.owners === 0) shared.release();
    };
  }

  discardUnowned(): void {
    for (const id of this.#unowned) this.#delete(id);
    this.#unowned.clear();
  }

  #delete(id: string): void {
    const entry = this.#assets.get(id);
    if (entry === undefined) return;
    const byData = this.#byData.get(entry.asset.mimeType);
    byData?.delete(entry.asset.data);
    if (byData?.size === 0) this.#byData.delete(entry.asset.mimeType);
    this.#assets.delete(id);
    this.#unowned.delete(id);
  }
}
