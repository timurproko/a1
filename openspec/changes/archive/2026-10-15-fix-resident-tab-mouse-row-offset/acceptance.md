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
  "archive": "openspec/changes/archive/2026-10-15-fix-resident-tab-mouse-row-offset/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-15-fix-resident-tab-mouse-row-offset/acceptance.md",
  "finalizedDate": "2026-10-15",
  "specBaseSha": "4e3b085346ba38cafb86fec39f0c62b31498ac0a",
  "acceptanceScenarios": [
    "Resident tabs highlight and activate pinned prompts and jump-to-bottom at their visible pointer positions.",
    "Mouse input on the tab strip remains attach-owned and does not reach the viewed child."
  ],
  "archiveDigest": "4a82b309496b518e126a1656ea1a356abe03fb8a1c994030c1739c42842f8668",
  "specDigest": "b814b4b4bb409e42ab9aa93fd6bce26e095b75be7b5601843ff88962261bc7d2",
  "tasksDigest": "37694ade5cb933377bad5af647b93187c2dd9d4a248a5c873fd6644335a6db44",
  "evidenceDigest": "b29a79ec2fa5ddd7f524467639410a9610276d929d2d4b79923d758ca5e95e99",
  "knownGaps": []
}
```
