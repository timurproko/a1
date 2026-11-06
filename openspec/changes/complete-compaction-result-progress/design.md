## Context

Bare A1 wraps the bound Pi agent's public `streamFunction` during compaction. It counts `text_delta` characters through a background `for await` loop and currently publishes `100%` only after that loop exhausts normally.

Pinned Pi 1.5.0's `AssistantMessageEventStream.push()` resolves `result()` as soon as it receives the terminal `done` or `error` event, then delivers that event to an async-iterator consumer. Pi's compaction path awaits `result()`. Promise reaction ordering therefore lets Pi continue through summary persistence and `compaction_end` before A1's independent iterator observes exhaustion. A1 invalidates the observer at `compaction_end`, so the last displayed value is only the character estimate. A typical approximately 2,000-character first summary divided by the 4,000-character default explains the reported `40%` to `50%` finish.

The provider does not announce the eventual summary length or duration. Exact intermediate wall-clock completion is therefore unavailable; only the initial lifecycle boundary, streamed output estimate, and successful final result are directly observable.

## Goals / Non-Goals

**Goals:**
- Guarantee that a successful observable summary reports terminal `100%` before Pi clears compaction state.
- Preserve immediate `0%`, monotonic character estimates, and the running `99%` cap.
- Use pinned Pi's public stream contract without changing or delaying its request.
- Cover the actual result-before-iterator ordering used by release builds and the default bare-A1 route.

**Non-Goals:**
- Claim exact intermediate completion when the provider exposes no total output length.
- Change the previous-summary/default denominator or synthesize time-based progress.
- Delay `compaction_end`, hold a completed working state on screen, or make presentation control compaction.
- Change `a1 pi`, custom extension-provided compactions that bypass the stream, or Pi package code.

## Decisions

### 1. Treat the public stream result as the terminal observation boundary

After the wrapped `streamFunction` receives an active compaction stream, the observer will register a handler on the stream's public `result()` promise before returning that stream to Pi. A successful current-generation result will publish `100%`. Because Pi cannot register and await its own result continuation until the wrapper returns, A1's already-registered terminal handler runs first for the same resolved result.

Text deltas will remain observed through async iteration. Iterator exhaustion will no longer be the sole terminal signal, removing the ordering race without replacing the stream object, mutating Pi, consuming the result, or delaying Pi's continuation.

### 2. Preserve lifecycle and failure guards

Terminal publication will require the same active generation and undisposed observer as text progress. A rejected result, failed/aborted terminal response, stale generation, explicit observer end, or disposal will not publish `100%`. The real `compaction_end` event remains responsible for ending observation and clearing the working status.

This preserves retries: failed attempts do not claim completion, while the successful attempt can publish the terminal value. The existing integer deduplication and generation checks continue to suppress duplicate and late updates.

### 3. Test the pinned ordering rather than an artificial gap

A focused observer regression will use Pi's exported assistant-message event stream (or an equivalent fixture with the same contract) to prove that `result()` resolves before the async iterator receives the terminal event and that progress still records `100%` before observer end.

The pinned `AgentSession` integration will no longer establish terminal visibility by artificially ending iteration while withholding the result. It will resolve the final result in Pi's real order and assert the emitted status sequence contains terminal `100%` before compaction-end cleanup. Existing tests will retain immediate zero, character estimates, stale/failure suppression, 99% clamping, runtime resume, and unobservable fallback coverage.

## Risks / Trade-offs

- [Intermediate percentages remain approximate] → State this explicitly in the capability and retain only directly observable endpoint guarantees.
- [A terminal error also resolves Pi's event-stream result] → Classify the terminal response and suppress `100%` for failed or aborted outcomes.
- [A custom stream rejects its result promise] → Attach a rejection handler so observation never creates an unhandled rejection or affects Pi.
- [Pi changes terminal ordering] → The result handler remains valid because it uses the public result contract; focused pinned integration exposes incompatible changes during dependency upgrades.
- [Terminal `100%` and cleanup are close together] → Preserve truthful event ordering without delaying lifecycle completion; adapter history and rendering coverage prove `100%` precedes the clear transition.

## Migration Plan

No data migration is required. Reverting the result handler and its focused coverage restores iterator-exhaustion terminal reporting.
