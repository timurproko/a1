# Implementation evidence

## Authorization and base

The maintainer reviewed the planning-only draft PR #407 and then separately requested `apply`. Implementation resumed in the same clean detached worktree and draft PR at planning head `63beb15e41ae3de0bb5f970c6d076bdb64223baa`. PR #407 is open and draft, has the expected version-2 link, and auto-merge is disabled. Its base contains #405 merge `2d992336c48790fb2f793883816905c9db2ec5e7`.

## Retained predecessor evidence

#405 source `2d0dd1503edda48f8ad18075256c45b0fb59e177` passed ordinary CI `34940561264` and was manually merged without a final acceptance record or successful Full regression. Full regression `34940561468` passed Linux Node 24 (`104288161266`), macOS Node 24 (`104288161283`), and Windows Node 24 (`104288161306`). Windows Node 22 (`104288161345`) failed four `session-shell.test.ts` cases after 3291 tests passed. The original two shell owners passed in 657/453 ms, and the release owner passed in 6381 ms under its unchanged 20000 ms limit.

The new failures retained generic provisional paste markers or pending image state across existing assertions in cases outside #405's two-case emitted-entry selection. The marker is allocated before payload classification, so it is not evidence of host clipboard image acquisition or text misclassification. #405's prior measured source-loader versus emitted-entry path and the exact failing locations support remaining test-only TypeScript startup overhead; no production defect is established.

## Immutable fixture implementation

The session-shell integration file now uses hoisted file-owned wrappers throughout its lifetime. Calls to the real paste executor receive `emittedPasteHelper` only when the caller did not provide an explicit helper; every call still delegates to the production executor, which forks a new process. Worker construction always applies the existing exact-bootstrap selector, which redirects only the TypeScript image-worker bootstrap with `eval: true`; non-matching entries and option objects are returned unchanged. The real worker constructor still creates a fresh worker.

The module-level `coldClipboardTrace` selection toggle and per-test paste-executor spy/restore lifecycle were removed. `observedPasteFixture` retains bounded paste diagnostics, failure reporting, and one-time failure-safe disposal, but diagnostics no longer decide which entry executes. Production source and every existing shell assertion/deadline are unchanged.

Selector coverage now proves the emitted paste default, explicit-helper identity, exact worker entry/`eval` change, mismatched and unrelated entry/option identity, and real source/emitted valid/malformed canonicalization outcomes. Dedicated source acquisition, emitted helper, executor and lifecycle files remain independent.

## Local validation

Build and native guardian plus repository typecheck passed before emitted-entry tests. The complete 283-test session-shell file, five selector/source-emitted tests and six bounded-trace tests passed together: 293 tests on Windows Node 24.16.0 in 83.90 seconds and 293 tests on a direct `node-win-x64` Node 22.23.2 binary in 85.08 seconds. This containing-file run includes all four prior Windows Node 22 failures and both original #405 shell owners under their unchanged assertions and deadlines.

The independent 10 source acquisition, 5 executor-lifecycle, 6 emitted clipboard and 24 paste-executor tests passed together: 45 tests on each Node runtime. Across seven unique files, 338 focused tests passed per runtime. Logs: `.artifacts/follow-up-shell-node24.log`, `.artifacts/follow-up-shell-node22.log`, `.artifacts/follow-up-source-node24.log`, `.artifacts/follow-up-source-node22.log`.

Build/native guardian, typecheck, full tracked-file code-documentation, architecture/product identity/source-ledger/terminal-host provenance, documentation governance, strict validation of this change and #405, and whitespace checks passed. Git status confirms no production source, dependency/lockfile, workflow, suite/pool classification, timeout, retry, sleep, workload, assertion, baseline, budget, or executor-capacity change.

No local full-repository suite or physical desktop automation was run. Local success is not native Full recovery. Exact-head PR CI/Full evidence, maintainer review, scheduled nightly, #405 disposition and archive evidence remain pending below and must not be inferred from this record.
