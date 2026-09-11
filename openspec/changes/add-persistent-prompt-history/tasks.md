## 1. Contract and ownership

- [ ] 1.1 Add the neutral typed submission, snapshot, and bounded-status history port to owned-UI contracts; verify contract tests reject unclassified payloads and invalid required fields without exposing input content.
- [ ] 1.2 Register the focused prompt-history feature owner, public entry, worker/store files, and mirrored test root in the architecture policy; verify the dependency/ownership gate accepts composition wiring and rejects private cross-owner imports or control-store coupling.
- [ ] 1.3 Implement the stable profile key and history path policy from the resolved data root and effective profile root; verify Windows normalization, Unix paths, `A1_DATA_DIR`, overridden profile isolation, release/cwd independence, and no default-root fallback with hermetic path tests.

## 2. Durable store and bounded background work

- [ ] 2.1 Implement schema identity/version checks and transactional first creation for the independent SQLite store with restrictive directory/file/sidecar access; verify real-filesystem tests cover missing stores, concurrent first open, wrong-profile identity, supported schema, and preserve-newer-schema rejection.
- [ ] 2.2 Implement exact-text deduplication, committed recency sequencing, atomic upsert/pruning, and shared active retention metadata; verify A-B-A ordering, clock skew, equal timestamps, Unicode, distinct internal whitespace, and configuration changes with store tests.
- [ ] 2.3 Enforce the 1 MiB entry, 8 MiB retained-text, and 10-100-entry budgets without truncating reusable input; verify boundary/overflow tests and oldest-first pruning when byte retention dominates count.
- [ ] 2.4 Add the SQLite worker/service with at most 32 queued/in-flight candidates and 8 MiB queued text, bounded contention retries, and no automatic replay of uncertain commits; verify queue saturation, worker death, definitely-uncommitted retry, and ambiguous-result tests preserve local recall and avoid duplicate submissions.
- [ ] 2.5 Add short materialized reads, coalesced refresh, bounded checkpoint/storage maintenance, and sanitized failure episodes; verify one in-flight read, polling rate, database/WAL threshold behavior, and sentinel private text absent from all diagnostics.
- [ ] 2.6 Add real multi-process integration coverage for simultaneous writers, concurrent retention changes, reader snapshots, process termination during update/initialization, and post-crash reopen; verify only complete committed states are visible and retention invariants hold on supported Windows/Unix CI jobs.

## 3. Settings and runtime lifecycle

- [ ] 3.1 Declare the History section, `promptHistoryEnabled` and `promptHistoryMaxItems` defaults/choices/labels, and next-start metadata in the existing A1 settings system; verify declaration, invalid-value, stored/effective-state, persistence, and shared-control presentation tests.
- [ ] 3.2 Wire the history port through composition only for enabled bare A1, using the actual launch-resolved data/profile roots; verify disabled and `a1 pi` launches never initialize the store/worker or touch history files and that settings remain profile-local.
- [ ] 3.3 Initialize history after the interactive readiness path without delaying terminal input and synchronize the next-start retention setting once per new enabled store initialization; verify delayed-worker startup tests, newest-applied store limit across existing writers, and no stale-limit reassertion.
- [ ] 3.4 Implement generation-aware disposal, bounded two-second shutdown drain, and cancellation of timers/listeners/pending reads; verify clean-exit persistence, stalled-close timeout, new-session/profile replacement, and no stale callback or leaked worker after disposal.
- [ ] 3.5 Route corruption, permission, disk-capacity, unsupported-schema, and worker-start failures through the existing bounded failure presentation with current-session fallback; verify prompts still dispatch, stored files remain intact, and no repeated per-prompt warnings appear.

## 4. Capture reusable user submissions

- [ ] 4.1 Add semantic recall serialization in the Pi input/chip adapter before template/extension expansion, expanding text pastes and omitting semantic image chips without regex removal of user text; verify multiline/Unicode text, literal placeholder strings, template invocations, image-only input, and image-plus-text fixtures.
- [ ] 4.2 Introduce one submission identity and durable capture point for ordinary, steering, follow-up, compaction-queued, bash, and eligible slash inputs; verify route-table tests cover each eligible path and preserve its existing dispatch behavior.
- [ ] 4.3 Keep workflow/owned-app commands, automated extension input, unsubmitted suggestions, replay/resume/fork seeding, retry, and queue drain outside durable capture; verify negative route tests and that recovery cannot advance recency twice.
- [ ] 4.4 Preserve prompt recall eligibility after dispatch rejection, interruption, or uncertain delivery while retaining local-only recovery for preparation failures; verify failure-injection tests distinguish these stages without automatic provider retries.
- [ ] 4.5 Add restart integration coverage using real stored text and fresh editor/paste state; verify recalled text is reusable without old chip IDs, session files, image caches, or copied transformed prompts.

## 5. v2 recall controller and semantic presentation

- [ ] 5.1 Add a focused history controller and typed editor operations for snapshot attachment, provisional local submissions, durable acknowledgment, and transcript fallback merging; verify deduplication/count bounds and both load-before-construction and construction-before-load races.
- [ ] 5.2 Implement v2 Up-to-end/Down-to-start placement, bounded navigation, and draft restoration while retaining existing multiline/autocomplete/keybinding/selection/undo rules; verify independently authored fixtures traced to the v2 cursor tests rather than implementation-generated expectations.
- [ ] 5.3 Freeze entries, total, and draft during browsing and coalesce other-session refreshes for non-browsing boundaries; verify interleaved commit/load/key sequences do not skip entries, move the selection, or overwrite typed/restored drafts.
- [ ] 5.4 Add semantic top-border history presentation with newest `total/total`, oldest `1/total`, applicable overflow information, and no extra dock rows; verify independent v2-derived fixtures for one/many entries, narrow widths, multiline scrolling, themes, and A1's prompt prefix.
- [ ] 5.5 Preserve fresh-editor reseeding and explicitly submitted recalled/suggested input semantics; verify editor replacement, stale generations, suggestion invalidation, and no execution merely from recalling text.
- [ ] 5.6 Declare the exact bare-A1 history replacement in customization/parity metadata without changing installed Pi or relying on private reflection/rendered-string substitution; verify unchanged `a1 pi` current-session history and all unrelated editor/viewport behavior through the independent comparison path.

## 6. Data policy, validation, and acceptance

- [ ] 6.1 Document the typed prompt-retention classification, plaintext sensitivity, AppData/XDG and override locations, profile-key policy, byte/count bounds, next-start controls, and stopped-instance removal procedure; verify maintained feature/architecture documentation describes no cache eviction or implicit legacy import.
- [ ] 6.2 Add isolation/governance regression coverage proving history is absent from control metadata, logs, fatal diagnostics, release payloads, and cache/dependency/release cleanup targets; verify tests operate only on temporary data/profile roots and synthetic prompts, never personal histories.
- [ ] 6.3 Integrate focused history tests and impacted architecture, settings, input-response, and comparison coverage into CI; verify the required checks pass on supported Node/OS jobs, including worker startup from the built/packaged runtime, without adding a synchronous cold-start import or I/O dependency.
- [ ] 6.4 Prepare the exact build-first checkout commands and manual acceptance matrix for restart/new-session recall, two concurrent processes, v2 caret/counter/draft behavior, pasted text, settings restart, isolated profile/data root, and unchanged `a1 pi`; verify the delivered handoff identifies its worktree/commit, commands, expected behavior, and hard-kill/image/import limitations.
- [ ] 6.5 Record explicit user acceptance and CI evidence only after implementation is manually accepted; verify the acceptance record covers the complete matrix before proposing specification synchronization/archive in a separate follow-up.
