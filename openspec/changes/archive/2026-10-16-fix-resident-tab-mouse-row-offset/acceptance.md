# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Resident tabs highlight and activate pinned prompts and jump-to-bottom at their visible pointer positions.
- Mouse input on the tab strip remains attach-owned and does not reach the viewed child.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-resident-tab-mouse-row-offset",
  "sourcePr": 775,
  "archive": "openspec/changes/archive/2026-10-16-fix-resident-tab-mouse-row-offset/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-16-fix-resident-tab-mouse-row-offset/acceptance.md",
  "finalizedDate": "2026-10-16",
  "specBaseSha": "633517a1c1afc2519b6011204a07cf42fe8e7800",
  "acceptanceScenarios": [
    "Resident tabs highlight and activate pinned prompts and jump-to-bottom at their visible pointer positions.",
    "Mouse input on the tab strip remains attach-owned and does not reach the viewed child."
  ],
  "archiveDigest": "5ae0b0f02670fcc82feb2fbe6af12eba79abf49d30f91e849c6fe603f640b315",
  "specDigest": "d039a3f20582779beb8d0efdbf0c2434a19a349465f8099f1b4334961e97b815",
  "tasksDigest": "37694ade5cb933377bad5af647b93187c2dd9d4a248a5c873fd6644335a6db44",
  "evidenceDigest": "47344ae4c888dbf80be69fcdde7ef63194c97c57a803e3d942613d5722028939",
  "knownGaps": []
}
```
