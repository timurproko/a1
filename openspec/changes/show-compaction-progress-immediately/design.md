## Context

The adapter installs one optional observer around the bound session agent's public `streamFunction`. On `compaction_start`, the session-event translator first enters the semantic `Compacting` work state and then calls the observer's `begin()`. `begin()` currently resets its estimate but emits nothing; the first `0%` is emitted later from inside the wrapped stream function. Pinned Pi performs authentication, preparation, and extension interception between those boundaries, so a valid observable compaction can retain null progress for a significant interval.

The existing adapter test manually emits `compaction_start`, flushes it, and then calls a fake stream function. It proves stream counting but does not exercise pinned Pi's own `AgentSession.compact()` lifecycle.

## Goals / Non-Goals

**Goals:**
- Make the initial zero-percent status synchronous with the observable compaction start.
- Keep progress ownership in the compaction observer and semantic-state guard.
- Exercise the correction through a real pinned `AgentSession` with deterministic local collaborators.

**Non-Goals:**
- Estimate authentication, preparation, reasoning, or wall-clock completion separately.
- Change the character-based denominator, monotonicity, or 99% running clamp.
- Show percentages when the public stream function is unavailable or in `a1 pi`.
- Make network calls in the integration test.

## Decisions

### 1. Emit the initial estimate from `begin()`

After resetting the streamed count and resolving the expected summary size, `begin()` will mark observation active and invoke the existing deduplicated reporting function. The first computed value is therefore `0`, and later stream invocation cannot emit a duplicate. This uses the same progress callback and adapter state guard as streamed updates rather than creating a second progress producer.

Publishing from `compaction_start` handling is preferred over a timer or UI-only placeholder: the observer already knows whether a callable stream function was available when the session was bound, while the presenter must remain a pure renderer. The plain fallback remains unchanged because no observer exists when that capability is absent.

### 2. Cover both observer behavior and the pinned lifecycle

Focused observer/adapter coverage will assert that `compaction_start` publishes zero before the stream function is invoked. A new integration case will construct pinned Pi's real `AgentSession` with an in-memory branch, deterministic authentication, and a gated fake summary stream, bind it through the A1 adapter, invoke real compaction, and assert that the adapter exposes `Compacting` with `workingProgress: 0` while the summary request is still gated. Releasing text deltas will prove the same lifecycle advances and clears progress.

This is preferred over another handcrafted session event fixture because the defect lies in ordering across pinned Pi preparation and A1 observation. The test remains hermetic by supplying a fake stream and no provider network access.

## Risks / Trade-offs

- [An extension supplies compaction content without invoking the stream] → An observable session can show `0%` until that compaction ends; cleanup remains authoritative, and this is preferable to presenting a long capable compaction as unobservable.
- [Synchronous reporting is reentrant during `compaction_start`] → The event translator establishes the compaction work state before calling `begin()`, so its existing state guard accepts the update in deterministic order.
- [The integration fixture couples to pinned Pi construction APIs] → Keep it focused on public exports already owned by the Pi integration boundary and use local deterministic collaborators.

## Migration Plan

No data migration is required. Reverting the `begin()` report and its focused tests restores the previous delayed-zero behavior.
