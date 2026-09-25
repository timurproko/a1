## Context

`PiEngineRuntime.bindSession()` installs `observeCompactionProgress()` around the current session agent's public `streamFunction`. Runtime suspension deliberately unsubscribes session events and disposes that observer so the original stream function is restored. `resume()` currently restores only the session-event subscription. The runtime therefore remains usable after a recoverable delivery suspension, but its `#compactionProgress` field stays null and `compactionStarted()` has nothing to begin. Bare A1 then renders the valid fallback `Compacting…` instead of the percentage shown before suspension.

The defect is lifecycle-specific: direct observer tests and first-bind integration tests pass because neither exercises observer disposal followed by same-session resume.

## Goals / Non-Goals

**Goals:**
- Reattach compaction observation before resumed session events can start another compaction.
- Keep observer ownership scoped to the currently bound session and avoid nested stream wrappers.
- Prove progress remains visible through the real runtime suspend/resume boundary.

**Non-Goals:**
- Change the character-based estimator, denominator, 99% clamp, or 100% completion rule.
- Infer progress when Pi exposes no callable public stream function.
- Change delivery-overload admission, cancellation, or reconciliation behavior.
- Add percentage presentation to `a1 pi`.

## Decisions

### 1. Centralize observer attachment in the runtime

Extract the existing observer construction into one private runtime operation that binds the current session and forwards progress only while that same session remains current. Both initial session binding and same-session resume will use it. Resume will attach observation before subscribing to session events, so a synchronous `compaction_start` cannot arrive in an observer-free window.

Suspension, replacement, and disposal will continue to dispose the current observer and restore the exact original stream function. Attachment will always dispose any existing observer before installing another, preventing nested wrappers and keeping repeated lifecycle transitions idempotent.

### 2. Extend lifecycle-focused tests

The runtime fixture will expose a callable fake agent stream function and branch manager. The suspend/resume case will verify the initial wrapper is removed on suspension, a fresh wrapper is installed on resume, progress begins at zero after `compaction_start`, stream text advances the estimate, and disposal restores the original function.

A focused adapter or integration case will retain the existing assertions that progress clears on the real compaction-end event. This separates runtime attachment correctness from estimator correctness while covering the user-visible regression path.

## Risks / Trade-offs

- [Repeated resume nests wrappers] → Central attachment disposes the currently owned observer first and tests function identity across repeated transitions.
- [A stale observer reports into a replacement session] → Keep the existing current-session and disposed guards in the progress callback.
- [Resume receives an event before observation exists] → Reattach before session subscription.
- [A session has no callable stream function] → Preserve the null observer and plain `Compacting…` fallback.

## Migration Plan

No data migration is required. Reverting the centralized attachment and resume call restores the current lifecycle behavior.

## Implementation Evidence

- `PiEngineRuntime` now uses one attachment operation for initial binding and same-session resume. Resume removes any live subscription, restores observation, and then installs one current-generation subscription.
- The runtime lifecycle fixture proves suspension restores the configured stream function, repeated resume owns one listener and a non-nested wrapper, resumed compaction reports `0`, `50`, and `100`, and disposal restores the configured function.
- Focused compaction, runtime, adapter, integration, and shell-status validation passed: 5 files and 95 tests.
- Typechecking and strict OpenSpec validation passed. A direct TypeScript production build also passed after generating the startup public artifacts.
- The full repository build preflight could not run because this machine has no Cargo/Rust toolchain. Architecture policy passes through the changed startup graph after repinning its reviewed source-byte total from 1,514,851 to 1,515,244, then reaches the pre-existing stale pinned `src/core/keybindings` destination hash.
- Known gaps: none in the implemented behavior; exact full-build and stale-ledger checks remain CI/environment-owned rather than being weakened or bypassed.
