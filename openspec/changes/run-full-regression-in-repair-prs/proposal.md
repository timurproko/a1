## Why

A manually dispatched Full regression can have checks on a branch commit without appearing in that pull request's Checks rollup. During #536, run 35757525387 exercised the repair head, but the PR displayed only its skipped draft Development checks. Nightly and publishing repairs need visible, required exhaustive evidence in the PR where the maintainer reviews and integrates the fix, without making every unrelated PR run the complete suite.

## What Changes

- Invoke a shared non-publishing Full regression workflow from Development validation for nightly-repair implementations, release/publishing-impact changes, and maintainer opt-ins.
- Expose the complete platform/runtime matrix as native PR checks and make its selected outcome mandatory in the existing protected development aggregate.
- Bind selection and execution to the exact PR head, rerun on head or relevant selection changes, and preserve lightweight planning-only drafts.
- Keep scheduled and manually dispatched Full regression as supported callers of the same implementation, with existing coverage, artifact contracts, permissions, and publication separation.
- Update delivery guidance so PR-attached full validation replaces the mandatory separate dispatch for eligible repairs; avoid requiring a committed final-run identifier that would invalidate its own exact-head evidence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: select, expose, and require exceptional complete regression in PR CI while retaining ordinary bounded cadence and independent scheduled/manual entry points.
- `isolated-regression-testing`: explicitly allow selected PR Full regression to execute exhaustive owners and both Windows runtimes without weakening ordinary-scope or exact-artifact contracts.
- `change-delivery-workflow`: distinguish implementation evidence from final-head workflow evidence and gate handoff on the PR-attached full result without an extra dispatch or evidence-only commit.

## Impact

Implementation would touch `.github/workflows/ci.yml`, the shared Full regression workflow and its scheduled/manual wrapper, trusted selection and aggregation tooling, regression/triage policy tests, and delivery documentation including `.agents/skills/change-delivery/SKILL.md`, `openspec/config.yaml`, `docs/ci-release-runbook.md`, `docs/validation.md`, and `docs/openspec-archive-automation.md`. Existing canonical specs remain untouched until approved implementation finalization.

This is a separate planning-only delivery from #536. It neither changes that repair's current obligations nor blocks its integration. No workflow, script, test, package, label, protection rule, or canonical specification is changed by this proposal.
