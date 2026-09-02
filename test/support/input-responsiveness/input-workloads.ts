export type InputWorkloadTier = "smoke" | "full";
export type InputWorkloadSurface = "editor" | "menu" | "replacement";

export type InputWorkloadAction =
  | { readonly type: "input"; readonly data: string }
  | { readonly type: "stream"; readonly text: string; readonly final?: boolean }
  | { readonly type: "resize"; readonly columns: number; readonly rows: number };

export interface InputWorkloadTurn {
  readonly id: string;
  readonly actions: readonly InputWorkloadAction[];
}

export interface InputResponsivenessWorkload {
  readonly id: string;
  readonly tier: InputWorkloadTier;
  readonly description: string;
  readonly columns: number;
  readonly rows: number;
  readonly surface: InputWorkloadSurface;
  readonly preparedTranscriptBlocks: number;
  readonly turns: readonly InputWorkloadTurn[];
  readonly expectedInputRevisions: number;
  /** Highest revision expected to change terminal-visible semantic state. */
  readonly expectedPresentedRevision?: number;
}

const MAX_WORKLOAD_TURNS = 64;
const MAX_WORKLOAD_ACTIONS = 256;
const MAX_WORKLOAD_INPUT_BYTES = 64 * 1024;
const MAX_PREPARED_TRANSCRIPT_BLOCKS = 256;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export function assertInputResponsivenessWorkload(value: InputResponsivenessWorkload): void {
  if (!ID.test(value.id)) throw new TypeError("input workload id is invalid");
  if (value.tier !== "smoke" && value.tier !== "full") throw new TypeError("input workload tier is invalid");
  if (value.description.trim().length < 10) throw new TypeError("input workload description is invalid");
  if (!Number.isSafeInteger(value.columns) || value.columns < 20 || value.columns > 400
    || !Number.isSafeInteger(value.rows) || value.rows < 5 || value.rows > 200) {
    throw new RangeError("input workload geometry is invalid");
  }
  if (value.surface !== "editor" && value.surface !== "menu" && value.surface !== "replacement") {
    throw new TypeError("input workload surface is invalid");
  }
  if (!Number.isSafeInteger(value.preparedTranscriptBlocks) || value.preparedTranscriptBlocks < 0
    || value.preparedTranscriptBlocks > MAX_PREPARED_TRANSCRIPT_BLOCKS) {
    throw new RangeError("input workload transcript bound is invalid");
  }
  if (value.turns.length < 1 || value.turns.length > MAX_WORKLOAD_TURNS) throw new RangeError("input workload turn count is invalid");
  const ids = new Set<string>();
  let actions = 0;
  let inputBytes = 0;
  let inputRevisions = 0;
  for (const turn of value.turns) {
    if (!ID.test(turn.id) || ids.has(turn.id)) throw new TypeError("input workload turn identity is invalid or duplicated");
    ids.add(turn.id);
    if (turn.actions.length < 1) throw new TypeError("input workload turn is empty");
    for (const action of turn.actions) {
      actions += 1;
      if (action.type === "input") {
        if (action.data.length === 0) throw new TypeError("input workload delivery is empty");
        inputBytes += Buffer.byteLength(action.data);
        inputRevisions += 1;
      } else if (action.type === "stream") {
        if (action.text.length === 0) throw new TypeError("input workload stream payload is empty");
      } else if (!Number.isSafeInteger(action.columns) || !Number.isSafeInteger(action.rows)
        || action.columns < 20 || action.rows < 5) throw new RangeError("input workload resize is invalid");
    }
  }
  if (actions > MAX_WORKLOAD_ACTIONS) throw new RangeError("input workload action count exceeds bound");
  if (inputBytes > MAX_WORKLOAD_INPUT_BYTES) throw new RangeError("input workload input bytes exceed bound");
  if (value.expectedInputRevisions !== inputRevisions) {
    throw new TypeError("input workload expected revisions disagree with original deliveries");
  }
  if (value.expectedPresentedRevision !== undefined
    && (!Number.isSafeInteger(value.expectedPresentedRevision) || value.expectedPresentedRevision < 0
      || value.expectedPresentedRevision > value.expectedInputRevisions)) {
    throw new TypeError("input workload presented revision is invalid");
  }
}

function workload(value: InputResponsivenessWorkload): InputResponsivenessWorkload {
  assertInputResponsivenessWorkload(value);
  return Object.freeze(value);
}

