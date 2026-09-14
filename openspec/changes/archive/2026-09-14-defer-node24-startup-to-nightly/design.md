## Context

See [proposal.md](proposal.md) for motivation. In `.github/workflows/ci.yml`, `startup` has `node: [22, 24]` with `max-parallel: 1`. Each lane independently checks out the selected head, enables Defender, installs/builds, runs `package-install`, image preparation/package tests, and the history suite. The required aggregate consumes `needs.startup.result`, so the second lane extends the critical path even when other jobs finish earlier.

The release workflow already schedules nightly at `17 3 * * *` (03:17 UTC, subject to GitHub scheduling delay), validates Windows Node 22/24 plus Linux/macOS Node 24, and selects `full-release` for nightly/stable modes. Manual development publication still runs its existing exact-package smoke/install scopes. `full-regression.yml` is manual-only and already includes both Windows runtimes. `full-release` owns `package-install`, fast tests, and distribution integration, covering the deferred startup, image, and history workloads without a new scheduler.

## Goals / Non-Goals

**Goals:** Remove the redundant Node 24 PR startup lane while retaining a real current-head Node 22 gate, transparent runtime coverage, and existing full-validation/publication safety.

**Non-Goals:** Remove all startup checks from PRs, change Node support or other jobs' runtimes, relax budgets or Defender, introduce path-based startup classification, duplicate nightly workflows, change release cadence or credentials, or repair unrelated test failures.

## Decisions

### 1. Shrink the Development validation matrix instead of adding skip logic

Set the startup matrix to `node: [22]`. Keep the existing job ID, generated Node 22 check name, steps, artifact naming/retention, timeout, and exemption conditions. Apply the same matrix to `workflow_dispatch`; use manual Full regression when the maintainer needs Node 24 before nightly. Keeping the matrix shape minimizes churn and preserves `needs.startup.result` as the aggregate contract.

Do not create a Node 24 placeholder, use `continue-on-error`, synthesize a pass, or remove the entire startup dependency. Do not alter other Node 24 jobs (for example, analysis or full-regression lanes). The removed PR job includes image/history tests, not just a stopwatch: confirm each remains covered by Node 22 PR execution and Node 24 full-validation owners.

Alternatives rejected: running both lanes concurrently reduces wall time but retains duplicate per-PR cost and changes the current resource strategy; moving both lanes off PRs removes all pre-merge Windows startup protection; path-based selection adds classifier scope beyond the requested single-runtime adjustment.

### 2. Reuse existing nightly/release and manual owners unchanged

Preserve the release and Full regression matrices and their scopes. The change name means "defer from ordinary PR validation," not "disable Node 24 on manual or release validation." Retain both Windows runtimes for every release mode that currently uses them, including manual development publication. Preserve exact source/package digest identity, enabled Defender, first-attempt startup assertions, full-suite owners, and failure-before-publication behavior.

Add policy assertions that traverse the declared scope ownership rather than assume a matching job label proves coverage. No schedule, workflow permission, runtime support, or release-gating reduction is authorized. If inspection finds a genuinely missing deferred test owner, stop and reconcile the plan rather than silently omit coverage.

### 3. Keep the required gate strict and prove selection with tests

`require-development-validation.mjs` already requires aggregate startup success for code and an intentional skip for docs/version-only changes. It should need no production helper change. Add or strengthen cases in `development-validation-required.test.ts` for failure, cancellation, missing/unexpected skip, exemptions, and stale-head evidence. Update the old both-runtime expectation in `impact-aware-validation-workflows.test.ts` to assert exactly `[22]`, complete retained steps, and continued aggregate dependency.

Guard release/Full regression runtime matrices, package/full scope ownership, Defender, and unchanged publication dependencies with focused policy tests. Review `config/github-repository-governance.json` for actual inventory drift; do not manufacture a setting change when no governed field changes. Update `docs/ci-release-runbook.md` with a compact PR-versus-full coverage table and the Node-24-after-merge detection trade-off.

### 4. Accept actual scheduling evidence, not a promised time saving

Record a before-change PR run and a current implementation-head run, including job selection, Node 22 startup outcome, aggregate outcome, queue times, and durations. Acceptance requires no Node 24 startup job in the new PR run and successful retained required checks. Do not promise a fixed number of saved minutes: runner allocation and other jobs may dominate.

Record a successful Node 24 Full regression run for the candidate when explicitly authorized, or the first matching-source nightly/release validation after integration. Bind the evidence to its source/runtime and exact package where applicable; an unrelated historical green run is insufficient. Until observed, label retained live Node 24 coverage unverified rather than complete. Do not trigger publication merely to test this scheduling change; the non-publishing manual workflow is available.

## Risks / Trade-offs

- Node-24-only failures can land before nightly -> retain mandatory release/full coverage, expose failures, and use manual Full regression for earlier feedback when needed.
- Removing a job accidentally removes its non-startup tests -> verify full-scope ownership and preserve the complete Node 22 lane.
- Broadening aggregate skip acceptance could hide missing validation -> preserve fail-closed code-path checks and add negative fixtures.
- Nightly runs can be delayed or blocked by setup -> report that gap honestly; reduced PR validation is not evidence of Node 24 health.

## Migration Plan

1. Merge this planning-only change, then implement only after a separate explicit request under the active delivery rules. Do not mix this stream into archive automation or history-test corrections.
2. Update the PR matrix, focused policy tests, and runbook together; keep nightly/release/manual full execution unchanged and verify inventory consistency.
3. Obtain strict OpenSpec validation, required current-head CI, and the scheduling evidence described above. Leave the operational PR open for maintainer review and explicit manual merge authorization.
4. After integration, confirm retained Node 24 live full-validation evidence before marking this change complete. Record acceptance, synchronize/archive in the required OpenSpec-only follow-up, and clean worktrees only after confirmed integration and cleanliness.

Rollback restores `[22, 24]` in Development validation with matching policy tests and runbook text. It does not weaken budgets, remove retained tests, or change publication authority. No workflow cancellation or repository-settings mutation is part of this planning delivery.
