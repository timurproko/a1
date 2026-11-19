## Why

PR #316 passed required Development validation but both documentation auto-merge runs failed when GitHub rejected `enablePullRequestAutoMerge` with `Pull request is in unstable status`. The reconciler treats every non-clean state as suitable for arming and cannot recover a validated documentation PR once its own failed check contributes to that state.

## What Changes

- Explicitly handle GitHub's mergeable-but-unstable state instead of blindly trying to arm auto-merge.
- Allow a normal, protected, expected-head-SHA squash merge from `clean` or positively mergeable `unstable` state only after successful Development validation for that same current head.
- Treat the specifically identified unstable-status arming rejection as a recoverable state transition: refresh PR state, re-evaluate eligibility and validation, and either reconcile safely or report deferral without manufacturing a failing check.
- Keep retries bounded and distinguish waiting, merged, already merged, and genuine API failures in workflow output.
- Preserve the exact documentation allowlist, stale-head refusal, required checks, branch protections, trusted workflow source, manual code acceptance, and verified post-merge branch cleanup.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-delivery-workflow`: Permit protected, current-head-bound reconciliation of eligible mergeable unstable documentation PRs without expanding eligibility.
- `continuous-integration`: Define successful validation and recoverable merge-state rejection behavior without bypassing the required gate.
- `github-repository-governance`: Specify safe unstable-state recovery, bounded re-evaluation, failure classification, and exact-head cleanup.

## Impact

- `scripts/governance/documentation-auto-merge.mjs` and its declaration file: explicit merge-state decisions.
- `scripts/governance/manage-documentation-auto-merge.mjs`: state refresh, narrow GraphQL error classification, protected merge, and consistent armed/unarmed reconciliation.
- `test/repository-governance/documentation-auto-merge.test.ts`: planner and fake-GitHub manager regressions.
- No workflow trigger or permission changes, repository-policy changes, bypasses, dependencies, application behavior, or shortcut-PR edits.
