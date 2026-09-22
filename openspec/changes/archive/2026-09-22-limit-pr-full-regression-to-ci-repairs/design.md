## Context

`Development validation` currently runs `scripts/release/pr-full-regression.mjs` from the exact base revision and conditionally calls the shared four-lane Full regression workflow. The selector recognizes nightly-repair association, a broad set of release/build/policy paths, unknown operational paths, a repository label, and a deployment bootstrap. The protected aggregate correctly verifies the selected result, but the selection surface is wider than the desired policy.

The trusted nightly regression triage already creates repair PRs with the `openspec-ci` GitHub App. GitHub PR author identity is immutable, and the triage owns the initial branch/scaffold commit. That gives base-controlled selection a stronger distinction than branch, title, body, or changed-path naming alone.

## Goals and non-goals

- Run PR-attached Full regression only for a repair PR that trusted CI created from a failed Full regression.
- Keep normal PR validation impact-selected, fail closed, and sufficient for ordinary integration.
- Prevent a manually authored lookalike branch, OpenSpec change, body, label, or release-path diff from opting into or accidentally triggering the complete suite.
- Preserve the shared complete suite, its four native lanes, exact-head evidence, protected aggregate, schedule, manual dispatch, and release/nightly coverage.
- Do not weaken ordinary owner selection, turn failed PR tests optional, alter publication gates, or remove Full regression itself.

## Decisions

### 1. Selection requires generated provenance

Extend current PR metadata with immutable author identity. An eligible PR must be authored by the configured `openspec-ci` App identity and retain a supported nightly-regression repair association. The generated scaffold will carry bounded machine-readable provenance identifying the source Full regression run, failed conclusion, source `develop` head, workflow/event identity, and triage candidate identity. Selection validates that record with base-controlled code, compares every qualifying source field with GitHub's read-only workflow-run record, and follows complete branch history through finalization.

Bot author alone is insufficient, because the same App performs other repository automation. Repair naming alone is insufficient, because a human can create a matching branch or body. Both generated origin and failed-Full-regression provenance are required. Missing, malformed, contradictory, non-failure, scheduled-Release-only, or manually fabricated association remains unselected for PR Full regression; malformed evidence still blocks ordinary CI where it makes lifecycle metadata ambiguous rather than silently granting a green result.

The generated provenance remains stable when the active OpenSpec change is archived. Selection may use renamed-from/history paths to find it, but does not infer eligibility from a branch prefix after the marker disappears.

### 2. All broad and manual triggers are removed

Delete release/publishing path prefixes and exact-path matching from complete-regression selection. Delete `unknown-operational-input`, deployment-bootstrap complete execution, and `ci:full-regression` label selection. Workflow, release, build, configuration, shared fixture, validation-authority, and ordinary product changes continue through the existing Development impact classifier and its conservative fail-closed behavior where applicable; they do not invoke the exhaustive matrix merely because of their paths.

Labels are removed from complete-regression identity and no longer trigger Development validation; no label can request PR-attached Full regression. Body, head, base, readiness, and provenance changes retain freshness handling. A maintainer who wants diagnosis for another branch can manually dispatch the standalone non-publishing Full regression workflow; that run does not become a required PR check and does not substitute for ordinary Development validation.

### 3. Eligible repair execution and aggregation stay unchanged

For an eligible generated repair, planning-only draft scaffolds remain lightweight. Once approved implementation adds non-planning changes, the current shared workflow exposes Windows Node 22/24, Linux Node 24, macOS Node 24, documentation, and the complete aggregate in the PR. The protected `Development validation required` check continues to reject failed, cancelled, absent, stale, or unexpectedly skipped selected evidence.

For every other PR, the trusted selection artifact records `ordinary-cadence` (or the existing docs/version/planning reason), the reusable full job is skipped, and the protected aggregate accepts that skip only after recomputing the same current-head decision. Exhaustive owners remain covered by scheduled/manual Full regression and nightly/stable release validation.

