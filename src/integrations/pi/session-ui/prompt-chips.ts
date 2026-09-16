import { randomBytes } from "node:crypto";
import path from "node:path";
import type {
  PiShellClipboardContent,
  PiShellEditorTextRange,
} from "../components/shell-shared-facade.js";
import { canonicalizeClipboardImage } from "./clipboard-image.js";
import { assertImageEncodedSize, assertPromptImages, ImageAttachmentError } from "../../../contracts/owned-ui/image-attachments.js";
import { ImagePreparationClient, type ImagePasteJob } from "./image-preparation-client.js";
import type { PreparedImage } from "./image-preparation.js";
import { preparePasteText, type PreparedPasteText } from "./paste-text-preparation.js";
import { pathChipTag } from "./path-chip-presentation.js";
import { PastePreparationClient, type PreparedPasteJob } from "./paste-preparation-client.js";
import type { PasteEvent, PasteSource, PreparedPaste } from "./paste-protocol.js";

export interface PromptImageAttachment {
  readonly type: "image";
  readonly data: string;
  readonly mimeType: string;
}

export interface PreparedPrompt {
  readonly text: string;
  readonly images: readonly PromptImageAttachment[];
}

type PromptChip =
  | { readonly kind: "text"; readonly tag: string; readonly text: string }
  | { readonly kind: "folder" | "file"; readonly tag: string; readonly path: string }
  | { readonly kind: "url"; readonly tag: string; readonly label: string; readonly url: string }
  | { readonly kind: "image"; readonly tag: string; readonly image: PromptImageAttachment };

interface PendingPaste {
  readonly marker: string;
  readonly job: ImagePasteJob | PreparedPasteJob<string>;
  readonly completion: Promise<string>;
  references: number;
  kind: "unknown" | "image" | "text";
  replacement?: string;
  error?: ImageAttachmentError;
  onComplete?: () => void;
}

