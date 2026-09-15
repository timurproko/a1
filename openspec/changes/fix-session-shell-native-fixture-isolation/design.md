## Context

See proposal.md for motivation and `specs/isolated-regression-testing/spec.md` for the fixture contract. #405's exact-head Full regression `34940561468` is the retained red attempt. Linux Node 24, macOS Node 24, and Windows Node 24 passed; Windows Node 22 failed four of 3305 tests, all in `session-shell.test.ts`, after 3291 passed.

The original #405 shell owners passed in that lane in 657 ms and 453 ms, and the release scenario passed in 6381 ms under its unchanged 20000 ms limit. The four new failures occur earlier in the same file, outside #405's per-test emitted-entry selection. Three retained `hasPendingPastes(...) === false`/submission assertions observed unfinished image preparation, while the large-text case still displayed its generic provisional `[📷 screenshot-*]` marker instead of the expected text chip. That marker is allocated before payload classification; it does not prove that text was misclassified as a host image. Together with #405's measured 558 ms source-loader versus 139 ms emitted-entry path, the evidence supports remaining test-loader latency, not a production clipboard result defect.

The merged file currently uses module-level mutable state to enable exact image-worker redirection and a per-test spy to supply the emitted paste helper only for two cases. Even though the new failures occur before that selection is enabled, mutable selection is inconsistent with fixture isolation and makes the integration file harder to reason about.

## Goals / Non-Goals

**Goals:** Make emitted-entry selection immutable and file-owned; cover every session-shell paste scenario with the same real cold built entries; preserve exact production protocols, process/worker lifetimes, fixture inputs, options, payloads, assertions, deadlines and failure-safe cleanup; retain independent source coverage; obtain one successful exact-head native matrix before review.

**Non-Goals:** Change production paste/image behavior, add a production injection hook, shorten work by mocking final results, prewarm or share children, change executor capacity, serialize or reclassify the suite, increase a polling/test/stop deadline, retry failures, alter a workload/assertion, or claim #405 acceptance retroactively.

## Decisions

### 1. Select cold emitted entries immutably for the complete integration file

Use hoisted file-scoped test module wrappers. The paste-executor wrapper delegates every call to the real implementation and supplies `emittedPasteHelper` only when the caller did not provide a helper. An explicit helper remains authoritative. The worker wrapper applies `coldClipboardWorker` on every construction; that selector redirects only the exact source image-worker bootstrap with `eval: true` and otherwise returns the original entry and options object.

This removes the module-level enable flag and per-test spy/restore lifecycle. It does not make operations warm: the real executor still forks a fresh emitted helper for every paste and the real image preparation client still starts a fresh emitted worker for every canonicalization/preparation request. The parent clients, IPC, chunking, conversion queue, codec, cancellation and cleanup remain production code.

**Rejected:** Extending the mutable toggle to four more tests retains shared test state and can miss future cases. A production dependency-injection option expands product surface for a test-only concern. Raising `vi.waitFor` or test deadlines weakens the existing gate. Prestarting workers changes the cold boundary.

### 2. Keep source/emitted authority independent

Retain source-helper execution in the dedicated paste executor, acquisition and lifecycle fixture tests. Retain real source/emitted image-worker comparison in `cold-clipboard-entries.test.ts`, and extend selector tests to prove default emitted-helper selection, explicit-helper preservation, exact bootstrap matching and unrelated-worker identity. If additional comparison is needed, compare observable protocol outcomes rather than implementation strings or self-generated success values.

The build remains a precondition for integration tests using emitted entries. No emitted file is checked in or modified manually.

### 3. Preserve diagnostics without using them as selection state

`observedPasteFixture` continues to receive bounded phase/lifetime events through the existing shell diagnostic callback and owns failure-safe disposal. Remove worker-selection state and spy restoration from it. Diagnostic output remains metadata-only and cannot alter which helper runs. The four newly failed cases keep their original assertions; focused test selection is debugging evidence only.

### 4. Reconcile merged #405 evidence without fabricating completion

Record merge `2d992336c48790fb2f793883816905c9db2ec5e7`, ordinary CI `34940561264`, Full run `34940561468`, exact jobs and outcomes in #405 evidence. Its macOS identity, Linux source/emitted acquisition and ordinary CI tasks may be marked complete from native/current-head evidence. Its all-lane Full, maintainer acceptance, scheduled nightly and archive tasks remain incomplete. The follow-up does not create an acceptance record for #405.

### 5. Require current-head CI, Full regression, review, merge and nightly in order

Push planning first in one draft PR. After a later explicit apply request, implement in this same worktree/history/PR, then mark the completed candidate ready before normal CI. Dispatch Full regression separately exactly once for that candidate and retain all outcomes. A failed lane blocks acceptance and merge; do not rerun unchanged code.

After green CI, obtain actual maintainer validation, exact-head acceptance and explicit manual merge authorization. Then require a real scheduled `mode=nightly` run over a newer numbered package containing #402, #405 and this follow-up on all four lanes before combined recovery acceptance or archive reconciliation.

## Risks / Trade-offs

- [File-wide emitted routing accidentally captures unrelated workers] → Match only the exact image bootstrap and test unchanged identity/options for non-matches.
- [Built entries drift from source] → Build before execution and retain independent source/emitted semantic comparisons.
- [Faster entries conceal a production lifecycle defect] → Preserve real asynchronous children/workers, all pending/order/submission assertions and existing deadlines; require native Full regression rather than isolated success.
- [A later test explicitly needs a source helper] → Preserve explicit helper authority and dedicated source tests; do not add mutable global switching.
- [#405's premature merge is mistaken for acceptance] → Keep its failed run and missing acceptance explicit; require separate maintainer disposition after combined recovery.

## Migration Plan

No runtime or data migration. The change affects test fixtures and OpenSpec evidence only. Rollback restores source-loader use in the integration file but also restores the retained Windows Node 22 failure risk; it does not alter product bytes. Keep both #405 and follow-up worktrees until accepted archive integration and explicit reconciliation are verified.
