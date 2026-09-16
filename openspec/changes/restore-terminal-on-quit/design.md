## Context

See `proposal.md` for motivation and `specs/owned-pi-ui-foundation/spec.md` for the observable contract. Today both `/quit` and the second `Ctrl+C` call the shell's quit workflow. That workflow disposes the engine adapter, but presentation cleanup was deferred to the outer application runner after a delivered stopped event. The first implementation made that handoff explicit and restores the terminal, but live acceptance exposed a second boundary failure: a loaded extension can leave an active Node handle after all owned UI cleanup resolves. The UI entry then sets `process.exitCode` but never terminates, leaving the restored terminal without a parent-shell prompt. The shell already has idempotent terminal cleanup and the outer runner already provides bounded final cleanup, so executable termination can safely occur only after those layers finish.

## Goals / Non-Goals

**Goals:**

- Give every owned-UI quit entry point one idempotent shutdown operation.
- Couple successful backend shutdown with prompt presentation disposal and terminal restoration instead of relying only on asynchronous lifecycle delivery.
- Preserve outer-runner cleanup as a final idempotent safety net.
- Prove real child-process exit and terminal return even when an extension leaves an event-loop handle alive.

**Non-Goals:**

- Changing the first-press clear behavior, the existing double-press interval, or keybindings.
- Calling `process.exit()` from the reusable session shell/application runner or bypassing their bounded cleanup.
- Changing non-interactive, fatal-exit, session replacement, or pinned dependency behavior.

## Decisions

### 1. Make the owned session shell coordinate complete quit

The shell-level quit operation will serialize concurrent requests and own the sequence: request the existing backend quit workflow, dispose the presentation runtime through the shell's existing idempotent cleanup, and settle the shell stop signal used by the application runner. `/quit`, the clear/exit chord, selectors, owned routes, and extension shutdown requests will continue to converge on that operation.

This keeps engine disposal in the engine and terminal ownership in the presentation layer while making their handoff explicit. It also avoids adding terminal concerns to the engine adapter. The alternative—waiting only for the backend's queued `stopped` event—retains the race that can strand the fullscreen surface.

### 2. Do not render a normal workflow result after quit

Quit will remain a silent terminal operation at the session-shell presentation boundary. Once shutdown begins, the shell will not append `Shutdown complete` or request another frame from an already disposed runtime. Any backend failure will retain its existing classified result while presentation cleanup remains bounded and idempotent so a failed teardown cannot indefinitely own the terminal.

The alternative—using the generic workflow-result path and then disposing—creates an unnecessary post-shutdown render window and preserves coupling to components that are no longer active.

### 3. Terminate only at the executable boundary after cleanup

The owned UI executable entry will explicitly terminate with the successful runner result after session, presentation, terminal, history, extension-session, fatal-handler, and outer-runner cleanup has completed. Before terminating, it will give pending stdout/stderr writes a bounded opportunity to drain so terminal restoration and configured exit output are not truncated. Reusable shell and application APIs will continue to return normally and will never terminate their host process.

Setting only `process.exitCode` is insufficient because third-party extensions can create servers, timers, or other event-loop handles that outlive their session shutdown callback. Attempting to discover and close arbitrary extension handles is rejected because ownership and cleanup semantics are unknowable. Early `process.exit()` is also rejected because it can bypass the cleanup that restores the terminal; the executable boundary is the only safe location after that work resolves.

### 4. Verify both in-process sequencing and process-level terminal release

Focused shell tests will cover `/quit`, the second `Ctrl+C`, duplicate/concurrent shutdown requests, stop settlement, and absence of post-disposal rendering. A process regression will retain a synthetic extension-style server handle while driving each quit route, then assert bounded child completion plus terminal restoration/parent-shell continuation. Existing autocomplete/component fixtures will assert the exact `Quit` description.

Unit-only adapter tests are insufficient because they can pass while the presentation runtime has stopped but an extension-owned handle keeps the executable alive, which is the live acceptance failure mode.

## Risks / Trade-offs

- **[Risk] Backend and presentation cleanup can be requested concurrently by event delivery, extension callbacks, or outer `finally` cleanup.** → Use one memoized/idempotent shell shutdown path and retain idempotent lower-level disposal.
- **[Risk] Disposing presentation before all final output is captured can lose the configured exit transcript or resume hint.** → Continue using the existing shell disposal routine and preserve its current output capture and write-after-stop ordering.
- **[Risk] Explicit executable termination can truncate pending terminal output.** → Wait for pending stdout/stderr writes with a short bound, and invoke termination only after the owned runner has completed all cleanup.
- **[Risk] A process test can be timing-sensitive on Windows terminals.** → Use bounded readiness/exit observation and semantic restoration or continuation markers rather than fixed sleeps or screenshot bytes.
- **[Trade-off] Complete quit moves special handling out of the generic workflow-result tail and requires an executable-only termination step.** → Keep lifecycle handling out of reusable APIs; all other workflows retain the shared path.

## Migration Plan

No data or configuration migration is required. Deploy as an in-place lifecycle correction. Rollback is the ordinary code revert; no persisted state or public interface changes need reversal.
