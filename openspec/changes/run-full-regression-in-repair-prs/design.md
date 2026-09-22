## Context

On 2026-09-22, #536's head `99f1cba4333678d240e03c77388df6ceea90e340` had Full regression run 35757525387 in the commit check-runs API, but its PR `statusCheckRollup` contained only Development validation and repository-policy workflows. Full regression currently supports `schedule` and `workflow_dispatch`; Development validation is PR-triggered but skips drafts and intentionally defers exhaustive integration owners. Dispatching another branch workflow is therefore not a reliable PR-visible handoff.

The maintainer approved this plan and explicitly requested implementation on 2026-09-22. Continue in PR #543 and branch `feature/pr-full-regression`. Implementation began from `origin/develop` at `7b80f6a30cf82ae654a668fc577734bdd33dcaa5`; merged #536 was reconciled at `d24718c1` without changing its repair.

## Goals and non-goals

- Give maintainers native per-lane regression checks inside the PR, not just an Actions link, comment, or synthetic green status.
- Require complete exact-head evidence for repair and publishing-impact PRs without expanding every ordinary PR's cadence.
- Preserve all retained non-physical owners, Windows Node 22/24, Linux Node 24, macOS Node 24, exact-package isolation, first-attempt semantics, and read-only/non-publishing authority.
- Preserve scheduled/manual Full regression and nightly triage behavior.
- Do not publish packages, grant secrets or OIDC to PR jobs, alter budgets/timeouts, weaken branch protection, redesign suite ownership, change startup enforcement modes, or modify #536 in this stream.

## Decisions

### 1. One reusable implementation, three entry points

Extract the complete validation jobs into a `workflow_call` workflow with an explicit immutable source SHA and invocation/selection identity. Keep `full-regression.yml` as the named `Full regression` scheduled/manual wrapper so workflow dispatch clients and `workflow_run` triage retain their established entry point. Add a conditional reusable-workflow job to PR-triggered `ci.yml`; its called jobs then belong to that PR run and appear in Checks.

All checkouts, receipts, candidate identities, outcome records, and artifact names use the explicit source SHA rather than assuming the caller's `github.sha` is the PR head (it may be the synthetic merge ref). PR evidence also binds the PR number, run ID/attempt, target baseline, and selection identity. Keep existing artifact readers compatible or update their consumers and tests together; scheduled/manual evidence must still be discoverable by nightly triage. The reusable result fails unless every expected lane succeeds and its required outcome evidence is present and consistent.

The retained matrix is Windows 2025 x64 Node 24 and Node 22, Ubuntu 24.04 x64 Node 24, and macOS 15 arm64 Node 24. Preserve the full documentation prerequisite and each lane's build/pack/install contracts. Keep ordinary selected PR checks initially; overlap with the additional complete suite is explicit cost, not permission to delete gates or reuse stale artifacts. Deduplicating ordinary and full invocations is out of scope.

### 2. Explicit trusted selection, not title matching

A lightweight PR selector runs even when the existing general `changes` job is skipped for drafts. It reads base-controlled policy and the complete merge-base-to-head changed/renamed path set, current PR metadata, and supported lifecycle association. It publishes a structured selected/not-selected/blocked decision with reasons and exact input identities. It never executes PR code with privileged credentials.

Select complete regression for any of these reasons:

1. A nightly-repair association: the generated `fix/nightly-regression-*` branch or a supported `fix-nightly-regression-*` OpenSpec association, retaining base/head evidence when markers or paths move during finalization. Renaming the branch or removing the display marker must not silently erase already-established repair association; ambiguity blocks rather than declaring an ordinary PR.
2. Release/publishing impact according to a reviewed base-owned path rule set. The initial set includes `.github/workflows/release.yml`, `scripts/release/**`, `src/foundation/release/**`, `test/foundation/release/**`, release command/version/update entry points and their retained tests, and shared support reached by those tests. The rule set also includes Full regression/Development orchestration, selection/aggregation authority, validation-owner policy, and build/prerequisite/packing inputs that can break release installation before owner outcomes exist. Enumerate exact entry-point/configuration paths in implementation and protect additions, deletions, and renamed-from paths with fixtures. Do not select all product changes merely because broad owner fallback includes a release owner.
3. The maintainer opt-in label `ci:full-regression`. Labels are additive, never an exemption from an automatic reason. Use repository label permissions; applying the label authorizes CI work, not implementation, finalization, acceptance, or publishing.

Documentation-only and pure version-only changes retain existing exemptions unless a nightly-repair association or explicit opt-in applies. Planning-only drafts remain exempt even with repair association or the opt-in label; explanatory docs and new active OpenSpec artifacts alone are not implementation. A draft with executable implementation and an automatic reason or opt-in receives visible full checks but remains draft and ineligible for integration. Unknown/malformed classification or incomplete pagination blocks selection or conservatively requires full validation; it must never become a green unselected result.

