import { randomBytes } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  PiShellClipboardContent,
  PiShellEditorTextRange,
} from "../components/index.js";
import { canonicalizeClipboardImage } from "./clipboard-image.js";
import { assertImageEncodedSize, assertPromptImages, ImageAttachmentError } from "../../../contracts/owned-ui/index.js";
import { ImagePreparationClient, type ImagePasteJob } from "./image-preparation-client.js";
import type { PreparedImage } from "./image-preparation.js";

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
  | { readonly kind: "folder" | "file"; readonly tag: string; readonly path: string }
  | { readonly kind: "url"; readonly tag: string; readonly label: string; readonly url: string }
  | { readonly kind: "image"; readonly tag: string; readonly image: PromptImageAttachment };

interface PendingPaste {
  readonly marker: string;
  readonly job: ImagePasteJob;
  readonly completion: Promise<string>;
  references: number;
  kind: "unknown" | "image" | "text";
  replacement?: string;
  error?: ImageAttachmentError;
}

const CHIP_PATTERN = /\[(?:📷 [^\]]+|📁 [^\]]+|📄 [^\]]+|🖼 {1,2}[^\]]+|🔗 [^\]]+)\]/gu;
const IMAGE_EXTENSION = /\.(?:jpe?g|png|webp|gif|bmp|tiff?)$/iu;
const URL_PATTERN = /^https?:\/\/[^\s\u0000-\u001f\u007f]+$/iu;
const URL_DISPLAY_LENGTH = 40;

/** Owns semantic chips and bounded pending paste references; cancels background work on reset or disposal. */
export class PromptChipStore {
  readonly #chips = new Map<string, PromptChip>();
  readonly #pending = new Map<string, PendingPaste>();
  #preparation = new ImagePreparationClient();
  readonly #stopping = new Set<Promise<void>>();