export const INPUT_RESPONSIVENESS_WORKLOADS: readonly InputResponsivenessWorkload[] = Object.freeze([
  workload({
    id: "smoke-current-state",
    tier: "smoke",
    description: "Isolated text, rapid text, editing, and submission exercise the current-state editor path.",
    columns: 80,
    rows: 24,
    surface: "editor",
    preparedTranscriptBlocks: 0,
    turns: [
      { id: "isolated", actions: [{ type: "input", data: "a" }] },
      { id: "rapid", actions: [{ type: "input", data: "b" }, { type: "input", data: "c" }, { type: "input", data: "e\u0301" }] },
      { id: "edit-submit", actions: [{ type: "input", data: "\u001b[D" }, { type: "input", data: "\u007f" }, { type: "input", data: "\r" }] },
    ],
    expectedInputRevisions: 7,
  }),
  workload({
    id: "smoke-menu-stream",
    tier: "smoke",
    description: "Repeated fixed-height menu navigation arrives while a streamed presentation is pending.",
    columns: 80,
    rows: 24,
    surface: "menu",
    preparedTranscriptBlocks: 8,
    turns: [
      { id: "stream", actions: [{ type: "stream", text: "pending" }] },
      { id: "navigate", actions: [{ type: "input", data: "\u001b[B" }, { type: "input", data: "\u001b[B" }, { type: "input", data: "\u001b[A" }] },
      { id: "activate", actions: [{ type: "input", data: "\r" }, { type: "stream", text: "final", final: true }] },
    ],
    expectedInputRevisions: 4,
  }),
  workload({
    id: "full-grapheme-wrap",
    tier: "full",
    description: "Grapheme editing and enough text to cross an editor-height boundary validate conservative geometry fallback.",
    columns: 32,
    rows: 12,
    surface: "editor",
    preparedTranscriptBlocks: 0,
    turns: [
      { id: "graphemes", actions: [{ type: "input", data: "👩🏽‍💻" }, { type: "input", data: "e\u0301" }, { type: "input", data: "\u001b[D" }, { type: "input", data: "\u007f" }] },
      { id: "wrap", actions: [{ type: "input", data: "0123456789012345678901234567890123456789" }] },
    ],
    expectedInputRevisions: 5,
  }),
  workload({
    id: "full-empty-transcript",
    tier: "full",
    description: "The long-transcript input sequence over an empty session provides the equivalent-work control.",
    columns: 80,
    rows: 24,
    surface: "editor",
    preparedTranscriptBlocks: 0,
    turns: [
      { id: "rapid", actions: [{ type: "input", data: "l" }, { type: "input", data: "o" }, { type: "input", data: "n" }, { type: "input", data: "g" }] },
      { id: "barriers", actions: [{ type: "input", data: "\u001b[200~paste\u001b[201~" }, { type: "input", data: "\u001b[?1;2c" }] },
    ],
    expectedInputRevisions: 6,
    expectedPresentedRevision: 5,
  }),
  workload({
    id: "full-long-transcript",
    tier: "full",
    description: "Equivalent geometry-stable input over a long settled transcript proves transcript-size-independent work.",
    columns: 80,
    rows: 24,
    surface: "editor",
    preparedTranscriptBlocks: 200,
    turns: [
      { id: "rapid", actions: [{ type: "input", data: "l" }, { type: "input", data: "o" }, { type: "input", data: "n" }, { type: "input", data: "g" }] },
      { id: "barriers", actions: [{ type: "input", data: "\u001b[200~paste\u001b[201~" }, { type: "input", data: "\u001b[?1;2c" }] },
    ],
    expectedInputRevisions: 6,
    expectedPresentedRevision: 5,
  }),
  workload({
    id: "full-replacement-resize",
    tier: "full",
    description: "Replacement-surface navigation, cancellation, resize, and unknown input exercise every conservative barrier.",
    columns: 72,
    rows: 20,
    surface: "replacement",
    preparedTranscriptBlocks: 20,
    turns: [
      { id: "navigate", actions: [{ type: "input", data: "\u001b[B" }, { type: "input", data: "\u001b[B" }] },
      { id: "resize", actions: [{ type: "resize", columns: 60, rows: 16 }] },
      { id: "cancel", actions: [{ type: "input", data: "\u001b" }] },
    ],
    expectedInputRevisions: 3,
  }),
]);
