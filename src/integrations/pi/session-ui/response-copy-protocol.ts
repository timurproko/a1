import type { OrderedTextSelection, SelectionCopyPrompt } from "../../../ui/components/index.js";

export const COPY_DEADLINE_MS = 5_000;
export const COPY_CLEANUP_MS = 250;
export const MAX_COPY_BYTES = 16 * 1024 * 1024;
export const MAX_COPY_CONTROL_BYTES = 64 * 1024;
export const COPY_CHUNK_UNITS = 16_384;
export type CopyOutcome = "delivered" | "submitted-unverified" | "failed" | "timed-out" | "superseded" | "canceled";
export type CopyFailure = "size" | "unavailable" | "denied" | "transport" | "unsafe";
export interface CopyResult { readonly outcome: CopyOutcome; readonly failure?: CopyFailure }
/** Payload-free observations; callers must not attach transcript/clipboard content. */
export interface ResponseCopyEvent {
  readonly request: number;
  readonly phase: "capture" | "selection-clear" | "queued" | "preparing" | "extracted" | "encoded" | "submitting" | "settled" | "cleanup";
  readonly atMs: number;
  readonly elapsedMs: number;
  readonly pending: number;
  readonly sourceUnits: number;
  readonly bytes?: number;
  readonly transport?: "native" | "terminal" | "injected";
  readonly outcome?: CopyOutcome;
}
/** One request per helper lifetime. Each source fragment is acknowledged before the next is sent. */
export type CopyHelperInput =
  | { readonly kind: "begin"; readonly selection: OrderedTextSelection; readonly rows: number; readonly mode: "native" | "terminal" | "prepare"; readonly literal?: boolean; readonly controlLimit: number }
  | { readonly kind: "row"; readonly text: string; readonly end: boolean; readonly prompt?: Exclude<SelectionCopyPrompt, undefined> }
  | { readonly kind: "finish" }
  | { readonly kind: "next" };
export type CopyHelperOutput =
  | { readonly kind: "ready" }
  | { readonly kind: "data"; readonly text: string }
  | { readonly kind: "phase"; readonly phase: "extracted" | "encoded" | "submitting"; readonly bytes: number }
  | { readonly kind: "result"; readonly result: CopyResult; readonly control?: string };
