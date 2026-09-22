## Context

On 2026-09-22, #536's head `99f1cba4333678d240e03c77388df6ceea90e340` had Full regression run 35757525387 in the commit check-runs API, but its PR `statusCheckRollup` contained only Development validation and repository-policy workflows. Full regression currently supports `schedule` and `workflow_dispatch`; Development validation is PR-triggered but skips drafts and intentionally defers exhaustive integration owners. Dispatching another branch workflow is therefore not a reliable PR-visible handoff.

The maintainer approved preparing this plan after requesting PR-visible full validation for nightly/publishing fixes. Implementation is not yet approved. Base: `origin/develop` at `7b80f6a30cf82ae654a668fc577734bdd33dcaa5`. #536 remains a separate delivery; reconcile any changes it merges before implementation here.

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

## Known gaps

This is planning only. No implementation, fixture result, live PR-visible canary, or successful final-head regression evidence is claimed. Existing startup-enforcement prose inconsistencies are outside this orchestration change; preserve the currently approved execution contract and do not silently retune it during workflow extraction.
