export type InteractionCategory =
  | "prompt-editing" | "completion-history" | "shortcuts" | "selection" | "clipboard" | "mouse-focus"
  | "dialogs" | "extension-ui" | "attachments" | "resize" | "streaming" | "switching" | "detach"
  | "recovery" | "restoration";

export type ObservationKind =
  | "key" | "action" | "prompt" | "selection" | "clipboard" | "cells" | "cursor" | "modes" | "stream" | "latency";

export type ResidentDifference =
  | "tab-strip-row" | "detach-instead-of-exit" | "session-name-hidden" | "image-text-fallback" | "process-residency";

export type InteractionStep =
  | { readonly kind: "key"; readonly key: string; readonly mods?: readonly ("ctrl" | "alt" | "shift")[]; readonly text?: string }
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "paste"; readonly text: string }
  | { readonly kind: "mouse"; readonly action: "press" | "release" | "motion" | "scroll-up" | "scroll-down"; readonly button?: 1 | 2 | 3; readonly column: number; readonly row: number }
  | { readonly kind: "focus"; readonly gained: boolean }
  | { readonly kind: "resize"; readonly columns: number; readonly rows: number }
  | { readonly kind: "wait"; readonly ms: number };

export interface InteractionCase {
  readonly id: string;
  readonly category: InteractionCategory;
  readonly description: string;
  readonly steps: readonly InteractionStep[];
  readonly expects: readonly ObservationKind[];
  readonly residentDifference?: ResidentDifference;
  readonly exactPackage: boolean;
}

export const LATENCY_BUDGETS_MS: Readonly<Record<ObservationKind, number>>;
export const INTERACTION_CATEGORIES: readonly InteractionCategory[];
export const INTERACTION_MATRIX: readonly InteractionCase[];
export const EXACT_PACKAGE_CASES: readonly InteractionCase[];
export const KEY_TRANSPORT_CASES: readonly InteractionCase[];
export function interactionCase(id: string): InteractionCase;