const CHIP_PATTERN = /\[(?:paste #\d+ (?:\+\d+ lines|\d+ chars)|📷 [^\]]+|📁 [^\]]+|📄 [^\]]+|🖼 {1,2}[^\]]+|🔗 [^\]]+)\]/gu;
const URL_SUBSTRING_PATTERN = /https?:\/\/[^\s\u0000-\u001f\u007f\]]+/giu;
const IMAGE_CHIP_IDENTIFIER_PATTERN = /^\[📷 screenshot-([a-f0-9]+)(?:-resized)?\]$/u;
const URL_DISPLAY_LENGTH = 40;

function imageChipIdentifier(tag: string): string | null {
  const match = IMAGE_CHIP_IDENTIFIER_PATTERN.exec(tag);
  return match === null ? null : match[1] ?? null;
}

/** Owns semantic chips and bounded pending paste references; cancels background work on reset or disposal. */
export class PromptChipStore {
  readonly #chips = new Map<string, PromptChip>();
  // Invariant: clearing the editor never recycles a recoverable text chip's identity.
  #textCounter = 0;
  readonly #pending = new Map<string, PendingPaste>();
  #preparation = new ImagePreparationClient();
  readonly #stopping = new Set<Promise<void>>();
  readonly #isolated: PastePreparationClient | undefined;
  readonly #provisionalOwners = new Map<string, Set<symbol>>();
  readonly #ownedChipTags = new Map<symbol, Set<string>>();

  constructor(options: { readonly isolated?: boolean; readonly onEvent?: (event: PasteEvent) => void } = {}) {
    this.#isolated = options.isolated ? new PastePreparationClient(options.onEvent) : undefined;
  }

  beginPaste(
    currentText: string,
    read: ((signal: AbortSignal) => Promise<PiShellClipboardContent | null>) | PasteSource,
    onError: (error: unknown) => void,
    onImage: () => void = () => {},
  ): { marker: string; result: Promise<string>; complete?(): void; isCurrent?(): boolean } {
    if (this.#isolated) return this.#beginIsolatedPaste(currentText, typeof read === "function" ? { kind: "provided", read } : read, onError, onImage);
    if (typeof read !== "function") throw new Error("Clipboard sources require isolated paste preparation");
    const id = randomBytes(5).toString("hex");
    // Invariant: reserve paste identity immediately, but only display a screenshot after identifying an image.
    const marker = `[📷 screenshot-${id}]`;
    const job = this.#preparation.start(async signal => {
      const content = await read(signal);
      entry.kind = content?.kind === "image" ? "image" : "text";
      if (content?.kind === "image") {
        onImage();
        if (this.#imageCount(currentText) >= 8) throw new ImageAttachmentError("image-count");
      }
      return content;
    });
    const entry: PendingPaste = { marker, job, references: 0, kind: "unknown", completion: job.result.then(content => {
      if (content === null) return "";
      if (content.kind === "image") {
        return this.#addPreparedImage(content, id);
      }
      return this.transformPastedContent(content);
    }).catch(error => {
      entry.error = error instanceof ImageAttachmentError ? error : new ImageAttachmentError("image-codec");
      if (entry.error.code !== "image-canceled" && entry.references === 0) onError(entry.error);
      return marker.replace("screenshot-", "failed-");
    }).then(replacement => {
      entry.replacement = replacement;
      return replacement;
    }) };
    this.#pending.set(marker, entry);
    return { marker, result: entry.completion };
  }

  #beginIsolatedPaste(currentText: string, source: PasteSource, onError: (error: unknown) => void, onImage: () => void) {
    const id = randomBytes(5).toString("hex");
    const marker = `[📷 screenshot-${id}]`;
    let entry!: PendingPaste;
    const owner = Symbol("paste");
    this.#ownedChipTags.set(owner, new Set());
    const job = this.#isolated!.start(source, async (value, signal) => {
      if (signal.aborted) throw new ImageAttachmentError("image-canceled");
      if (value === null) return "";
      if (value.kind === "image") return this.#addPreparedImage(value, id, owner);
      entry.kind = "text";
      return this.#adoptPreparedText(value, signal, owner);
    }, () => {
      entry.kind = "image";
      onImage();
      if (this.#imageCount(currentText) >= 8) throw new ImageAttachmentError("image-count");
    }, () => { entry.kind = "text"; });
    entry = { marker, job, references: 0, kind: "unknown", completion: job.result.catch(error => {
      this.#finishChipOwnership(owner, false);
      entry.error = error instanceof ImageAttachmentError ? error : new ImageAttachmentError("paste-unavailable");
      // Compatibility: typed image validation can fail before transfer identifies the payload to this store.
      if (entry.kind === "unknown" && entry.error.code.startsWith("image-") && entry.error.code !== "image-canceled") entry.kind = "image";
      if (entry.error.code !== "image-canceled" && entry.references === 0) onError(entry.error);
      return entry.kind === "image" ? marker.replace("screenshot-", "failed-") : "";
    }).then(replacement => { entry.replacement = replacement; return replacement; }) };
    entry.onComplete = () => {
      this.#finishChipOwnership(owner, job.isCurrent() && entry.error === undefined);
      job.complete();
    };
    this.#pending.set(marker, entry);
    return { marker, result: entry.completion, complete: entry.onComplete, isCurrent: () => job.isCurrent() };
  }

  async #adoptPreparedText(value: Exclude<PreparedPaste, null | { readonly kind: "image" }>, signal: AbortSignal, owner: symbol): Promise<string> {
    if (value.kind !== "paths") return this.#recordPreparedText(value, owner);
    let text = "";
    for (let start = 0; start < value.paths.length; start += 32) {
      if (signal.aborted) throw new ImageAttachmentError("image-canceled");
      text += this.#recordPreparedText({ kind: "paths", paths: value.paths.slice(start, start + 32) }, owner);
      await new Promise<void>(resolve => setImmediate(resolve));
    }
    return text;
  }

  hasPending(text: string): boolean {
    return [...this.#pending.values()].some(item => text.includes(item.marker) && item.replacement === undefined);
  }

  async waitForPastes(text: string, signal: AbortSignal, readDraft: () => string = () => ""): Promise<PreparedPrompt> {
    const entries = [...this.#pending.values()].filter(item => text.includes(item.marker));
    for (const entry of entries) entry.references++;
    try {
      await new Promise<void>((resolve, reject) => {
        const abort = (): void => reject(new ImageAttachmentError("image-canceled"));
        if (signal.aborted) { abort(); return; }
        signal.addEventListener("abort", abort, { once: true });
        void Promise.all(entries.map(item => item.completion)).then(() => {
          signal.removeEventListener("abort", abort); resolve();
        }, reject);
      });
      return this.prepareSubmission(text);
    } finally {
      for (const entry of entries) {
        entry.references--;
        if (entry.replacement !== undefined) entry.onComplete?.();
        if (signal.aborted && entry.references === 0 && !readDraft().includes(entry.marker)) entry.job.cancel();
      }
    }
  }

  reconcileDraft(text: string): void {
    for (const entry of this.#pending.values()) {
      if (entry.references === 0 && !text.includes(entry.marker) && !text.includes(entry.marker.replace("screenshot-", "failed-"))) {
        entry.job.cancel();
        if (entry.replacement !== undefined) {
          entry.onComplete?.();
          this.#pending.delete(entry.marker);
        }
      }
    }
  }

  resetPastes(text: string): string {
    let remaining = text;
    for (const entry of this.#pending.values()) if (entry.replacement === undefined) remaining = remaining.replaceAll(entry.marker, "");
    this.#isolated?.reset();
    const stopped = this.#preparation.dispose();
    this.#stopping.add(stopped);
    void stopped.finally(() => this.#stopping.delete(stopped));
    this.#preparation = new ImagePreparationClient();
    for (const entry of this.#pending.values()) if (entry.replacement === undefined) entry.job.cancel();
    return remaining;
  }

  async dispose(): Promise<void> {
    await Promise.all([this.#preparation.dispose(), this.#isolated?.dispose(), ...this.#stopping]);
    this.#chips.clear();
    this.#pending.clear();
    this.#provisionalOwners.clear();
    this.#ownedChipTags.clear();
  }

  #imageCount(text: string): number {
    const tags = new Set([...this.#chips.values()].filter(chip => chip.kind === "image" && text.includes(chip.tag)).map(chip => chip.tag));
    for (const entry of this.#pending.values()) {
      if (entry.kind !== "text" && (text.includes(entry.marker) || text.includes(entry.marker.replace("screenshot-", "failed-")))) {
        // Invariant: a ready screenshot can retain its pending label but still occupies only one slot.
        tags.add(entry.replacement ?? entry.marker);
      }
    }
    return tags.size;
  }

  #addPreparedImage(image: PreparedImage, id: string, owner?: symbol): string {
    const tag = `[📷 screenshot-${id}${image.transformed ? "-resized" : ""}]`;
    const attachment = Object.freeze({ type: "image" as const, data: image.data, mimeType: image.mimeType });
    assertPromptImages([attachment]);
    this.#chips.set(tag, { kind: "image", tag, image: attachment });
    this.#claimChip(tag, owner, true);
    return tag;
  }

  transformPastedContent(content: PiShellClipboardContent, currentText = ""): string {
    if (content.kind === "image") {
      assertImageEncodedSize(content.data);
      const image = canonicalizeClipboardImage(content);
      if (image === null) return "";
      assertPromptImages([...this.prepareSubmission(currentText).images, { type: "image", ...image }]);
      const id = randomBytes(5).toString("hex");
      const tag = `[📷 screenshot-${id}]`;
      this.#chips.set(tag, {
        kind: "image",
        tag,
        image: { type: "image", data: image.data, mimeType: image.mimeType },
      });
      return tag;
    }

    const text = content.text;
    if (this.#chips.has(text.trim())) { this.#claimChip(text.trim(), undefined, false); return text.trim(); }
    return this.#recordPreparedText(preparePasteText(text));
  }

  #recordPreparedText(paste: PreparedPasteText, owner?: symbol): string {
    if (paste.kind === "url") return this.#recordUnique({ kind: "url", tag: `[🔗 ${paste.label}]`, label: paste.label, url: paste.url }, owner);
    if (paste.kind === "text") {
      if (paste.label === undefined) {
        const tag = paste.text.trim();
        if (this.#chips.has(tag)) { this.#claimChip(tag, owner, false); return tag; }
        return paste.text;
      }
      const tag = `[paste #${++this.#textCounter} ${paste.label}]`;
      this.#chips.set(tag, Object.freeze({ kind: "text", tag, text: paste.text }));
      this.#claimChip(tag, owner, true);
      return tag;
    }
    return paste.paths.map(item => this.#recordUnique({ kind: item.kind, tag: pathChipTag(item), path: item.fullPath }, owner)).join("");
  }

  /** Hide provisional clipboard identities until the read identifies an actual image. */
  hiddenRanges(line: string): readonly PiShellEditorTextRange[] {
    const ranges: PiShellEditorTextRange[] = [];
    for (const entry of this.#pending.values()) {
      if (entry.kind === "image") continue;
      let from = 0;
      while ((from = line.indexOf(entry.marker, from)) >= 0) {
        ranges.push({ start: from, end: from + entry.marker.length });
        from += entry.marker.length;
      }
    }
    return ranges.sort((left, right) => left.start - right.start);
  }

  atomicRanges(line: string): readonly PiShellEditorTextRange[] {
    return [...line.matchAll(CHIP_PATTERN)].filter(match => !match[0].startsWith("[paste #") || this.#chips.has(match[0])).map(match => ({
      start: match.index,
      end: match.index + match[0].length,
    }));
  }

  hyperlinkRanges(text: string): readonly { start: number; end: number; target: string }[] {
    const ranges: { start: number; end: number; target: string }[] = [];
    for (const chip of this.#chips.values()) {
      if (chip.kind !== "url") continue;
      const labelOffset = chip.tag.indexOf(chip.label);
      if (labelOffset < 0) continue;
      let searchFrom = 0;
      while (searchFrom <= text.length - chip.tag.length) {
        const tagStart = text.indexOf(chip.tag, searchFrom);
        if (tagStart < 0) break;
        const start = tagStart + labelOffset;
        ranges.push({ start, end: start + chip.label.length, target: chip.url });
        searchFrom = tagStart + chip.tag.length;
      }
    }
    return ranges.sort((left, right) => right.start - left.start);
  }

  expandCopiedText(text: string): string {
    return this.#replaceResolvable(text, false).text;
  }

  /**
   * Recall-safe history text. Text / URL / file / folder chips expand to their resolved value
   * so a restart can reuse them without the originating chip cache. Image chip tags are
   * preserved verbatim so the sidecar-backed rehydration path can re-render them into live
   * chips carrying the original attachment bytes.
   */
  prepareHistoryText(text: string): string {
    return this.#replaceResolvable(text, false, false).text.trim();
  }

  /**
   * Extract the image chip attachments referenced by an editor draft in occurrence order,
   * paired with their sidecar identifier. Callers use this to persist image sidecars before a
   * history row commits, so a fresh process can rehydrate the same chip layout. Unresolved
   * pending pastes and non-image chips are skipped; caller is responsible for waiting on
   * pending readiness before this point.
   */
  imageChipAttachments(text: string): { readonly id: string; readonly tag: string; readonly image: PromptImageAttachment }[] {
    const results: { readonly id: string; readonly tag: string; readonly image: PromptImageAttachment }[] = [];
    const seen = new Set<string>();
    for (const match of text.matchAll(CHIP_PATTERN)) {
      const tag = match[0];
      if (seen.has(tag)) continue;
      const chip = this.#chips.get(tag);
      if (chip === undefined || chip.kind !== "image") continue;
      const identifier = imageChipIdentifier(tag);
      if (identifier === null) continue;
      seen.add(tag);
      results.push({ id: identifier, tag, image: chip.image });
    }
    return results;
  }

  /**
   * Rehydrate a durable recall value into an editor-ready draft: image chip tags are looked up
   * against a caller-supplied sidecar resolver, and detectable URL / file / folder / large text
   * substrings are re-registered as atomic chips through the same identity rules the paste path
   * uses. Image chips whose sidecar returns null are silently stripped without a placeholder.
   *
   * Every chip returned is registered in the session `#chips` map so atomic-range,
   * hyperlink-range, and submission-expansion paths behave identically to a freshly typed draft.
   * Callers should treat the returned string as programmatic editor text, not another draft to
   * scan.
   */
  rehydrateHistoryText(text: string, resolveImage: (id: string) => PromptImageAttachment | null): string {
    if (!text) return text;
    // Rationale: resolve image chip tags in-place before further classification. Sidecar hits
    // register a live image chip; misses silently strip the tag (no placeholder, no notice) per
    // the durability contract.
    CHIP_PATTERN.lastIndex = 0;
    const resolvedImages = text.replace(CHIP_PATTERN, tag => {
      const identifier = imageChipIdentifier(tag);
      if (identifier === null) return tag;
      const attachment = resolveImage(identifier);
      if (attachment === null) return "";
      this.#chips.set(tag, { kind: "image", tag, image: attachment });
      return tag;
    });
    // Rationale: split around any surviving image tags so paste-time classification runs on the
    // intervening prose exactly as it would on a fresh clipboard payload, plus a substring URL
    // scan so embedded links become atomic chips even in the middle of surrounding text.
    CHIP_PATTERN.lastIndex = 0;
    const segments: string[] = [];
    let cursor = 0;
    for (const match of resolvedImages.matchAll(CHIP_PATTERN)) {
      const index = match.index ?? cursor;
      if (index > cursor) segments.push(resolvedImages.slice(cursor, index));
      segments.push(match[0]);
      cursor = index + match[0].length;
    }
    if (cursor < resolvedImages.length) segments.push(resolvedImages.slice(cursor));
    CHIP_PATTERN.lastIndex = 0;
    return segments.map(segment => {
      if (segment.length === 0 || CHIP_PATTERN.test(segment)) { CHIP_PATTERN.lastIndex = 0; return segment; }
      CHIP_PATTERN.lastIndex = 0;
      // Invariant: preserve original whitespace framing so the concatenated recall value
      // remains stable across rehydration.
      const leading = segment.match(/^\s+/)?.[0] ?? "";
      const trailing = segment.match(/\s+$/)?.[0] ?? "";
      const body = segment.slice(leading.length, segment.length - trailing.length);
      if (body.length === 0) return segment;
      // Rationale: substring URL rehydration reuses paste-time URL classification and identity
      // rules, producing a URL chip whenever a bare http(s) URL appears in the prose. Whole-text
      // classification runs afterwards to catch path / large-paste candidates that consume the
      // entire remaining body.
      const withUrlChips = this.#rehydrateUrlSubstrings(body);
      if (withUrlChips !== body) return `${leading}${withUrlChips}${trailing}`;
      const classified = this.transformPastedContent({ kind: "text", text: body });
      return `${leading}${classified}${trailing}`;
    }).join("");
  }

  #rehydrateUrlSubstrings(body: string): string {
    let output = "";
    let cursor = 0;
    URL_SUBSTRING_PATTERN.lastIndex = 0;
    for (;;) {
      const match = URL_SUBSTRING_PATTERN.exec(body);
      if (match === null) break;
      const url = match[0];
      if (match.index > cursor) output += body.slice(cursor, match.index);
      const label = url.length <= URL_DISPLAY_LENGTH ? url : `${url.slice(0, URL_DISPLAY_LENGTH)}…`;
      output += this.#recordUnique({ kind: "url", tag: `[🔗 ${label}]`, label, url });
      cursor = match.index + url.length;
    }
    URL_SUBSTRING_PATTERN.lastIndex = 0;
    if (cursor === 0) return body;
    if (cursor < body.length) output += body.slice(cursor);
    return output;
  }

  prepareSubmission(text: string): PreparedPrompt {
    const expanded = this.#replaceResolvable(text, true);
    return { text: expanded.text, images: expanded.images };
  }

  #replaceResolvable(text: string, includeImages: boolean, omitImages = false): PreparedPrompt {
    const images: PromptImageAttachment[] = [];
    const seenImages = new Set<string>();
    const resolveChip = (tag: string): string => {
      const chip = this.#chips.get(tag);
      if (chip === undefined) return tag;
      if (chip.kind === "text") return chip.text;
      if (chip.kind === "image") {
        if (includeImages && !seenImages.has(tag)) {
          images.push(chip.image);
          seenImages.add(tag);
        }
        return omitImages ? "" : tag;
      }
      return chip.kind === "url" ? chip.url : chip.path;
    };
    // Invariant: scan only draft tokens (and resolved reservation tokens), never emitted payloads.
    const expanded = text.replace(CHIP_PATTERN, tag => {
      const entry = this.#pending.get(tag) ?? this.#pending.get(tag.replace("failed-", "screenshot-"));
      if (entry === undefined) return resolveChip(tag);
      if (includeImages && entry.error !== undefined) throw entry.error;
      if (includeImages && entry.replacement === undefined) throw new ImageAttachmentError("image-pending");
      return entry.replacement === undefined ? tag : entry.replacement.replace(CHIP_PATTERN, resolveChip);
    });
    return { text: expanded, images };
  }

  #claimChip(tag: string, owner: symbol | undefined, created: boolean): void {
    if (owner === undefined) { this.#provisionalOwners.delete(tag); return; }
    let owners = this.#provisionalOwners.get(tag);
    if (!owners && !created) return; // Invariant: existing committed chips must survive canceled later pastes.
    if (!owners) { owners = new Set(); this.#provisionalOwners.set(tag, owners); }
    owners.add(owner); this.#ownedChipTags.get(owner)?.add(tag);
  }

  #finishChipOwnership(owner: symbol, commit: boolean): void {
    for (const tag of this.#ownedChipTags.get(owner) ?? []) {
      const owners = this.#provisionalOwners.get(tag);
      if (!owners?.has(owner)) continue;
      if (commit) this.#provisionalOwners.delete(tag);
      else {
        owners.delete(owner);
        if (owners.size === 0) { this.#provisionalOwners.delete(tag); this.#chips.delete(tag); }
      }
    }
    this.#ownedChipTags.delete(owner);
  }

  #recordUnique(chip: PromptChip, owner?: symbol): string {
    const existing = this.#chips.get(chip.tag);
    if (existing === undefined || sameChipValue(existing, chip)) {
      this.#chips.set(chip.tag, chip);
      this.#claimChip(chip.tag, owner, existing === undefined);
      return chip.tag;
    }
    const suffix = randomBytes(2).toString("hex");
    const uniqueTag = `${chip.tag.slice(0, -1)} #${suffix}]`;
    const unique = { ...chip, tag: uniqueTag } as PromptChip;
    this.#chips.set(uniqueTag, unique);
    this.#claimChip(uniqueTag, owner, true);
    return uniqueTag;
  }
}

function sameChipValue(left: PromptChip, right: PromptChip): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === "url" && right.kind === "url") return left.url === right.url;
  if ((left.kind === "file" || left.kind === "folder") && (right.kind === "file" || right.kind === "folder")) {
    return path.normalize(left.path) === path.normalize(right.path);
  }
  if (left.kind === "image" && right.kind === "image") return left.image.data === right.image.data;
  return false;
}
