# Implementation evidence

## Authorization and source

The maintainer approved this plan and explicitly requested implementation: “approved implement”. Work continues in the same detached worktree and PR #402, from planning head `5033f2f804f470dd683073b95d24b6ce9cf69cb1`, base `586c48f8cda30ad89358a16160528746b4446253`. Both #398 and #390 are already in the base. The worktree was clean; version-2 linkage and disabled auto-merge were verified. Approval to implement is not final acceptance, publication, or merge authorization. The approved ready-before-CI sequence applies; no duplicate ordinary draft dispatch is planned.

## Original failure ledger

Full regression [34871471606](https://github.com/timurproko/a1/actions/runs/34871471606), source `5079baf8b5469ec05e3f81de28e776802c3ae9c6`, completed with failure:

| Lane | Job | Outcome |
| --- | --- | --- |
| Linux Node 24 | 104068253136 | Passed |
| macOS Node 24 | 104068253152 | Failed command-outcome trust path parity; corrected separately by merged #390 |
| Windows Node 22 | 104068253198 | Passed; final result verified at implementation start |
| Windows Node 24 | 104068253297 | Failed `vitest-full-without-isolated`: unhandled `[vitest-worker]: Timeout calling "onTaskUpdate"` |

Windows Node 24 reported 284 test files/3053 tests passed, with existing 3-file/10-test skips and one unhandled error. The predecessor suite took 524703 ms; its test took 367232 ms. The log did not identify the originating RPC worker. Synchronous npm waits in the predecessor fixture demonstrably block its event loop; their attribution to the historical timeout remains unproven until further evidence. Passing frame-accounting/observation tests neither prove nor disprove that attribution.

## Implemented correction and focused verification

The extracted synchronous runner failed the deterministic TCP parent/child handshake: the child could not receive a parent response while the worker waited synchronously. The asynchronous runner passes the same test. The watchdog contains failure only; success requires the actual response. Logs: `.artifacts/handshake-before.log` and `.artifacts/handshake-after.log`.

All predecessor subprocess waits now use the asynchronous helper, including registry listing, npm installation, and checked shipped proxy synchronization. The fixture retains publication-time ordering, default three-predecessor and override semantics, exact candidate selection, supported-entry checks, minimum exercised assertion, original npm sanitation and private prefixes, and predecessor-owned materialization/warmup. Existing setup/test/teardown/warmup limits remain 900000/1800000/120000/120000 ms.

The runner waits for closed output, caps combined captured bytes at 1 MiB, rejects failures with bounded metadata, and connects cancellation to fixture teardown. Cleanup refuses retired root PIDs or unverified termination and retains unsafe prefixes; no process-name cleanup is used. The positive native tree test preserves an unrelated process. Fault-injection tests disable both native termination routes before creating synthetic PIDs and verify primary-error preservation, refusal of retired ownership, and no success before output closure.

Final focused validation: **39 tests passed on each of Windows Node 24.16.0 and Node 22.23.2** across six files. Coverage includes handshake responsiveness, split UTF-8 and stderr draining, exact output limit and combined overflow, spawn/nonzero/signal/cancellation failures, argument/cwd boundaries, npm sanitation, actual owned tree shutdown, cleanup ordering/failures, shared phase expiry, registry object/array formats and malformed evidence, failed synchronization, phase timing, and retained transcript lifetime scenarios. Logs: `.artifacts/focused-final-node24.log`, `.artifacts/focused-final-node22.log`.

### Approved copy-test refinement

Initial typecheck exposed an unchanged merged integration mismatch: #388 (`a30dff6b`) still consumed `.copyText`, whereas #385 (`061b5f64`) exposed `copySelection`. Proxy synchronization did not fix it, and generated `bin/pi-tui.d.ts` changes were restored. After the narrow adaptation was proposed, the maintainer requested continuation; proposal, design, delta, and task 3.4 were reconciled before editing the test. It now serializes the current snapshot with the existing `selectionCopyRowText` contract, requires the snapshot, and preserves the exact independent `COPY_CURRENT` expectation and all lifecycle cases. Production clipboard code is unchanged. Focused tests and repository typecheck pass.

## Actual published-predecessor validation

The declared `update-predecessor` scope passed on Windows Node 24.16.0 with npm 11.6.2, consuming the already built and prepared exact package. This was one focused scope, not a local repository-wide suite. The successful scope took **109006 ms**, including one passing compatibility test (suite 107461 ms, test 86678 ms). Build/pack steps were explicitly satisfied by the existing build and exact package, not dropped. Logs/results: `.artifacts/predecessor-local-clean.log`, `.artifacts/predecessor-local-clean.json`.

The candidate was built from this pre-commit implementation worktree at planning head `5033f2f804f470dd683073b95d24b6ce9cf69cb1`, based on merged source `586c48f8cda30ad89358a16160528746b4446253`; no production source changed. It is an unnumbered local candidate, **not** nightly publication evidence:

- Version: `0.1.8-dev`; size: `1608949` bytes.
- SHA-256: `b1455b4375fc87411ebdaf36afecd99d4467eb34d948ccc5d8249cb146e60e3b`.
- npm shasum: `d355b4ff2d3c1506079e59a66f865ba75299fb6a`.
- Integrity: `sha512-6gypiwu0qYoyW8Wt1aCAWz0wcggVTmOlP4d/1iGxVDJKBh37nTMGZoJUII8eIVSiyzf2dNy6LLl/QtrbfxhI6w==`.

All three real published predecessors installed and successfully materialized/warmed those same candidate bytes using their own release entry:

| Published version | Install ms | Proxy sync ms | Materialize ms | Warm ms |
| --- | ---: | ---: | ---: | ---: |
| `0.1.8-dev.368` | 6785 | 95 | 41292 | 2433 |
| `0.1.8-dev.335` | 6977 | 220 | 6474 | 2603 |
| `0.1.8-dev.332` | 7078 | 228 | 6450 | 2604 |

Candidate install/sync took 9603/196 ms; registry lookup took 1641 ms. Every command and measured predecessor phase completed successfully; teardown passed.

### Local invocation failures retained

- Local npm **12.0.2** returned an object for `npm pack --json`; the existing preparation script expects an array. Build had succeeded, but preparation failed before compatibility validation. No packaging code or dependency was changed. Selecting npm **11.6.2** for local execution produced the exact package successfully (`.artifacts/package-npm11.log`).
- The first npm-11 tier launch inherited `npm exec --call` configuration, causing its nested `npx` to fail with `EUSAGE` before Vitest started (`.artifacts/predecessor-local.log`). An ignored local invocation adapter removed inherited `npm_config_*` keys before running the unchanged tier command; the corrected invocation produced the successful result above. This is an identified launcher correction, not a retry of a failing compatibility assertion or a repository workflow change.

## Pre-push validation

Build (including native guardian), repository typecheck, architecture/product identity/source-ledger/terminal-host provenance, strict OpenSpec validation, documentation governance, and whitespace checks passed. Full tracked-file code-documentation review passed after correcting the new comments to use its required policy labels. Current-head remote CI remains pending at this pre-push checkpoint. No dependency, workflow, suite-ownership, retry, timeout, baseline, source-ledger, production source, or stable-work-budget change is included.

## Completion boundaries

No all-lane candidate success, actual maintainer validation, merge, numbered-package nightly success, or archival is claimed. The real scheduled nightly over newer merged bytes remains a separate required completion gate, not replaceable by branch CI or a manual development-publication no-op.
