# Acceptance: add-persistent-prompt-history

## Verdict and scope

**Accepted by the maintainer on 2026-09-11, with an explicit testing waiver.** The maintainer reported "i have tested it", then confirmed "accepted we can close it" when asked whether persistent prompt history was accepted as complete.

Archive preflight distinguished the remaining automated evidence from an actual coverage gap in task 2.6: simultaneous writers and crash recovery are tested, but retention-limit changes and reader snapshots are exercised after the concurrent child writers finish, not while those writers remain active. Asked explicitly whether to archive as accepted with that remaining test coverage waived and documented, the maintainer answered **"yes archive it"**.

This is acceptance of the delivered history feature and authorization to synchronize its three delta specs and archive it. It is not a claim that the waived cases were executed or passed. The behavioral requirements remain unchanged. No code, tests, or validation thresholds are changed by this disposition, and no other active OpenSpec change is accepted by it.

The maintainer did not identify whether their manual run used the implementation worktree or published preview, nor provide a terminal version, geometry, or separate verdict for each checklist case. This record preserves that limitation instead of assigning an unreported exact artifact or inventing physical measurements. Acceptance is recorded after implementation merge and publication; it does not invent earlier merge authorization.

## Implementation identity

- Original specification: [PR #295](https://github.com/timurproko/a1/pull/295).
- Source-traced editor refinement: [PR #297](https://github.com/timurproko/a1/pull/297).
- Implementation: [PR #299](https://github.com/timurproko/a1/pull/299), confirmed `MERGED` on 2026-09-11.
- Final implementation head: `0f7722793aa1c2cfbdb799a3837eb18486975da6`.
- Merge commit: `2d26863f4975bd9c25988bc96b1c55ee032dbf34`.
- Published candidate associated with that merge: `@timurproko/a1@0.1.8-dev.299`.

The PR records implementation of the isolated SQLite store/worker, typed capture and history ports, source-traced editor adaptation, v2 navigation and border presentation, next-start settings, failure isolation, and documentation. Its final feedback correction renders the history label in the neutral dim theme role independently of thinking/bash rule colors.

## Verified automated evidence

Final-head [Development validation run 34602902445](https://github.com/timurproko/a1/actions/runs/34602902445) passed the required aggregate check, fast validation, changed-file documentation, rendering validation, both Windows startup lanes, and Linux/macOS containment.

The job logs were inspected for actual history test results, not inferred from green job names. Each lane below passed the same four files: `store.test.ts` (9 tests), `concurrency.integration.test.ts` (3), `service.test.ts` (4), and `worker-package.test.ts` (1), all under `test/features/prompt-history/`.

| Platform/Node lane | History result | CI job |
| --- | --- | --- |
| Windows Node 22 | 17 passed | [103274382334](https://github.com/timurproko/a1/actions/runs/34602902445/job/103274382334) |
| Windows Node 24 | 17 passed | [103274382254](https://github.com/timurproko/a1/actions/runs/34602902445/job/103274382254) |
| Linux Node 24 | 17 passed | [103274382187](https://github.com/timurproko/a1/actions/runs/34602902445/job/103274382187) |
| macOS Node 24 | 17 passed | [103274382165](https://github.com/timurproko/a1/actions/runs/34602902445/job/103274382165) |

The emitted-worker fixture starts the built persistence service from an isolated directory without Pi, tsx, or any `node_modules`, commits synthetic input through its worker, and checks clean completion. The Windows startup gates provide the corresponding input-ready regression evidence. Task 6.3 is closed on this verified final-head evidence.

Earlier PR runs are not converted into first-attempt success: the PR comments retain five initial fast-validation failures and the later resource-sensitive SQLite timeout. The final implementation corrected inventory/settings fixtures and moved the heavy store suite into the existing sequential partition without increasing the five-second per-test timeout. The final-head run above is the passing gate.

[Release run 34616461861](https://github.com/timurproko/a1/actions/runs/34616461861), attempt 1, validated the exact preview from merge `2d26863f4975bd9c25988bc96b1c55ee032dbf34` on Windows Node 22/24, Linux Node 24, and macOS Node 24. Its publisher, registry-byte verification step, and publication aggregate succeeded. The registry lookup during this review reported `next=0.1.8-dev.299` and `latest=0.1.7`. These publication results are separate from the explicitly inspected history tests above; this record does not claim that the selective release jobs reran every history test or that registry bytes were independently downloaded and hashed during archival.

## Task 2.6: completed evidence and deliberate partial skip

Implemented and verified:

- Three independent child writers concurrently open one store for the first time and commit 60 unique synthetic prompts; the parent verifies the resulting snapshot.
- After those children exit, the test changes retention to ten through a second connection, writes through the earlier connection, and checks the retained count and newest entry.
- Separate child-process cases terminate an uncommitted write and uncommitted schema initialization, then reopen through the production store and verify the previous committed state or a clean initial state.
- Store tests additionally exercise committed recency across connections, stale-writer retention policy, byte/count bounds, corruption/schema preservation, and worker failure/shutdown behavior.

**Deliberately skipped with the maintainer's explicit approval:** additional real multi-process cases that change retention limits and inspect reader snapshots while concurrent child writers are still active. Existing sequential post-writer checks do not prove those interleavings. The waiver accepts this test-coverage limitation for closure; it neither removes the atomicity/retention requirements nor reports the absent tests as passing.

Task 2.6 is checked only as a resolved disposition combining verified existing coverage and this named partial skip. Of 35 task entries, 34 are completed and one has this accepted partial-testing waiver; none remains an active implementation instruction.

## Manual acceptance matrix and evidence boundary

The implementation handoff and `docs/features/prompt-history.md` supplied the following complete matrix. The maintainer's accepted verdict is feature-level; no separate physical pass is fabricated for an individual row.

| Delivered review area | Recorded evidence/disposition |
| --- | --- |
| New-session/restart recall and unique recency | Accepted feature-level verdict; store/service restart and deduplication coverage passed. |
| v2 caret, counter, multiline draft, paste backing, and undo behavior | Accepted feature-level verdict; implementation records independent editor/controller fixtures and the neutral-label feedback correction. |
| Two instances, refresh, and stable active browsing | Accepted feature-level verdict; concurrent-writer and controller coverage are recorded, with the additional storage interleavings explicitly waived above. |
| Pasted text reuse and image-token omission | Included in the accepted delivery and submission/editor fixtures; no image reattachment is promised. |
| History settings, next-start application, retention, and opt-out | Included in the accepted delivery and settings/store integration evidence. |
| Isolated data/profile roots and unchanged `a1 pi` | Included in the accepted delivery and path/composition/comparison evidence; no separately observed physical comparison is asserted. |

Known limits remain: history is unencrypted potentially sensitive text; a hard kill before asynchronous commit can lose queued entries; image reattachment and implicit legacy import are not implemented. This archive does not expand durability, privacy, platform-certification, or comparison claims.

## Synchronization and archive disposition

Synchronize all three unchanged delta specifications:

- Create `openspec/specs/persistent-prompt-history/spec.md` with its supplied Purpose and nine requirements.
- Add the two declared history-editor replacement/boundary requirements to `owned-pi-ui-foundation`.
- Add the history persistence/retention settings requirement to `owned-ui-settings`.

Every pre-existing main-spec requirement and scenario is preserved. The proposal, design, metadata, and all delta specs remain byte-for-byte unchanged as historical planning artifacts. The change is archived under `openspec/changes/archive/2026-09-11-add-persistent-prompt-history/` after synchronization verification and strict validation. The acceptance/archive worktree remains until its PR merges; another session's implementation worktree is not modified or removed by this stream.

## Archive verification

- Every added requirement and scenario in all three deltas exactly matches its main-spec counterpart. Existing main-spec text is unchanged; the new capability uses the delta's Purpose verbatim and one ordinary Requirements section.
- Byte comparison against implementation merge `2d26863f4975bd9c25988bc96b1c55ee032dbf34` confirms unchanged metadata, proposal, design, and delta specs. Only task dispositions and this acceptance record change during archival.
- All 35 checklist entries are resolved, retaining the explicit partial-testing waiver rather than claiming 35 fully tested tasks.
- Before the move, strict main-spec validation passed all 23 capabilities and strict validation of this change passed. After the move, `openspec validate --all --strict --no-interactive` passed all 45 active-change/main-spec items.
- The active change directory is absent and the archived metadata, artifacts, acceptance, and tasks are present. The PR contains only OpenSpec paths; no product code, tests, workflows, dependencies, generated baselines, or non-OpenSpec documentation is changed.
- No local fast/full/release suite or interactive UI was run for this archival work. The archive PR's own required CI and merge state are reported separately; these local checks do not claim that integration or worktree cleanup has already happened.
