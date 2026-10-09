## Context

Fourth of eight preparatory changes for multi-agent tabs. Independent of the previous three in code, but should follow `narrow-owned-ui-backend-port` to avoid merge conflicts in `session-shell.ts`. Evidence from `develop` at `337ad3e7`:

- The constructor subscribes to backend events (`session-shell.ts:646`), binds settings owners (`:468`, `:471`, `:552`), sets the workflow interaction host (`:635`), and binds the clipboard writer (`:708`) before `start()`. The runtime adapter is constructed at `:412`; if it throws, the earlier bindings leak. Composition's `catch` at `composition/owned-ui.ts:266` releases diagnostics and the release-note claim but never disposes the shell.
- `#dispose` unsubscribes backend events at `:1801`, after history close and outro capture; an event arriving in between re-enters `#syncView`. `#settleStoppedLifecycle` (`:1848`) calls `dispose()` from inside the event listener.
- `shutdown()` awaits `executeWorkflow({ command: "quit" })` at `:1382` before `dispose()`; a hung engine keeps the terminal captured.
- `#disposePromise` is cleared on settle while `#disposed` stays true (`:1757-1759`), so a second `dispose()` resolves without waiting.
- The root's theme subscription (`session-shell-root.ts:593`) and helper clients are disposed only via the runtime's `#disposeRoot` (`tui-runtime/adapter.ts:719-724`); a shell that never reached runtime construction never disposes them.

## Goals / Non-Goals

**Goals:** construction is transactional; teardown order is events first, then UI, then engine; every teardown step is bounded; repeated dispose is idempotent and awaited.

**Non-Goals:** the shell split (later change); changing what `quit` means; changing the quit outro animation; fixing the draft-keyed `#waitingImages` collision (`:771`), which is a separate behavior bug to file.

## Decisions

### Collect bindings in a disposer list during construction

Each bind call pushes its unbind function onto a `#constructed: (() => void)[]` array. The constructor body is wrapped so that on throw it runs the list in reverse, then rethrows. Composition catches and, if the shell instance exists, awaits `shell.dispose()` before its own cleanup.

### Teardown order

1. `#unsubscribe()` backend events and set `#disposed`.
2. Cancel pending timers and the startup-route poll.
3. History close and outro capture.
4. Runtime dispose (restores terminal), which disposes the root.
5. Engine unbinds: extension UI, clipboard writer, settings owners, interaction host.

Events arriving after step 1 are dropped by the listener guard rather than by ordering luck.

### Bounded quit

`shutdown()` races the `quit` workflow against the existing `boundedCleanup` deadline already used for `unbindExtensionUi` (`:1820`); on timeout it proceeds to `dispose()` and records a diagnostic.

### Idempotent dispose

`#disposePromise` is never cleared; `dispose()` returns it when present. `#settleStoppedLifecycle` schedules `dispose()` with `queueMicrotask` so the listener returns before teardown begins.

## Risks / Trade-offs

- Reordering teardown can change which diagnostics are captured when the engine fails during quit; tests pin the new order.
- The bounded quit may cut a slow but healthy session save; the deadline reuses the existing cleanup bound so the risk is already accepted elsewhere.

## Planned Evidence

New cases in `test/app/session-shell/session-shell-lifecycle.test.ts`: constructor failure releases bindings; events after dispose start are ignored; hung quit still restores the terminal within the bound; double dispose awaits once. Existing lifecycle, viewport, and reference-screen suites unchanged.
