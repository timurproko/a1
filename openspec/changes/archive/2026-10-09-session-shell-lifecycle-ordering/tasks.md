## Authorization and sequencing

Planning-only until the maintainer approves and requests implementation. Fourth of eight preparatory changes for multi-agent tabs; start after `narrow-owned-ui-backend-port` merges to avoid conflicts in `session-shell.ts`, and reconcile `origin/develop` first.

## 1. Transactional construction

- [x] 1.1 Introduce a constructor release list in `OwnedUiSessionShell`; register the event subscription, the three settings owners, the workflow interaction host, the clipboard writer, and every other binding the constructor makes as they are bound.
- [x] 1.2 On constructor throw, run the list in reverse and rethrow. Composition is unchanged: a throwing constructor never yields an instance to dispose (see `design.md`).

## 2. Teardown order and bounds

- [x] 2.1 Move the backend unsubscribe to the first step of `#dispose`, set `#disposed` synchronously in `dispose()`, and guard the listener on `#disposed`.
- [x] 2.2 Bound the `quit` workflow's hold on the terminal in `shutdown()` with the existing cleanup deadline; on timeout dispose and still await the engine's outcome (see `design.md`).
- [x] 2.3 Keep the shared in-flight disposal promise; the teardown already starts on a microtask, so `#settleStoppedLifecycle` is unchanged (see `design.md`).
- [x] 2.4 Dispose the root's theme subscription and helper clients from the shell when construction fails before or after the runtime exists.
- [x] 2.5 Replace the workflow interaction host with a detached host on disposal and on construction failure.

## 3. Validation evidence

- [x] 3.1 Add the four lifecycle cases named in `design.md` to `test/app/session-shell/session-shell-lifecycle.test.ts`.
- [x] 3.2 Run the `test/app/session-shell` and `test/composition` owners and `npm run typecheck`; regenerate the startup graph baseline; record the teardown order in the acceptance list.
