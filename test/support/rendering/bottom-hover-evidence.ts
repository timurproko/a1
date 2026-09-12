import type { OwnedUiSessionShellRoot } from "../../../src/integrations/pi/session-ui/session-shell-root.js";
import { parseMouseInput, type PaneMouseEvent } from "../../../src/ui/components/index.js";

export type BottomHoverState = ReturnType<OwnedUiSessionShellRoot["viewportPresentationEvidence"]>;
export type BottomHoverFinding = "inconclusive" | "missing-report" | "stale-composition" | "incorrect-paint" | "physical-only";

export interface BottomHoverObservation {
  readonly sequence: number;
  readonly atMs: number;
  readonly phase: "input" | "composition" | "paint";
  readonly state: BottomHoverState;
  readonly mouse?: PaneMouseEvent;
  readonly consumed?: boolean;
  readonly paintedHovered?: boolean | null;
}

/** Test-only bounded metadata capture. No raw input, terminal rows, or user payload survives. */
export class BottomHoverEvidence {
  readonly #events: BottomHoverObservation[] = [];
  readonly #limit: number;
  readonly #enabled: boolean;
  readonly #now: () => number;
  readonly #startedAt: number;
  #seen = 0;

  constructor(options: { readonly enabled?: boolean; readonly limit?: number; readonly now?: () => number } = {}) {
    this.#enabled = options.enabled ?? false;
    this.#limit = options.limit ?? 256;
    if (!Number.isSafeInteger(this.#limit) || this.#limit < 1) throw new RangeError("hover evidence limit must be positive");
    this.#now = options.now ?? (() => performance.now());
    this.#startedAt = this.#now();
  }

  input(data: string, consumed: boolean, state: BottomHoverState): void {
    if (!this.#enabled) return;
    for (const mouse of parseMouseInput(data).events) this.#record("input", state, { mouse, consumed });
  }

  composition(state: BottomHoverState): void { this.#record("composition", state); }

  paint(state: BottomHoverState, paintedHovered: boolean | null): void {
    this.#record("paint", state, { paintedHovered });
  }

  snapshot(): { readonly events: readonly BottomHoverObservation[]; readonly seen: number; readonly truncated: boolean } {
    return { events: [...this.#events], seen: this.#seen, truncated: this.#seen > this.#events.length };
  }

  #record(
    phase: BottomHoverObservation["phase"],
    state: BottomHoverState,
    detail: Pick<BottomHoverObservation, "mouse" | "consumed" | "paintedHovered"> = {},
  ): void {
    if (!this.#enabled) return;
    const sequence = ++this.#seen;
    if (this.#events.length >= this.#limit) return;
    // Security: select each field instead of spreading arbitrary caller objects.
    const pointer = (value: BottomHoverState["currentPointer"]) => value === null
      ? null : { column: value.column, row: value.row };
    this.#events.push({
      sequence, atMs: Math.max(0, this.#now() - this.#startedAt), phase,
      state: {
        candidate: state.candidate, candidateRevision: state.candidateRevision,
        currentRevision: state.currentRevision, composedRevision: state.composedRevision,
        currentPointer: pointer(state.currentPointer), composedPointer: pointer(state.composedPointer),
        frameId: state.frameId,
        bottom: state.bottom === null ? null : {
          row: state.bottom.row, columnStart: state.bottom.columnStart, columnEnd: state.bottom.columnEnd,
        },
        followingEnd: state.followingEnd, scrollTop: state.scrollTop, maxScroll: state.maxScroll, cause: state.cause,
      },
      ...(detail.mouse === undefined ? {} : { mouse: {
        kind: detail.mouse.kind, button: detail.mouse.button, column: detail.mouse.column, row: detail.mouse.row,
      } }),
      ...(detail.consumed === undefined ? {} : { consumed: detail.consumed }),
      ...(detail.paintedHovered === undefined ? {} : { paintedHovered: detail.paintedHovered }),
    });
  }
}

/** A passing synthetic checkpoint never by itself establishes physical symptom resolution. */
export function classifyBottomHoverFinding(evidence: {
  readonly complete: boolean;
  readonly failureObserved: boolean;
  readonly reportObserved: boolean;
  readonly compositionMatches: boolean;
  readonly paintMatches: boolean;
}): BottomHoverFinding {
  if (!evidence.complete || !evidence.failureObserved) return "inconclusive";
  if (!evidence.reportObserved) return "missing-report";
  if (!evidence.compositionMatches) return "stale-composition";
  if (!evidence.paintMatches) return "incorrect-paint";
  return "physical-only";
}
