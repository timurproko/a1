## Why

A1's GitHub policy is split across live repository settings, three managed rulesets,
four workflow files, scripts, README/runbook prose, and the canonical continuous-
integration specification. Only the rulesets have a declarative drift check, and
that check normalizes away some live fields. The canonical publication requirements
also still describe push-triggered publication even though accepted automation now
uses nightly or explicit dispatch from authoritative `develop`.

PR #163 exposed a concrete lifecycle gap. GitHub reports
`delete_branch_on_merge: true`; the pull request was same-repository, non-draft,
squash-auto-merged by `github-actions[bot]`, and its head branch was unprotected.
The timeline records auto-merge enablement, merge, and close, but no head-ref deletion,
and `refs/heads/docs/test-openspec-auto-merge` still names the exact merged head.
A1's trusted workflow has no `closed` trigger or owned cleanup operation, so it had
no way to detect or repair the missing platform-side deletion.

Repository governance needs one behavioral contract based on observable state rather
than assumptions about a GitHub setting, plus a bounded implementation plan for
safe merged-branch cleanup and complete policy drift detection.

## What Changes

- Add a `github-repository-governance` capability that inventories authoritative
  repository settings, protected refs, Actions policy, environments, workflow
  authority, and live acceptance evidence.
- Require declarative comparison of every governed live field rather than only the
  current three rulesets or a normalization subset.
- Preserve the exact documentation auto-merge allowlist and trusted-code boundary.
- Add deterministic cleanup for merged same-repository topic branches targeting
  `develop`, triggered from trusted default-branch code after pull-request closure.
- Delete a branch only when the live ref still equals the pull request's merged head
  SHA; treat an already-absent ref as success and refuse protected, default, release,
  fork, unmerged, advanced, or malformed refs.
- Reconcile continuous-integration requirements with accepted nightly/explicit
  publication and PR-numbered previews.
- Add docs-sensitive governance checks so an OpenSpec archive cannot silently stale
  a generated policy inventory and make the next code pull request fail.
- Require live acceptance for OpenSpec-only and root-README-only auto-merge, branch
  cleanup, mixed/code non-auto-merge, stale-ref refusal, and policy drift reporting.

**BREAKING**: none for the product. Repository integration becomes stricter and
merged topic branches gain deterministic cleanup.

## Capabilities

### New Capabilities

- `github-repository-governance`: authoritative GitHub settings, rulesets, workflow
  boundaries, drift detection, merged-branch lifecycle, and live acceptance.

### Modified Capabilities

- `continuous-integration`: align documentation governance and publication triggers
  with the accepted workflows and prevent docs-only changes from staling generated
  policy evidence.

## Impact

The later implementation will affect GitHub workflow triggers and permissions,
repository-governance scripts and configuration, focused mocked-API tests, CI change
classification, generated-policy validation, and the CI/release runbook. It will not
execute pull-request code with a write token and will not delete local branches or
worktrees. Repository-setting mutations remain explicit maintainer operations; normal
CI performs read-only drift detection.
