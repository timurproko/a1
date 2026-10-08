## Why

Automated OpenSpec finalization can move a ready implementation PR to a new head without reliably starting Development validation as a PR-associated run. The previous head's run is cancelled by exact-PR concurrency, while a manually dispatched replacement appears only in Actions, lacks the pull-request event context used by delivery checks, and does not show lane progress on the PR. The result is an indefinitely expected `Development validation required` check and no merge button even though finalization itself succeeded.

PR #718 demonstrated the failure: implementation head `0b15a8da` started run `37803125014`, finalization pushed `71aa3113`, and the former run was cancelled without a Development validation run attached to the new PR head. A diagnostic `workflow_dispatch` run on `71aa3113` appeared in Actions but not in the PR check rollup and skipped PR-context delivery jobs, so manual dispatch is not a valid repair.

## What Changes

- Bind finalized version-3 implementation metadata to the exact finalized head, not only stable archive and acceptance-manifest paths.
- After a finalization or re-finalization push, update that head binding under the existing expected-body and new expected-head race guards. This guaranteed body transition emits a normal `pull_request: edited` event for the final head even when archive paths are unchanged.
- Defer implementation-bound Development validation while the body's finalized-head binding is absent or stale, then run the ordinary PR-associated workflow once finalization publishes the current binding.
- Require final candidate lanes and `Development validation required` to remain visible in the PR check rollup; manual `workflow_dispatch` remains diagnostic and cannot substitute for PR-associated delivery validation.
- Add recurrence tests for first finalization, same-path re-finalization, body/head races, idempotent already-finalized events, PR check visibility, and aggregate refusal of stale or manually dispatched evidence.

## Capabilities

### Modified Capabilities

- `change-delivery-workflow`: Make every automated finalization/refinalization publish an exact-head body binding that reliably causes normal PR-associated validation.
- `continuous-integration`: Require final implementation validation to retain pull-request context and PR-page progress visibility, while keeping manual dispatch diagnostic-only.

## Impact

- Changes trusted finalization publication, version-3 implementation metadata parsing, readiness classification, CI aggregation, governance tests, and delivery documentation.
- Does not relax branch protection, create an automation-owned merge path, or make manual workflow runs authoritative.
- Existing finalized version-3 PRs without the new field remain readable but require trusted finalization to add the exact current-head binding before their protected aggregate can pass.
- Version-1/version-2 delivery and unrelated documentation auto-merge remain unchanged.