Add `labeled`, `unlabeled`, and `converted_to_draft` to the applicable PR event handling alongside opened, synchronize, reopened, edited, and ready_for_review. Re-evaluate selection on every relevant event; compare the current head and selection inputs again before aggregation. An opt-in removal can deselect only when a fresh complete decision proves there is no automatic reason. Superseded checks cannot authorize the new selection.

Bootstrap refinement: while the target lacks the new base-controlled selector, an inline dependency-free bootstrap conservatively selects full validation for every non-planning candidate and binds the same source/base/metadata identities. It never executes the candidate's classifier to decide whether to skip itself. Once deployed, selector and aggregate recomputation execute from a separate exact-base checkout with read-only credentials. Complete Git comparison avoids API file-list truncation; bounded PR-commit history paths preserve a deleted or moved nightly scaffold. Shared test support is conservatively selected as release-sensitive rather than trusting candidate-controlled import analysis.

### 3. PR-visible checks and stable fail-closed aggregation

Keep stable descriptive lane names, for example `PR Full regression / Windows Node 22`, without introducing per-branch required-check names. The existing `Development validation required` aggregate remains the branch-protection entry point and additionally depends on the full-regression selection and called result. Selection errors block it. When selected, all four current-run lanes and the complete-regression aggregate are mandatory: failed, cancelled, missing, stale, or unexpectedly skipped work blocks integration. When unselected, a skip is valid only with a trustworthy current-head decision explaining why.

Do not accept a manually dispatched run, an earlier head, a previous attempt's mismatched artifacts, an old target baseline, or a nightly result as replacement for selected PR evidence. Do not poll external workflow runs or manufacture a separate check through a write token. Use normal Actions dependencies and typed outcome evidence. Preserve every other mandatory delivery, governance, rendering, and selected product gate.

PR runs cancel superseded work using a PR-specific concurrency group. Scheduled/manual callers retain their existing non-cancelling semantics and use distinct groups. Avoid a caller and reusable workflow sharing a cancellation key, which could cancel the caller itself. Label/body-only reevaluations may repeat validation under existing workflow semantics; no cross-run green-result cache is introduced.

### 4. Evidence ordering and the finalization cycle

Implementation stays draft while incomplete. Planning-only drafts never launch exhaustive work. Once approved code exists, selected draft runs provide early feedback and may be recorded in design evidence like other implementation investigations. They do not certify later finalization commits.

When implementation, substantive tasks, focused evidence, and gap disposition are complete, mark the candidate ready and let the existing trusted finalizer synchronize/archive it. The resulting final head receives a new PR-attached full run plus ordinary mandatory checks. Final-head remote CI is a merge/handoff gate, not a prerequisite requiring its own future run number to be committed before finalization. Guidance and task templates must distinguish these two evidence stages so a pending post-finalization gate is neither falsely checked off nor a circular task blocker.

Record the final run/head/selection in Actions outcomes, the aggregate summary, and the maintainer handoff; do not require editing committed design or immutable acceptance text just to insert the final run ID. Any actual code, body acceptance, manifest, or target change still invalidates prior evidence and requires renewed finalization/validation. Eligible repairs no longer require an additional manual dispatch after the selected PR run succeeds. Legacy/manual runs remain historical or debugging evidence; until this implementation is deployed the existing dispatch rule, including #536's obligations, remains in force.

### 5. Trust boundaries and triage

PR validation has read-only contents and narrowly scoped read access to PR/Actions metadata where needed, checks out without persisted credentials, and inherits no publication secrets, write token, npm credentials, or OIDC authority. Do not use `pull_request_target` to execute PR code. Forks retain GitHub's normal approval restrictions; unavailable approval or evidence is pending/blocked, never successful full validation.

Preserve the top-level scheduled/manual workflow's identity and triage entry point. PR-called full failures and manual candidate-branch failures remain evidence for that candidate and never open recursive nightly-fix PRs. Only the existing eligible `develop` Full regression and scheduled Release runs feed triage and persistent-overrun history. PR validation success does not establish numbered-package nightly recovery or authorize registry publication.

## Alternatives considered

- More `workflow_dispatch` calls: retains the observed PR visibility problem and requires external correlation/polling.
- A posted comment or synthetic status: adds a link but does not expose native lane checks or enforce the parent PR dependency graph.
- Full regression on every PR: removes the intentional ordinary cadence boundary and adds unrelated installation/timing cost.
- A second independent `pull_request` workflow: possible, but requires another cross-workflow gate or branch-protection context; calling the reusable workflow from Development keeps one stable required aggregate.
- Selecting by PR title or allowing a skip label: easy to accidentally bypass and not tied to reviewed impact.

## Validation and live evidence plan

