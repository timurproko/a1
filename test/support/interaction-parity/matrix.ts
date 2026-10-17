/**
 * The direct-versus-resident interaction matrix.
 *
 * Every case is an input script plus the observation kinds it must produce. The same cases drive
 * the owned-shell oracle, the native role fixtures, and the exact-package harness, so a resident
 * divergence is named by case, kind, and sequence rather than by a screenshot diff.
 */

export type InteractionCategory =
  | "prompt-editing" | "completion-history" | "shortcuts" | "selection" | "clipboard" | "mouse-focus"
  | "dialogs" | "extension-ui" | "attachments" | "resize" | "streaming" | "switching" | "detach"
  | "recovery" | "restoration";

export type ObservationKind =
  | "key" | "action" | "prompt" | "selection" | "clipboard" | "cells" | "cursor" | "modes" | "stream" | "latency";

/** The only resident behaviours that may differ from direct A1, each named so a case can declare it. */
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
  /** Observation kinds every candidate must report for this case. */
  readonly expects: readonly ObservationKind[];
  /** A declared resident-only difference that comparison tolerates for this case. */
  readonly residentDifference?: ResidentDifference;
  /** Whether the exact-package harness may run this case against built candidates. */
  readonly exactPackage: boolean;
}

/** Latency bounds per observation kind, in milliseconds, consistent with the resident budgets. */
export const LATENCY_BUDGETS_MS: Readonly<Record<ObservationKind, number>> = Object.freeze({
  key: 16,
  action: 16,
  prompt: 16,
  selection: 33,
  clipboard: 400,
  cells: 33,
  cursor: 33,
  modes: 33,
  stream: 33,
  latency: 300,
});

const letters = (text: string): InteractionStep[] => [{ kind: "text", text }];

