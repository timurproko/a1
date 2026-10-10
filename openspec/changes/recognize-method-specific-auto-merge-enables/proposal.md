# Proposal

## Why

A maintainer who has tested a finalized implementation PR should be able to enable native auto-merge and let GitHub integrate it once required checks pass. On PR #742 every such attempt was disabled about fourteen seconds later. GitHub's issue timeline names an enable by its merge method, `auto_squash_enabled` or `auto_rebase_enabled`, and only the webhook action is the generic `auto_merge_enabled`. Acceptance provenance looked only for `auto_merge_enabled`, so documentation automation never found the maintainer's enable event, judged the arm unauthorized, and disabled it. The same gap made post-merge archive verification record #742's valid manual merge as `acceptance-merge-provenance`.

## What Changes

- Treat `auto_merge_enabled`, `auto_squash_enabled`, and `auto_rebase_enabled` timeline events as the same human enable in acceptance provenance.
- Apply that recognition wherever enables are read: active-arm tracking, legacy manual-only acceptance, and version-3 manual-merge actor checks.
- Add coverage built from #742's real timeline, plus a rebase variant, at both the policy and documentation-workflow boundaries.
- Keep every existing guard: bot or App enables, stale arms followed by a commit, differently authored arms, merge-queue provenance, and body edits still refuse or disarm.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `github-repository-governance`: Define which timeline events count as a native auto-merge enable for human-arm preservation and merge-time verification.

## Impact

Expected implementation is limited to `scripts/governance/openspec-acceptance-policy.mjs` and its repository-governance tests. Workflow triggers, the documentation allowlist, merge methods, and human-authority rules are unchanged.
