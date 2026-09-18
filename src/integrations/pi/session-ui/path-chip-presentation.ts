import path from "node:path";
import type { ClipboardPath, PreparedPasteText } from "./paste-types.js";

export const PATH_CHIP_PRESENTATION_UNITS = 4096;
// Invariant: a collision suffix containing any safe-integer index fits this per-occurrence reserve.
export const PATH_CHIP_SUFFIX_UNITS = 20;
const IMAGE_EXTENSION = /\.(?:jpe?g|png|webp|gif|bmp|tiff?)$/iu;

/** Shared base tag for presentation budgeting and actual chip adoption, including image-file spacing. */
export function pathChipTag(item: ClipboardPath): string {
  const label = path.basename(item.fullPath) || path.parse(item.fullPath).root.replace(/[\\/]+$/u, "") || item.fullPath;
  const icon = item.kind === "folder" ? "📁" : IMAGE_EXTENSION.test(item.fullPath) ? "🖼 " : "📄";
  return `[${icon} ${label}]`;
}

/** Run in the isolated preparer: compact before path arrays become an oversized editor presentation. */
export function preparePathPresentation(paths: readonly ClipboardPath[]): PreparedPasteText {
  let units = 0;
  for (const item of paths) {
    units += pathChipTag(item).length + PATH_CHIP_SUFFIX_UNITS;
    if (units > PATH_CHIP_PRESENTATION_UNITS) {
      // Compatibility: individual adjacent chips expand without inserted separators or text re-normalization.
      const text = paths.map(value => value.fullPath).join("");
      return { kind: "text", text, label: `${text.length} chars` };
    }
  }
  return { kind: "paths", paths };
}