### 4. Deployment is base-controlled

The selector and verifier continue to execute policy from the pull request's exact base. The current corrective PR changes validation authority, so the already-deployed broad policy can select Full regression for this one rollout. The implementation must not bypass that current required check. Once merged, the narrowed base policy governs subsequent PR events.

The inline pre-deployment bootstrap no longer conservatively runs Full regression for every non-planning candidate. If the selector is unavailable on a future base, selection and aggregation block with an explicit error rather than claiming generated-repair provenance they cannot verify.

## Validation plan

- Selector fixtures for a bot-created failed-Full-regression repair before implementation, during implementation, and after OpenSpec finalization.
- Negative fixtures for human-authored lookalikes, bot-authored non-repair PRs, release/publishing paths, validation workflows, shared support, unknown paths, labels, scheduled Release failures, successful/cancelled runs, malformed provenance, and removed provenance.
- Current-head freshness fixtures for author, body, head, base, readiness, provenance, and history changes, plus proof that labels are ignored.
- Workflow contracts proving ordinary PRs skip the shared full job, eligible repairs still expose all four lanes, and the stable aggregate accepts only the corresponding fresh result.
- Triage fixtures proving new failed Full regression proposals emit bounded provenance and refresh it without opening recursive candidates.
- Focused governance tests and strict OpenSpec validation; hosted evidence should show this rollout obeying the old base gate and a later ordinary PR remaining unselected under the new policy.

## Risks and rollout

A provenance check that is too strict could leave a genuine generated repair without its required exhaustive gate. Fail clearly in selector summaries and cover initial creation, refresh, implementation, and finalization history. A check that trusts only names could allow false selection and reintroduce the cost; bind author and source-run fields together.

The narrower policy deliberately permits release or validation-authority regressions to reach `develop` after ordinary selected validation and before the next scheduled Full regression. That is the requested cadence boundary; scheduled Full regression, nightly/stable release gates, and manual diagnostics retain detection and publication protection.

## Implementation evidence

- The selector now requires the immutable `openspec-ci[bot]` login, numeric App identity, generated branch/change identity, and at least one failed Full regression source whose workflow, run, attempt, event, conclusion, head, URL, and creation time exactly match GitHub's read-only Actions record. Human lookalikes, other App PRs, Release failures, successful persistent-overrun runs, paths, unknown inputs, and labels remain unselected.
- Triage writes `regression-provenance.json` with every new scaffold and appends distinct source runs while an active candidate is refreshed. Finalization-history fixtures prove the marker remains discoverable after the active change is renamed into its archive.
- Development no longer reacts to label-only events, the unused governance label declaration is removed, and an unavailable base selector blocks instead of running a conservative complete suite. The shared matrix, selected-result verifier, standalone schedule/dispatch, release validation, and publication permissions are unchanged.
- Build and typecheck passed. After reconciling current `develop`, the focused selector, source-API, history, triage, workflow, runbook, governance, ownership, and delivery-guidance set passed 103 tests across nine files. Strict OpenSpec validation, documentation governance, architecture/product-identity checks, workflow/config parsing, and read-only live repository-governance comparison passed; the live comparison reported no drift.
- A diagnostic complete `test/repository-governance` invocation exceeded the 600-second command bound. Before termination it exposed the new skill word bound, which was corrected and passed, plus three unchanged real-Git release fixture deadlines under cumulative Windows load. Isolated reruns of the `unstaged` and `untracked` 20-second cases passed in about 12 seconds each. The unchanged five-second existing-branch case completed its real operations in about six seconds and retained its original timeout failure; no deadline, assertion, fixture, or release behavior was changed for this unrelated observation.

## Known gaps

No known implementation or focused-validation gap remains. Exact-head hosted validation, including the one-time Full regression selected by the currently deployed broad base policy, remains the required post-finalization handoff gate. The unrelated five-second release-fixture timing observation is preserved above and is not treated as success or as scope for this selection correction.
