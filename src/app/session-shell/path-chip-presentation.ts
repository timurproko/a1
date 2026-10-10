import path from "node:path";
import type { ClipboardPath, PreparedPasteText } from "./paste-types.js";

export const PATH_CHIP_PRESENTATION_UNITS = 4096;
const IMAGE_EXTENSION = /\.(?:jpe?g|png|webp|gif|bmp|tiff?)$/iu;

/** Normalizes a path for host-filesystem identity comparisons. */
export function normalizedPathIdentity(fullPath: string): string {
  const normalized = path.normalize(fullPath.trim());
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

/** Yields labels from the basename through the normalized rooted path, shortest first. */
export function* pathChipLabelCandidates(fullPath: string): Iterable<string> {
  const normalized = path.normalize(fullPath.trim());
  const parsed = path.parse(normalized);
  const relative = normalized.slice(parsed.root.length);
  const segments = relative.split(path.sep).filter(segment => segment.length > 0);
  let previous = "";
  for (let depth = 1; depth <= segments.length; depth++) {
    previous = segments.slice(-depth).join("/");
    yield previous;
  }
  const rooted = displayPath(normalized);
  if (segments.length === 0) {
    const root = displayPath(parsed.root).replace(/\/$/u, "");
    if (root.length > 0) { previous = root; yield root; }
  }
  if (rooted.length > 0 && rooted !== previous) yield rooted;
}

/** Formats one path label with the established folder/file/image-file icon. */
export function pathChipTag(item: ClipboardPath, label = basePathLabel(item.fullPath)): string {
  const icon = item.kind === "folder" ? "📁" : IMAGE_EXTENSION.test(item.fullPath) ? "🖼 " : "📄";
  return `[${icon} ${label}]`;
}

/** Yields complete deterministic tags lazily for path collision adoption. */
export function* pathChipTagCandidates(item: ClipboardPath): Iterable<string> {
  for (const label of pathChipLabelCandidates(item.fullPath)) yield pathChipTag(item, label);
}

/** Returns the conservative UTF-16 presentation cost for one path occurrence. */
export function pathChipPresentationUnits(item: ClipboardPath): number {
  return pathChipTag(item, displayPath(path.normalize(item.fullPath.trim()))).length;
}

/** Run in the isolated preparer: compact before path arrays become an oversized editor presentation. */
export function preparePathPresentation(paths: readonly ClipboardPath[]): PreparedPasteText {
  let units = 0;
  for (const item of paths) {
    units += pathChipPresentationUnits(item);
    if (units > PATH_CHIP_PRESENTATION_UNITS) {
      // Compatibility: individual adjacent chips expand without inserted separators or text re-normalization.
      const text = paths.map(value => value.fullPath).join("");
      return { kind: "text", text, label: `${text.length} chars` };
    }
  }
  return { kind: "paths", paths };
}

function basePathLabel(fullPath: string): string {
  const normalized = path.normalize(fullPath.trim());
  return path.basename(normalized)
    || displayPath(path.parse(normalized).root).replace(/\/$/u, "")
    || displayPath(normalized);
}

function displayPath(value: string): string {
  return path.sep === "\\" ? value.replaceAll("\\", "/") : value;
}