- Hermetic classifier fixtures: generated repair, manually authored publishing fix, release support rename/deletion, before-owner Rust/build changes, policy invalidator, ordinary UI PR, docs/version-only exemption, planning-only draft, implementation draft, archived/moved repair association, label addition/removal, malformed metadata, unknown paths, truncated comparison, and stale selection.
- Workflow contract fixtures: all three callers use the same complete implementation and explicit source identity; matrix and owner coverage remain unchanged; native PR lane names are visible; scheduled/manual entry points and triage artifact discovery remain compatible; no privileged PR execution or publication authority is added.
- Aggregate negative cases: selected lane failure, cancellation, timeout, unexpected skip, absent/mismatched evidence, stale head/base, label change, and previous-run success all block; a proven unselected decision retains the ordinary bounded gate.
- Lifecycle fixtures: finalization push triggers new full evidence, no future-run-ID task cycle, changed acceptance/body or target revalidates, draft feedback grants no integration authority, and ordinary docs auto-merge remains unaffected.
- Live canary: use this implementation PR (workflow-authority changes automatically select full regression) to prove all four lane checks and their links appear in the actual PR Checks rollup, not only commit check-runs. Verify final-head success is included in the stable aggregate before manual handoff. Use disposable/hermetic fixtures for destructive failure cases; do not fail a live publication to demonstrate gating.
- Record a compatible standalone Full regression run after implementation without treating it as a substitute for the PR result; verify scheduled entry-point preservation through workflow/triage fixtures and subsequent read-only observation, without changing the schedule or creating artificial nightly failures.

## Risks and rollout

Selected repairs will take as long as complete regression and may expose existing exhaustive failures; retain those failures and deadlines rather than reclassifying them away. Ordinary latency targets still apply to ordinary owners; report the added complete-suite duration separately without claiming a speedup. PR-check visibility must be verified on GitHub, not inferred solely from YAML unit tests.

Introduce selection, reusable execution, aggregation, policy/spec reconciliation, and regression tests in the same approved implementation PR. Keep the stable protected context unchanged. Until deployed, do not claim the new rule applies to #536. If rollout fails, revert through a normal manually merged corrective PR and preserve scheduled/manual full validation; do not bypass a selected failed gate.

## Implementation evidence

- Approved implementation continues in #543 on `feature/pr-full-regression`; the selector, shared caller, native lane envelopes, protected aggregate, governance inventory, lifecycle templates, and focused fixtures are implemented together.
- Focused selector/workflow/governance execution initially ran 70 tests: 69 passed and one fixture expected a historical 60-minute lane instead of the retained 40-minute deadline. The assertion was corrected without changing the deadline; the replacement focused run passed 98 tests across nine files.
- #536's independently dispatched run 35757525387 completed successfully on all four lanes. It remains evidence for that separate repair, not a substitute for #543's PR-attached canary.
- Draft PR run 35762396554 proved native Checks-rollup attachment for `PR Full regression / Full documentation review` and the reusable aggregate. Documentation then failed because the tracked fixture's test-seam comment lacked an allowed classification; no platform lane ran. The comment was classified as rationale without weakening the review.
- Replacement draft run 35763125233 exposed all four named native lanes in #543's `statusCheckRollup`. Documentation passed. macOS/Linux then exposed three stale governance fixture expectations and the thinking-selector mismatch fixed in unmerged #536; Windows was still running when the corrective commit superseded the run. The policy fixtures were updated to retain the new authority/resource partition.
- The broad repository-governance pass ran 1,211 tests: 1,207 passed; the same three owned fixture expectations failed, plus one release fixture exceeded Vitest's default five-second limit under concurrent local load. After fixture repair, 52 focused policy tests passed and the release-command file passed all 36 tests in isolated rerun.
- After reconciling merged #536, 107 focused repair/orchestration tests, build, typecheck, architecture, documentation governance, workflow YAML parsing, and strict OpenSpec validation passed. The final complete repository-governance rerun passed all 1,233 tests across 124 files. An actual retained Full regression artifact from run 35757525387 also passed the new lane-envelope parser (20 selected scopes and 17 deduplicated outcomes).
- Read-only live repository-governance inspection performed no mutation and reported exactly the expected pre-deployment drift: `ci:full-regression` is absent and the shared workflow is not yet on the default branch. Workflow drift resolves only through this PR's manual merge; label creation remains a separately confirmed governance operation.

## Known gaps

Standalone caller compatibility remains to be observed after the PR-attached draft run. The live label is intentionally not created ad hoc: `ci:full-regression` remains pending the repository's separately confirmed governance-apply operation; automatic repair/publishing selection does not depend on that label. Successful draft evidence will not certify the later finalized head. The draft Full regression exposed the thinking-selector mismatch repaired by #536; merged #536 was subsequently reconciled rather than duplicating that repair. Existing startup-enforcement prose inconsistencies remain outside this orchestration change; execution modes, budgets, deadlines, and first-attempt behavior were preserved.