  beginPaste(
    currentText: string,
    read: (signal: AbortSignal) => Promise<PiShellClipboardContent | null>,
    onError: (error: unknown) => void,
  ): { marker: string; result: Promise<string> } {
    const id = randomBytes(5).toString("hex");
    // Rationale: acknowledge paste with its screenshot label while readiness stays in the pending state.
    const marker = `[📷 screenshot-${id}]`;
    const job = this.#preparation.start(async signal => {
      const content = await read(signal);
      entry.kind = content?.kind === "image" ? "image" : "text";
      if (content?.kind === "image" && this.#imageCount(currentText) >= 8) throw new ImageAttachmentError("image-count");
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
        if (signal.aborted && entry.references === 0 && !readDraft().includes(entry.marker)) entry.job.cancel();
      }
    }
  }

  reconcileDraft(text: string): void {
    for (const entry of this.#pending.values()) {
      if (entry.references === 0 && entry.replacement === undefined && !text.includes(entry.marker)) entry.job.cancel();
    }
  }

  resetPastes(text: string): string {
    let remaining = text;
    for (const entry of this.#pending.values()) if (entry.replacement === undefined) remaining = remaining.replaceAll(entry.marker, "");
    const stopped = this.#preparation.dispose();
    this.#stopping.add(stopped);
    void stopped.finally(() => this.#stopping.delete(stopped));
    this.#preparation = new ImagePreparationClient();
    for (const entry of this.#pending.values()) if (entry.replacement === undefined) entry.job.cancel();
    return remaining;
  }

  async dispose(): Promise<void> { await Promise.all([this.#preparation.dispose(), ...this.#stopping]); }

  #imageCount(text: string): number {
    const regular = [...this.#chips.values()].filter(chip => chip.kind === "image" && text.includes(chip.tag)).length;
    return regular + [...this.#pending.values()].filter(entry => entry.kind !== "text" && (text.includes(entry.marker) || text.includes(entry.marker.replace("screenshot-", "failed-")))).length;
  }

  #addPreparedImage(image: PreparedImage, id: string): string {
    const suffix = image.mimeType === "image/jpeg" ? "jpg" : image.mimeType.split("/")[1] ?? "png";
    const tag = `[📷 screenshot-${id}${image.transformed ? "-resized" : ""}.${suffix}]`;
    const attachment = Object.freeze({ type: "image" as const, data: image.data, mimeType: image.mimeType });
    assertPromptImages([attachment]);
    this.#chips.set(tag, { kind: "image", tag, image: attachment });
    return tag;
  }

  transformPastedContent(content: PiShellClipboardContent, currentText = ""): string {
    if (content.kind === "image") {
      assertImageEncodedSize(content.data);
      const image = canonicalizeClipboardImage(content);
      if (image === null) return "";
      assertPromptImages([...this.prepareSubmission(currentText).images, { type: "image", ...image }]);
      const id = randomBytes(5).toString("hex");
      const tag = `[📷 screenshot-${id}.png]`;
      this.#chips.set(tag, {
        kind: "image",
        tag,
        image: { type: "image", data: image.data, mimeType: image.mimeType },
      });
      return tag;
    }

    const text = content.text;
    if (this.#chips.has(text.trim())) return text.trim();
    const url = text.trim();
    if (URL_PATTERN.test(url)) {
      const label = url.length <= URL_DISPLAY_LENGTH ? url : `${url.slice(0, URL_DISPLAY_LENGTH)}…`;
      return this.#recordUnique({ kind: "url", tag: `[🔗 ${label}]`, label, url });
    }
    const paths = pathsFromClipboard(text);
    if (paths.length === 0) return text;
    return paths.map(item => {
      const label = pathLabel(item.fullPath);
      if (item.kind === "folder") {
        return this.#recordUnique({ kind: "folder", tag: `[📁 ${label}]`, path: item.fullPath });
      }
      const icon = IMAGE_EXTENSION.test(item.fullPath) ? "🖼 " : "📄";
      return this.#recordUnique({ kind: "file", tag: `[${icon} ${label}]`, path: item.fullPath });
    }).join("");
  }

  atomicRanges(line: string): readonly PiShellEditorTextRange[] {
    return [...line.matchAll(CHIP_PATTERN)].map(match => ({
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

  prepareHistoryText(text: string): string {
    return this.#replaceResolvable(text, false).text.replace(CHIP_PATTERN, tag => this.#chips.get(tag)?.kind === "image" ? "" : tag).trim();
  }

  prepareSubmission(text: string): PreparedPrompt {
    const expanded = this.#replaceResolvable(text, true);
    return { text: expanded.text, images: expanded.images };
  }

  #replaceResolvable(text: string, includeImages: boolean): PreparedPrompt {
    let expanded = text;
    for (const entry of this.#pending.values()) {
      if (!expanded.includes(entry.marker) && !expanded.includes(entry.marker.replace("screenshot-", "failed-"))) continue;
      if (includeImages && entry.error !== undefined) throw entry.error;
      if (includeImages && entry.replacement === undefined) throw new ImageAttachmentError("image-pending");
      if (entry.replacement !== undefined) expanded = expanded.replaceAll(entry.marker, entry.replacement);
    }
    const images: PromptImageAttachment[] = [];
    const seenImages = new Set<string>();
    for (const match of expanded.matchAll(CHIP_PATTERN)) {
      const tag = match[0];
      const chip = this.#chips.get(tag);
      if (chip === undefined) continue;
      if (chip.kind === "image") {
        if (includeImages && !seenImages.has(tag)) {
          images.push(chip.image);
          seenImages.add(tag);
        }
        continue;
      }
      const value = chip.kind === "url" ? chip.url : chip.path;
      expanded = expanded.replaceAll(tag, value);
    }
    return { text: expanded, images };
  }

  #recordUnique(chip: PromptChip): string {
    const existing = this.#chips.get(chip.tag);
    if (existing === undefined || sameChipValue(existing, chip)) {
      this.#chips.set(chip.tag, chip);
      return chip.tag;
    }
    const suffix = randomBytes(2).toString("hex");
    const uniqueTag = `${chip.tag.slice(0, -1)} #${suffix}]`;
    const unique = { ...chip, tag: uniqueTag } as PromptChip;
    this.#chips.set(uniqueTag, unique);
    return uniqueTag;
  }
}

interface ClipboardPath {
  readonly fullPath: string;
  readonly kind: "folder" | "file";
}

function pathsFromClipboard(text: string): ClipboardPath[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (normalized.length === 0) return [];
  const paths: ClipboardPath[] = [];
  for (const line of normalized.split("\n").filter(value => value.trim().length > 0)) {
    const wholeLine = existingClipboardPath(line);
    if (wholeLine !== null) {
      paths.push(wholeLine);
      continue;
    }
    const tokens = tokenizePathLine(line)?.filter(token => token.quoted || token.text !== "&");
    if (tokens === undefined || tokens.length === 0) return [];
    for (let index = 0; index < tokens.length;) {
      const token = tokens[index];
      if (token === undefined) return [];
      if (token.quoted) {
        const quoted = existingClipboardPath(token.text);
        if (quoted === null) return [];
        paths.push(quoted);
        index += 1;
        continue;
      }
      if (normalizePath(token.text) === null) return [];
      let runEnd = index;
      while (runEnd < tokens.length && tokens[runEnd]?.quoted !== true) runEnd += 1;
      let matched: ClipboardPath | null = null;
      let matchedEnd = index;
      for (let end = runEnd; end > index; end -= 1) {
        matched = existingClipboardPath(tokens.slice(index, end).map(candidate => candidate.text).join(" "));
        if (matched !== null) {
          matchedEnd = end;
          break;
        }
      }
      if (matched === null) return [];
      paths.push(matched);
      index = matchedEnd;
    }
  }
  return paths;
}

function existingClipboardPath(value: string): ClipboardPath | null {
  const fullPath = normalizePath(unquote(value.trim()));
  if (fullPath === null || !existsSync(fullPath)) return null;
  try {
    const stat = statSync(fullPath);
    if (stat.isDirectory()) return { fullPath, kind: "folder" };
    if (stat.isFile()) return { fullPath, kind: "file" };
  } catch {
    // Compatibility: clipboard path probing is best-effort.
  }
  return null;
}

interface PathToken {
  readonly text: string;
  readonly quoted: boolean;
}

function tokenizePathLine(line: string): PathToken[] | undefined {
  const tokens: PathToken[] = [];
  let index = 0;
  while (index < line.length) {
    while (index < line.length && /\s/u.test(line[index] ?? "")) index += 1;
    if (index >= line.length) break;
    const quote = line[index] === '"' || line[index] === "'" ? line[index] : undefined;
    if (quote !== undefined) {
      index += 1;
      const start = index;
      while (index < line.length && line[index] !== quote) index += 1;
      if (index >= line.length) return undefined;
      tokens.push({ text: line.slice(start, index), quoted: true });
      index += 1;
      if (index < line.length && !/\s/u.test(line[index] ?? "")) return undefined;
      continue;
    }
    const start = index;
    while (index < line.length && !/\s/u.test(line[index] ?? "")) index += 1;
    tokens.push({ text: line.slice(start, index), quoted: false });
  }
  return tokens;
}

function normalizePath(value: string): string | null {
  let candidate = value;
  if (/^file:\/\//iu.test(candidate)) {
    try {
      candidate = fileURLToPath(candidate);
    } catch {
      return null;
    }
  }
  if (process.platform === "win32") {
    const msys = /^\/([A-Za-z])\/(.*)$/u.exec(candidate);
    if (msys !== null) candidate = `${msys[1]}:\\${msys[2]?.replaceAll("/", "\\") ?? ""}`;
  }
  return /^(?:[A-Za-z]:\\|\/)/u.test(candidate) ? path.normalize(candidate) : null;
}

function unquote(value: string): string {
  let result = value.startsWith("& ") ? value.slice(2).trim() : value;
  if ((result.startsWith('"') && result.endsWith('"')) || (result.startsWith("'") && result.endsWith("'"))) {
    result = result.slice(1, -1).trim();
  }
  return result;
}

function pathLabel(fullPath: string): string {
  const basename = path.basename(fullPath);
  if (basename.length > 0) return basename;
  return path.parse(fullPath).root.replace(/[\\/]+$/u, "") || fullPath;
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
