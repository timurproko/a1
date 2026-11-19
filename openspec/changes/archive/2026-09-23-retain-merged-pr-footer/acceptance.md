# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- An exact merged pull request remains linked while its associated worktree and branch stay selected.
- Switching to an unrelated worktree or branch removes the previous pull-request badge.
- Closed-unmerged, mismatched, and unsafe pull-request results remain hidden.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "retain-merged-pr-footer",
  "sourcePr": 570,
  "archive": "openspec/changes/archive/2026-09-23-retain-merged-pr-footer/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-23-retain-merged-pr-footer/acceptance.md",
  "finalizedDate": "2026-09-23",
  "specBaseSha": "0ed21fb921ec88a2334db5e63973505057aa8748",
  "acceptanceScenarios": [
    "An exact merged pull request remains linked while its associated worktree and branch stay selected.",
    "Switching to an unrelated worktree or branch removes the previous pull-request badge.",
    "Closed-unmerged, mismatched, and unsafe pull-request results remain hidden."
  ],
  "archiveDigest": "a7a5be2c0dcc9a0c4c8049fe41b051cc1b738fb2c06e6abab2daddea3bd6fcea",
  "specDigest": "42b91b4af16d514f6bc37cedd475242a53ba62642a46105aa55770bb511e8576",
  "tasksDigest": "2f9c436b9e5ab9d862d133cfa7ee59b38914056e55a646f90caf3be69f7c3649",
  "evidenceDigest": "3afcb70a24c3172afe6aab6d7fc451a143852042b414e03271c2a5baeb9c1a84",
  "knownGaps": []
}
```
