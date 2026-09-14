## 1. Establish implementation and regression evidence

- [ ] 1.1 After this planning PR merges and implementation is explicitly requested, create a fresh detached worktree from current `origin/develop` and a separate code PR citing this change; verify the base, accepted specification, and absence of unrelated changes.
- [x] 1.2 Preserve run `34825707734` and its three failing test names in implementation evidence, distinguishing confirmed causes from hypotheses; verify the implementation report links the source SHA, package version, and failed jobs.

## 2. Correct platform-specific shortcut expectations

- [ ] 2.1 Replace the hardcoded `alt+m` help expectation with independent Darwin `option+m` and Windows/Linux `alt+m` expectations while retaining logical binding, live refresh, `/model` fallback, thinking, and pinned-profile assertions; verify `prompt-input-ux.test.ts` passes in the native matrix without runtime presentation changes.

## 3. Make certification lease release contention-safe

- [x] 3.1 Add deterministic fault-injection coverage for transient release rename and private-directory removal failures, persistent contention, non-retryable errors, and combined publication/release failures; verify assertions fail against the unguarded release and require the shared one-second deadline without real-time sleeps.
- [x] 3.2 Implement narrow bounded release retries with explicit ownership/generation validation, one-time atomic retirement, private-path-only cleanup, and preserved primary/cleanup diagnostics; verify the fault-injection cases pass and acquisition timing, lease format, and canonical publication semantics are unchanged.
- [x] 3.3 Cover missing/replaced owners, linked or malformed ownership paths, a successor acquiring during private cleanup, and delayed abandoned-generation reclamation; verify no successor lease or unrelated path is renamed or removed.
- [x] 3.4 Retain and repeatedly exercise independent-process abandoned-lease recovery with evidence/metadata preservation checks; verify all publishers complete successfully after transient contention, the canonical winner remains read-only and unchanged on reuse, and legacy restart seals remain valid without payload-wide rereads.

## 4. Diagnose and stabilize repeated frame capture

- [x] 4.1 Retain structured captures and add bounded first-divergence diagnostics including repetition, ambient mode, stage, and escaped byte/field context; verify an intentionally changed frame yields useful failing output rather than only a hash-count assertion.
- [x] 4.2 Reproduce and trace frame variation under normal and controlled delayed execution; deliver a before-fix divergent capture and identified producer input/boundary. Keep this task incomplete if only the original two-hash summary is available.
- [x] 4.3 Control the demonstrated nondeterministic input at the fixture boundary using existing scheduler/input seams, with scoped setup, disposal, and restoration; verify at least 12 repetitions across each opposing ambient mode produce one hash under normal and delayed execution. Pause for a planning revision if a production rendering behavior change is required.
- [x] 4.4 Add failure-path restoration and negative semantic-ANSI/cursor-control mutation coverage; verify resources do not leak, meaningful mutations still fail, and all original state/frame stages and independent parity checks remain intact.
- [x] 4.5 Verify the fixture generator remains byte-idempotent under opposing ambient capabilities and retains existing rendered baseline bytes; record the comparison and do not commit regenerated baselines to conceal a difference.

## 5. Validate and hand off the repaired nightly

- [ ] 5.1 Run strict OpenSpec validation and obtain passing required implementation CI with all changed regressions selected; record focused repeated native evidence for macOS Node 24, Linux Node 24, and Windows Node 22/24 with Defender retained and without skips, semantic retries, or timeout inflation.
- [ ] 5.2 Provide the exact implementation worktree/commit and focused manual verification commands, document any remaining gaps, and record maintainer acceptance and explicit manual merge authorization; verify code-PR auto-merge remains disabled.
- [ ] 5.3 After accepted code merges, require full nightly-equivalent exact-package validation of the newly numbered merged implementation on all four lanes; record source, version, digest, run URL, lane outcomes, and successful aggregate outcome without modifying or republishing `.368`.
- [ ] 5.4 Record acceptance and completed evidence in a specification-only archival follow-up; verify strict validation, unambiguous delta synchronization, and merged PR states before worktree cleanup.
