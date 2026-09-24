import type { AgentSession } from "../startup-public.js";

/** Expected summary size for a first compaction, when no previous summary on the branch can serve as the estimate. */
export const DEFAULT_EXPECTED_COMPACTION_SUMMARY_CHARS = 4000;

/** Character-based estimates stay below terminal stream completion. */
const MAX_STREAMING_PERCENT = 99;
const COMPLETE_PERCENT = 100;

type StreamFunction = AgentSession["agent"]["streamFunction"];

/** The public session surface compaction progress reads: the agent's stream function and the branch entries. */
export interface CompactionProgressSession {
  readonly agent?: { streamFunction?: unknown } | undefined;
  readonly sessionManager?: { getBranch?(): readonly unknown[] } | undefined;
}

export interface CompactionProgressObserver {
  /** Marks `compaction_start`: resets the estimate and immediately reports zero percent. */
  begin(): void;
  /** Marks `compaction_end`: later stream chunks are ignored. */
  end(): void;
  /** Restores the original stream function; the observer reports nothing afterwards. */
  dispose(): void;
}

/**
 * Observes summary-stream progress without changing the stream returned to Pi. Returns null
 * when the session exposes no callable public stream function.
 */
export function observeCompactionProgress(
  session: CompactionProgressSession,
  onProgress: (percent: number) => void,
): CompactionProgressObserver | null {
  const agent = session.agent;
  if (agent === undefined || typeof agent.streamFunction !== "function") return null;
  const original = agent.streamFunction as StreamFunction;
  let active = false;
  let disposed = false;
  let generation = 0;
  let streamed = 0;
  let expected = DEFAULT_EXPECTED_COMPACTION_SUMMARY_CHARS;
  let reported: number | null = null;

  const report = (percent = Math.min(MAX_STREAMING_PERCENT, Math.floor((100 * streamed) / expected))): void => {
    if (percent === reported) return;
    reported = percent;
    onProgress(percent);
  };

  const wrapped: StreamFunction = async (model, context, options) => {
    const stream = await original(model, context, options);
    if (!active || disposed) return stream;
    const observed = generation;
    void (async () => {
      report();
      // Invariant: observation never affects the request; a stream that cannot be iterated ends observation only.
      try {
        for await (const event of stream) {
          if (observed !== generation || !active) return;
          if (event.type === "text_delta") {
            streamed += event.delta.length;
            report();
          }
        }
        // Invariant: normal exhaustion is the only observed completion boundary. The real
        // compaction_end event owns work-state exit; errors and stale generations never claim 100%.
        if (observed === generation && active && !disposed) report(COMPLETE_PERCENT);
      } catch {
        return;
      }
    })();
    return stream;
  };
  agent.streamFunction = wrapped;

  return {
    begin() {
      generation += 1;
      streamed = 0;
      reported = null;
      expected = latestCompactionSummaryLength(session) ?? DEFAULT_EXPECTED_COMPACTION_SUMMARY_CHARS;
      active = true;
      report();
    },
    end() {
      active = false;
      generation += 1;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      active = false;
      generation += 1;
      if (agent.streamFunction === wrapped) agent.streamFunction = original;
    },
  };
}

function latestCompactionSummaryLength(session: CompactionProgressSession): number | null {
  let entries: readonly unknown[];
  try {
    entries = session.sessionManager?.getBranch?.() ?? [];
  } catch {
    return null;
  }
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (typeof entry !== "object" || entry === null) continue;
    const { type, summary } = entry as { type?: unknown; summary?: unknown };
    if (type === "compaction" && typeof summary === "string" && summary.length > 0) return summary.length;
  }
  return null;
}
