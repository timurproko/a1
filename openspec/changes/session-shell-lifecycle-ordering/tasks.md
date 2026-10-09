## Authorization and sequencing

Planning-only until the maintainer approves and requests implementation. Fourth of eight preparatory changes for multi-agent tabs; start after `narrow-owned-ui-backend-port` merges to avoid conflicts in `session-shell.ts`, and reconcile `origin/develop` first.

## 1. Transactional construction

- [ ] 1.1 Introduce a constructor disposer list in `OwnedUiSessionShell`; register the event subscription, the three settings owners, the workflow interaction host, and the clipboard writer as they are bound.
- [ ] 1.2 On constructor throw, run the list in reverse and rethrow; in `src/composition/owned-ui.ts`, dispose a constructed shell before releasing diagnostics and the release-note claim.

## 2. Teardown order and bounds

- [ ] 2.1 Move the backend unsubscribe to the first step of `#dispose` and guard the listener on `#disposed`.
- [ ] 2.2 Bound the `quit` workflow wait in `shutdown()` with the existing cleanup deadline and record a diagnostic on timeout.
- [ ] 2.3 Keep `#disposePromise` after settle so repeated `dispose()` calls await the same promise; schedule the self-dispose in `#settleStoppedLifecycle` on a microtask.
- [ ] 2.4 Dispose the root's theme subscription and helper clients from the shell when the runtime was never constructed.

## 3. Validation evidence

- [ ] 3.1 Add the four lifecycle cases named in `design.md` to `test/app/session-shell/session-shell-lifecycle.test.ts`.
- [ ] 3.2 Run the `test/app/session-shell` and `test/composition` owners and `npm run typecheck`; record the teardown order in the acceptance list.
