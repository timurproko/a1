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

### Collect bindings in a release list during construction

The constructor body after the root's inputs are known runs inside one `try`. Each binding pushes its release onto a local `constructed: (() => void)[]` list as it is made: the response-copy coordinator and executor, the root, the stream coalescer, the prompt-suggestion controller and its subscription, the prompt-image and skills subscriptions, the three settings owners, the viewport pre-input listener, the viewport and background settings subscriptions, prompt history, the extension UI bridge, the workflow interaction host, the event subscription, and the clipboard writer. On throw the list runs in reverse, each release isolated, and the original error is rethrown.

The root's release covers the theme subscription and helper clients: before the runtime exists it calls `root.dispose()` directly; once the runtime exists it stops the idle runtime, which disposes the root synchronously.

A throwing constructor never hands composition an instance, so composition has nothing to dispose. Its `catch` in `composition/owned-ui.ts` is unchanged; the shell itself guarantees that nothing it bound outlives the throw.

### Teardown order

1. `dispose()` sets `#disposed` synchronously; the event listener drops every event except the stop, which still settles the shell.
2. `#dispose` unsubscribes from engine events before any other step.
3. Copy, waiting images, history close, pending pastes, pointer state, timers, suggestions, and presentation subscriptions, as before.
4. Engine unbinds: clipboard writer, the three settings owners, and the workflow interaction host, which is replaced with a detached host that holds no reference to the shell.
5. Outro, then runtime dispose (restores the terminal and disposes the root), then the bounded paste and extension-UI cleanups.

Engine unbinds stay before runtime dispose, not after it as first planned: the settings handlers write to the runtime, so unbinding them first keeps a late setting change from reaching a stopping runtime.

On the code at the start of this change, the old `#dispose` already unsubscribed before its first `await`, and the engine delivers each event on its own tick. Re-entry was therefore not reproducible; the listener guard makes the ordering explicit instead of incidental, and the new test pins it.

### Bounded quit

`shutdown()` races the `quit` workflow against the existing `boundedCleanup` deadline. `quit` is the engine's full disposal, including extension shutdown and the session save, so it is not abandoned: on timeout the shell disposes, which restores the terminal, and `shutdown()` still awaits the engine and returns its outcome. A quit that settles within the deadline behaves exactly as before, including a failed quit leaving the shell up.

No diagnostic is recorded on timeout: by then the terminal is restored and nothing presents it.

### Disposal sharing

`dispose()` keeps its existing contract: callers during a teardown share its promise and its failure, and a call after it settled resolves without a second teardown. Composition depends on that: the stop event's disposal swallows its failure, and `application.dispose()` then calls again and must not see a stale rejection. The plan's premise that a second call skipped waiting held only after settlement. The teardown already starts on a microtask, so `#settleStoppedLifecycle` needs no change.

## Risks / Trade-offs

- A quit slower than the cleanup deadline now restores the terminal before the engine finishes; the process still waits for the engine before the shell reports the outcome.
- Re-indenting the constructor body inside the `try` grows the eager startup graph by about 3 KB; the baseline is regenerated.

## Evidence

New cases in `test/app/session-shell/session-shell-lifecycle.test.ts`: construction failure after the last binding and before the runtime both release every settings owner, event listener, interaction host, and the root; events delivered after a listener requests disposal do not touch the view; a hung quit restores the terminal within the deadline and still returns the engine's outcome; concurrent disposal calls share one teardown and a later call does not tear down twice. The construction, hung-quit, and shared-disposal cases fail against the shell at the start of this change; the event case passes there and guards the ordering. Existing session-shell and composition suites pass unchanged.
