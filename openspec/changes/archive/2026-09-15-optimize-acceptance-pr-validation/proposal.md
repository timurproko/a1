## Why

Acceptance pull requests add one canonical source-binding record, yet ordinary CI currently installs the full analysis dependency tree, computes generic change impact, and runs documentation/OpenSpec validation before allowing the already-specialized acceptance validator to authorize the required check. Recent acceptance runs spent roughly 44–49 seconds on this route even though no product tests ran. Generated archive PRs do integrate automatically, but #417 remained visibly open for about a minute after becoming green because trusted reconciliation waited for a runner and then repeated a long sequence of authority reads; the lack of an armed native auto-merge request made the correct automatic path appear stalled. One lifecycle optimization can remove redundant acceptance CI and shorten observable archive integration while preserving every identity, scope, provenance, checklist, base, and current-head gate.

## What Changes

- Recognize an acceptance-shaped pull request early from its complete GitHub diff using trusted base workflow logic, without executing pull-request code.
- Bypass generic impact selection and documentation/OpenSpec validation only for an exact single added `openspec/acceptance/<change>/<source-head>.json` candidate.
- Continue running the trusted acceptance-record validator, and make its successful exact-scope verdict mandatory for the unchanged `Development validation required` context.
- Fail closed: malformed records, extra or renamed files, unavailable classification data, stale heads, invalid source/CI provenance, modified checklist text, or any other acceptance blocker cannot use the fast path or satisfy the required check.
- Preserve normal validation selection for implementation, archive, documentation, mixed, and all other pull requests.
- Keep generated archive PR integration automatic after exact-head CI, without maintainer merge action or dependence on native auto-merge being visibly armed.
- Reduce post-CI archive integration work by eliminating duplicate authority reads, parallelizing independent read-only verification, and reconciling immediately from the completed validation event while preserving the expected-head and exact-base merge decision.
- Report whether an archive is waiting for CI, runner reconciliation, base regeneration, or integration so an unarmed native auto-merge field is not mistaken for a manual hold.
- Add timing evidence and focused workflow-policy coverage for an expected acceptance-path wall clock of approximately 15–25 seconds and prompt archive integration after green CI under normal runner availability, without treating timing as a security gate.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `github-repository-governance`: Specialize current-head required validation for exact acceptance-record pull requests and accelerate automatic archive integration while retaining trusted policy authority and fail-closed scope/provenance checks.

## Impact

- Affects `.github/workflows/ci.yml`, acceptance/validation routing scripts, documentation auto-merge reconciliation, archive authority reads, workflow declarations, repository runbook documentation, and repository-governance tests.
- Does not change product behavior, implementation CI coverage, acceptance checklist semantics, manual acceptance merge requirements, archive PR validation, branch protection, required-check names, workflow write permissions, or documentation eligibility policy.
- Archive PRs remain automatically integrated through a protected expected-head squash request after current-head CI. Native pre-arming remains intentionally unavailable where it could merge an archive after its reviewed base has advanced.
- Uses existing read-only GitHub and Actions authority; no dependency, credential, ruleset, or bypass expansion is intended.
