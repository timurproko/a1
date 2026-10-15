# Tasks

Keep terminal input flowing to resident tabs while tab lifecycle work is slow or blocked (see `design.md`).

## 1. Server lifecycle worker

- [ ] 1.1 Move `attach.start`, `tab.create`, `tab.close`, `tab.restart`, `tab.rename`, and `tab.reorder` handling in `serve_attach` to a per-connection lifecycle worker behind a bounded channel per Decision 1; a full channel answers `busy` at once.
- [ ] 1.2 Report lifecycle handler errors with reply frames instead of closing the connection.

## 2. Bounded start slots

- [ ] 2.1 Give `acquire_start_permit` a 60 s deadline with the typed `tab-start-busy` failure surfaced as `tab.create-failed`.
- [ ] 2.2 Count interactive start waiters and make `acquire_start_gate` yield free slots to them per Decision 2.

## 3. Attach client input rules

- [ ] 3.1 Replace the shared `failed` flag with per-tab `failed_tab`.
- [ ] 3.2 Cancel tab prompts on view change or tab removal, redraw the active prompt notice after repaints and swallowed keys, and show tab-create failures.
- [ ] 3.3 Unit-test the failure scope, prompt cancellation, and notice redraw.

## 4. Liveness diagnostics

- [ ] 4.1 Track per-client lifecycle backlog, expose `starts` and `lifecycle` in host status, and log `attach-lifecycle-slow`.
- [ ] 4.2 Print `starts` and `lifecycle` in `a1 tabs status`, with `(stalled)` past 10 s, and cover it in the tabs CLI test.

## 5. Evidence

- [ ] 5.1 Add `A1_TABS_FAULT_DELAY_TAB_START_MS` and role-integration tests for input during a blocked start and for the start deadline.
- [ ] 5.2 Record focused local tests, a green `npm run preflight`, and the terminal-host CI lanes in `implementation-evidence.md`.
