## Context

See `proposal.md` for motivation. Bare A1 estimates compaction progress by observing summary `text_delta` events. Character-based estimates are capped at `99%` until the compaction ends, and the status contract currently rejects values above 99. The observer also sees the async summary stream terminate normally, which is a stronger completion boundary than the estimated character count. Pi's later `compaction_end` event remains authoritative for leaving the compacting state.

## Goals / Non-Goals

**Goals:**
- Distinguish a still-streaming 99% estimate from a summary stream that completed normally.
- Preserve monotonic whole-percent progress from 0 through a terminal 100.
- Keep lifecycle ownership explicit: stream completion updates progress, while `compaction_end` clears work state.

**Non-Goals:**
- End, abort, or bypass Pi compaction based on an estimated percentage.
- Promise that the entire compaction has ended before Pi emits `compaction_end`.
- Add synthetic timers or change comparison-profile rendering.

## Decisions

### 1. Publish 100 only after normal stream exhaustion

The observer will retain the existing 99% cap for text-based estimates. When its `for await` loop exhausts normally and the same observation generation remains active, it will publish terminal progress of 100. Cancellation, observer disposal, generation changes, or iterator errors will not publish 100.

This is preferred over changing the estimate cap directly: output length can exceed the previous-summary/default denominator before generation is complete, so treating the denominator as completion could falsely finish the UI early. It is also preferred over a timer because elapsed time says nothing about provider completion.

### 2. Keep actual completion under Pi lifecycle control

A 100% progress update will not invoke abort, synthesize `compaction_end`, deliver queued input, or clear work state. The existing real `compaction_end` path remains responsible for clearing `Compacting` and its progress. This prevents presentation logic from truncating or corrupting the summary while ensuring that a normally exhausted stream no longer appears stuck at 99%.

### 3. Widen only the working-progress contract needed by the terminal state

Owned status validation will accept integer progress through 100, and focused rendering/adapter tests will cover `Compacting(100%)`. Existing semantic-state guards continue to reject late updates once compaction is no longer active.

## Risks / Trade-offs

- [Post-stream finalization takes noticeable time] → The UI can briefly remain at `Compacting(100%)`; this truthfully indicates stream completion while the real lifecycle still owns finalization and cleanup.
- [A provider iterator fails instead of ending normally] → Do not publish 100; Pi's failure/end lifecycle remains authoritative and clears the state.
- [A stale observer finishes after another lifecycle transition] → Require the same active generation before publishing terminal progress, preserving current stale-update protection.

## Migration Plan

No data migration is required. Reverting the observer terminal report, validation bound, spec delta, and focused tests restores the previous 99%-until-end presentation.
