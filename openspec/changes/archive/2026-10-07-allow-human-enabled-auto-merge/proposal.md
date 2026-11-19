## Why

Version-3 delivery currently treats any `auto_merge_enabled` timeline event as invalid provenance, even when an authorized maintainer armed auto-merge on the exact finalized head or disabled it before manually merging. This makes GitHub's user-controlled auto-merge unusable for implementation PRs and incorrectly blocks acceptance and cleanup for PR #709 despite successful exact-head validation and a human merge.

## What Changes

- Treat auto-merge armed by an authorized human on the exact finalized head as explicit acceptance and integration authorization once required exact-head validation succeeds.
- Preserve exact-head intent: a commit after the human arms auto-merge invalidates that authorization and requires the maintainer to arm it again.
- Stop documentation policy from disabling a valid human-armed version-3 auto-merge while continuing to reject agent-, bot-, App-, documentation-, and merge-queue integration authority.
- Treat a human auto-merge attempt that was disabled before a subsequent valid manual merge as harmless rather than contradictory provenance.
- Re-evaluate historical version-3 deliveries, including PR #709, through the shared reader so valid human-enabled provenance can become accepted-and-archived and eligible for protected cleanup.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `github-repository-governance`: Permit exact-head native auto-merge explicitly armed by an authorized human while retaining fail-closed merge provenance and automation boundaries.
- `openspec-acceptance-review`: Recognize authorized human auto-merge intent as conditional acceptance and distinguish disabled attempts from automatic integration.
- `change-delivery-workflow`: Allow maintainers, but never agents or repository automation, to choose native auto-merge for a finalized exact-head candidate.

## Impact

The change affects version-3 acceptance provenance, documentation auto-merge enforcement, shared GitHub readers, cleanup eligibility, delivery guidance, and focused governance fixtures. It changes no product runtime behavior, branch protection requirements, exact-head CI, merge-queue prohibition, documentation auto-merge ownership, or bot/App authority. This policy PR itself remains subject to the current manual-merge requirement.