export const INTERACTION_MATRIX: readonly InteractionCase[] = Object.freeze([
  { id: "prompt.type-ascii", category: "prompt-editing", description: "Type ASCII into an ordinary prompt", steps: letters("hello"), expects: ["key", "prompt", "cells", "cursor"], exactPackage: true },
  { id: "prompt.type-unicode", category: "prompt-editing", description: "Type wide and combining Unicode", steps: letters("开发 é"), expects: ["key", "prompt", "cells", "cursor"], exactPackage: true },
  { id: "prompt.multiline", category: "prompt-editing", description: "Insert a new line and move across it", steps: [...letters("one"), { kind: "key", key: "enter", mods: ["shift"] }, ...letters("two"), { kind: "key", key: "arrow-up" }], expects: ["key", "prompt", "cursor"], exactPackage: true },
  { id: "prompt.word-motion", category: "prompt-editing", description: "Home, End, and word motion", steps: [...letters("alpha beta"), { kind: "key", key: "home" }, { kind: "key", key: "arrow-right", mods: ["ctrl"] }, { kind: "key", key: "end" }], expects: ["key", "cursor"], exactPackage: true },
  { id: "prompt.delete-undo", category: "prompt-editing", description: "Delete words and undo", steps: [...letters("alpha beta"), { kind: "key", key: "backspace", mods: ["ctrl"] }, { kind: "key", key: "z", mods: ["ctrl"], text: "z" }], expects: ["key", "action", "prompt"], exactPackage: true },
  { id: "history.recall", category: "completion-history", description: "Recall history with the arrow keys", steps: [{ kind: "key", key: "arrow-up" }, { kind: "key", key: "arrow-down" }], expects: ["key", "prompt"], exactPackage: false },
  { id: "completion.path", category: "completion-history", description: "Accept a path completion with Tab", steps: [...letters("./"), { kind: "key", key: "tab" }], expects: ["key", "action", "prompt"], exactPackage: false },
  { id: "shortcut.default-prompt", category: "shortcuts", description: "Default prompt shortcuts invoke one action", steps: [...letters("abc"), { kind: "key", key: "a", mods: ["ctrl"], text: "a" }], expects: ["key", "action", "selection"], exactPackage: true },
  { id: "shortcut.customized", category: "shortcuts", description: "A customized binding invokes the remapped action", steps: [{ kind: "key", key: "q", mods: ["ctrl"], text: "q" }], expects: ["key", "action"], exactPackage: false },
  { id: "shortcut.help", category: "shortcuts", description: "/hotkeys lists effective declarations", steps: [...letters("/hotkeys"), { kind: "key", key: "enter" }], expects: ["key", "cells"], exactPackage: false },
  { id: "selection.prompt-drag", category: "selection", description: "Drag-select prompt text", steps: [...letters("select me"), { kind: "mouse", action: "press", button: 1, column: 0, row: 20 }, { kind: "mouse", action: "motion", button: 1, column: 6, row: 20 }, { kind: "mouse", action: "release", button: 1, column: 6, row: 20 }], expects: ["selection", "cells"], exactPackage: false },
  { id: "selection.double-click", category: "selection", description: "Double-click selects a word", steps: [{ kind: "mouse", action: "press", button: 1, column: 2, row: 20 }, { kind: "mouse", action: "release", button: 1, column: 2, row: 20 }, { kind: "mouse", action: "press", button: 1, column: 2, row: 20 }, { kind: "mouse", action: "release", button: 1, column: 2, row: 20 }], expects: ["selection", "cells"], exactPackage: false },
  { id: "clipboard.copy-selection", category: "clipboard", description: "Ctrl+C copies a selection and stays attached", steps: [...letters("copy me"), { kind: "key", key: "a", mods: ["ctrl"], text: "a" }, { kind: "key", key: "c", mods: ["ctrl"], text: "c" }], expects: ["key", "action", "clipboard", "selection"], exactPackage: false },
  { id: "clipboard.first-paste", category: "clipboard", description: "First Ctrl+V pastes exactly once", steps: [{ kind: "key", key: "v", mods: ["ctrl"], text: "v" }], expects: ["key", "action", "prompt"], exactPackage: false },
  { id: "clipboard.terminal-paste", category: "clipboard", description: "A bracketed terminal paste arrives as one transaction", steps: [{ kind: "paste", text: "line one\nline two" }], expects: ["key", "prompt"], exactPackage: true },
  { id: "mouse.focus", category: "mouse-focus", description: "Focus events reach the child when it asks for them", steps: [{ kind: "focus", gained: false }, { kind: "focus", gained: true }], expects: ["key"], exactPackage: true },
  { id: "mouse.scroll", category: "mouse-focus", description: "Wheel events scroll the transcript", steps: [{ kind: "mouse", action: "scroll-up", column: 10, row: 5 }, { kind: "mouse", action: "scroll-down", column: 10, row: 5 }], expects: ["key", "cells"], exactPackage: true },
  { id: "dialog.escape", category: "dialogs", description: "A dialog owns input and Escape cancels it", steps: [...letters("/models"), { kind: "key", key: "enter" }, { kind: "key", key: "escape" }], expects: ["key", "action", "cells"], exactPackage: false },
  { id: "extension.text-ui", category: "extension-ui", description: "Certified extension text UI receives keys", steps: [{ kind: "key", key: "arrow-down" }, { kind: "key", key: "enter" }], expects: ["key", "cells"], exactPackage: false },
  { id: "attachment.entry", category: "attachments", description: "Attachment entry keeps the prompt coherent", steps: [...letters("@"), { kind: "key", key: "escape" }], expects: ["key", "prompt"], exactPackage: false },
  { id: "resize.shrink-grow", category: "resize", description: "Resize re-flows the child without stale rows", steps: [{ kind: "resize", columns: 80, rows: 20 }, { kind: "resize", columns: 100, rows: 24 }], expects: ["cells", "cursor"], residentDifference: "tab-strip-row", exactPackage: true },
  { id: "stream.concurrent", category: "streaming", description: "Streaming output keeps advancing with stamped checkpoints", steps: [{ kind: "wait", ms: 500 }], expects: ["stream", "latency"], exactPackage: true },
  { id: "switch.first-input", category: "switching", description: "The first input after a switch reaches the new child once", steps: [{ kind: "key", key: "q", text: "q" }], expects: ["key"], residentDifference: "process-residency", exactPackage: true },
  { id: "detach.double-ctrl-c", category: "detach", description: "Double Ctrl+C leaves the interface while agents keep running", steps: [{ kind: "key", key: "c", mods: ["ctrl"], text: "c" }, { kind: "key", key: "c", mods: ["ctrl"], text: "c" }], expects: ["key", "action"], residentDifference: "detach-instead-of-exit", exactPackage: true },
  { id: "recovery.restart", category: "recovery", description: "A restarted child presents its newest surface", steps: [{ kind: "wait", ms: 200 }], expects: ["cells", "cursor"], exactPackage: false },
  { id: "restoration.modes", category: "restoration", description: "Terminal modes and cursor are restored on exit", steps: [{ kind: "key", key: "c", mods: ["ctrl"], text: "c" }, { kind: "key", key: "c", mods: ["ctrl"], text: "c" }], expects: ["modes", "cursor"], residentDifference: "detach-instead-of-exit", exactPackage: true },
]);

export const EXACT_PACKAGE_CASES: readonly InteractionCase[] = INTERACTION_MATRIX.filter(entry => entry.exactPackage);

export function interactionCase(id: string): InteractionCase {
  const found = INTERACTION_MATRIX.find(entry => entry.id === id);
  if (!found) throw new Error(`unknown interaction case: ${id}`);
  return found;
}
