# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- After `handoff` parks a delivered worktree and its PR merges, the next session's `sweep` removes that worktree and its topic branch with no per-candidate command, while an open PR reports `pending` and a rejected one reports `awaiting-discard` and is left untouched.
- A registered head that sits one finalization commit behind the merged PR head is cleaned up instead of blocking with `candidate-head-association`; a local-only commit still blocks and keeps the branch.
- A merged local branch left behind by a hand-deleted worktree is pruned by the sweep, and a `mutation.lock` whose holder was killed is evicted once its heartbeat is silent and its PID is gone, with the eviction journaled.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "automatic-merged-delivery-cleanup",
  "sourcePr": 459,
  "archive": "openspec/changes/archive/2026-09-17-automatic-merged-delivery-cleanup/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-17-automatic-merged-delivery-cleanup/acceptance.md",
  "finalizedDate": "2026-09-17",
  "specBaseSha": "464b1338be354745169a55bbddccae9211ab1e33",
  "acceptanceScenarios": [
    "After `handoff` parks a delivered worktree and its PR merges, the next session's `sweep` removes that worktree and its topic branch with no per-candidate command, while an open PR reports `pending` and a rejected one reports `awaiting-discard` and is left untouched.",
    "A registered head that sits one finalization commit behind the merged PR head is cleaned up instead of blocking with `candidate-head-association`; a local-only commit still blocks and keeps the branch.",
    "A merged local branch left behind by a hand-deleted worktree is pruned by the sweep, and a `mutation.lock` whose holder was killed is evicted once its heartbeat is silent and its PID is gone, with the eviction journaled."
  ],
  "archiveDigest": "d6c72965099c731c5c8a0d8e4f93d063e20e158944d98c7aed61027228c8cb5c",
  "specDigest": "9b04db2ff1c4a27bde2f2b17d1efbc22b47f052589a7a6dbb44b887b6981b88c",
  "tasksDigest": "108f6322d3ed6eae1b2e8727f9752bd4765679b939b703838b9030dcaaf38cc3",
  "evidenceDigest": "e57f0f8158ccede91c8b5d134667ec2dea6e4b5e6cd5f51019fc1f1af8a6b839",
  "knownGaps": []
}
```
