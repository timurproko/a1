## Why

OpenSpec delivery currently turns one product change into three pull requests: implementation, specially named acceptance, and archive. Although the latter two are automated, they create confusing repository noise and require a second manual merge after the implementation has already landed. Planning, implementation, exact-head validation, human acceptance, specification synchronization, and archival can instead be prepared and verified in one ordinary development pull request and integrated atomically.

## What Changes

- Keep one normally named `feature`, `fix`, `refactor`, `docs`, `test`, `chore`, or `style` pull request from draft planning through implementation and completion; do not create `#<id>(accept)` or archive-only follow-up pull requests for new version-3 deliveries.
- Unify every agent-created OpenSpec delivery PR around a quoted `Phase` status, a `Proposal` section containing one or two sentences of intent, an `Implementation` section describing the work, final `Acceptance` outcomes, and collapsed machine linkage under last `Automation`. Advance the phase from `Planning` to `Implementation` to `Acceptance` and omit routine validation command noise.
- Keep the PR draft while it contains only an unapproved plan or unfinished implementation. After explicit plan approval and implementation, finalize the same branch by conservatively synchronizing delta specs, moving the active change into its dated archive, and staging a conditional acceptance record before marking the PR ready.
- Run ordinary exact-head PR CI over the complete implementation plus synchronized/archive result. Failed, stale, conflicting, incomplete, or ambiguous finalization remains blocking and cannot be hidden by documentation routing.
- Require one to three implementation-specific acceptance scenarios as plain bullets in the ordinary PR, not checkboxes. After current-head CI and actual review, an authorized maintainer's manual merge of that same PR means those listed scenarios are accepted and atomically establishes implementation integration, acceptance, specification synchronization, and archive integration.
- Bind the acceptance list to a committed finalization manifest and the exact PR head. Body edits and synchronize events rerun trusted candidate validation; automation never checks or edits acceptance state, infers acceptance from CI, or arms implementation auto-merge.
- Replace post-merge acceptance/archive publication for new deliveries with read-only verification, status reporting, exact-head remote-branch cleanup, and optional ownership-safe local cleanup. Retain read-only compatibility for existing acceptance comments, acceptance PRs, archive PRs, legacy links, and in-flight older versions.
- Preserve protected-branch pull-request requirements, existing product CI, manual implementation acceptance, fail-closed task/evidence checks, conservative spec synchronization, known-gap distinction, and least-privilege workflow boundaries.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-delivery-workflow`: Make a single ordinary development PR the atomic planning, implementation, acceptance, synchronization, and archive unit.
- `openspec-acceptance-review`: Move exact-head human acceptance from a generated post-implementation checklist PR into the final implementation PR, where manual merge accepts its plain scenario list, while retaining verifiable human provenance and stale-candidate rejection.
- `github-repository-governance`: Replace new-delivery acceptance/archive PR publication with trusted pre-merge finalization and post-merge verification without bypassing branch protection.

## Impact

Implementation will affect the OpenSpec archive/acceptance policy, staging, publication, GitHub readers, documentation lifecycle classifier, required Development workflow routing, archive workflow, declarative workflow inventory, focused governance fixtures, delivery skill, and archive/local-cleanup runbooks. It introduces a versioned single-PR delivery record while retaining legacy readers. It does not change product runtime behavior, release publication authority, branch protection, merge methods, dependency versions, or the documentation auto-merge allowlist. Planning in this PR remains OpenSpec-only until separately approved for implementation.
