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
  "specBaseSha": "9448204a4c593148e415a9feef659293423948a6",
  "acceptanceScenarios": [
    "After `handoff` parks a delivered worktree and its PR merges, the next session's `sweep` removes that worktree and its topic branch with no per-candidate command, while an open PR reports `pending` and a rejected one reports `awaiting-discard` and is left untouched.",
    "A registered head that sits one finalization commit behind the merged PR head is cleaned up instead of blocking with `candidate-head-association`; a local-only commit still blocks and keeps the branch.",
    "A merged local branch left behind by a hand-deleted worktree is pruned by the sweep, and a `mutation.lock` whose holder was killed is evicted once its heartbeat is silent and its PID is gone, with the eviction journaled."
  ],
  "archiveDigest": "bd95e2fbabc8b2129342603fa0da487e0f0eda96e1339eaab8da5b4755d70a6b",
  "specDigest": "69b98d7cbcba215725d7585e644e72076ab542c05bf582b93653d77083922e31",
  "tasksDigest": "37499a5bbae74e47b95f055e3b248f3c18e1e7bb98daf2590f24a69998e05450",
  "evidenceDigest": "dfefed8a97598ac65b91410297fd9024998b7d4ee4844b98bb8795144ae01c39",
  "knownGaps": []
}
```
