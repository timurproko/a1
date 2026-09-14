import { MAX_CLIPBOARD_TEXT_BYTES } from "../../../contracts/owned-ui/index.js";
import type { PiShellClipboardContent } from "../components/index.js";
import type { PreparedPasteText, ClipboardPath } from "./paste-text-preparation.js";
import type { PreparedImage } from "./image-preparation.js";

export const PASTE_READ_MS = 5_000;
export const PASTE_TOTAL_MS = 15_000;
export const PASTE_STOP_MS = 250;
export const PASTE_TEXT_BYTES = MAX_CLIPBOARD_TEXT_BYTES;
export const PASTE_CHUNK_UNITS = 16_384;
export const PASTE_REQUESTS = 8;
export type PreparedPaste = PreparedPasteText | ({ readonly kind: "image" } & PreparedImage) | null;
/** The predecessor is captured at admission; a later copy cannot change what this paste waits for. */
export type PasteSource =
  | { readonly kind: "native"; readonly before?: (signal: AbortSignal) => Promise<boolean> }
  | { readonly kind: "provided"; readonly read: (signal: AbortSignal) => Promise<PiShellClipboardContent | null>; readonly before?: (signal: AbortSignal) => Promise<boolean> }
  | { readonly kind: "text"; readonly text: string };
export interface PasteEvent {
  readonly request: number;
  readonly phase: "receipt" | "framing" | "admitted" | "predecessor" | "acquiring" | "acquired-text" | "acquired-image" | "classifying" | "path-fallback" | "prepared" | "inserting" | "settled" | "cleanup";
  readonly atMs: number;
  readonly elapsedMs?: number;
  readonly pending: number;
  readonly transport?: "native" | "terminal" | "provided";
  readonly bytes?: number;
  readonly outcome?: "ready" | "failed" | "canceled" | "timed-out";
}
export type PasteHelperInput =
  | { readonly kind: "begin"; readonly source: "native" | "text" | "image"; readonly mimeType?: string }
  | { readonly kind: "data"; readonly data: string }
  | { readonly kind: "finish" }
  | { readonly kind: "convert" }
  | { readonly kind: "next" }
  | { readonly kind: "cancel" };
export type PasteHelperOutput =
  | { readonly kind: "ready" }
  | { readonly kind: "phase"; readonly phase: "acquired-text" | "acquired-image" | "classifying" | "path-fallback" | "prepared"; readonly bytes?: number }
  | { readonly kind: "output"; readonly type: "text" | "url" | "paths" | "image" | "empty"; readonly label?: string; readonly mimeType?: string; readonly width?: number; readonly height?: number; readonly transformed?: boolean }
  | { readonly kind: "data"; readonly data: string }
  | { readonly kind: "path"; readonly path: ClipboardPath }
  | { readonly kind: "done" }
  | { readonly kind: "error"; readonly code: string };

/** Split without breaking UTF-16 surrogate pairs, so per-fragment UTF-8 accounting is exact. */
export function* pasteFragments(text: string): Generator<string> {
  for (let offset = 0; offset < text.length;) {
    let end = Math.min(text.length, offset + PASTE_CHUNK_UNITS);
    const last = text.charCodeAt(end - 1);
    if (end < text.length && last >= 0xd800 && last <= 0xdbff) end--;
    yield text.slice(offset, end);
    offset = end;
  }
}
