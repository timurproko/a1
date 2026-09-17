# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- An implementation-bound pull request's impact artifact reports `prCore.mode` `impact` with owners matching its diff, while an invalidator or manual dispatch still selects conservative coverage.
- The `changes` summary lists scheduled and unscheduled modular entries, and only the scheduled entries appear in the run's job list.
- The required aggregate still fails when a scheduled entry produces no successful evidence.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "restore-impact-selection",
  "sourcePr": 450,
  "archive": "openspec/changes/archive/2026-09-17-restore-impact-selection/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-17-restore-impact-selection/acceptance.md",
  "finalizedDate": "2026-09-17",
  "specBaseSha": "35259d4a67b386c4cf0cb6f698d67c1bab032246",
  "acceptanceScenarios": [
    "An implementation-bound pull request's impact artifact reports `prCore.mode` `impact` with owners matching its diff, while an invalidator or manual dispatch still selects conservative coverage.",
    "The `changes` summary lists scheduled and unscheduled modular entries, and only the scheduled entries appear in the run's job list.",
    "The required aggregate still fails when a scheduled entry produces no successful evidence."
  ],
  "archiveDigest": "1bd484d27d3637d2305ccce2677d859e9a1223275c45ff9f08aad7318b57c6bf",
  "specDigest": "1f60675e6850c3f1ea44c3cca3457a5b10d8ba1709e139e4c127c87c6e5ebc39",
  "tasksDigest": "48ac6876d56e468b59ecf1546c12c02b36750916ac7942ab550ab2122932c34f",
  "evidenceDigest": "0e1efdfd29555af57fcf86e804c6a036a6e4a7700c819f6222a5b85615a7691c",
  "knownGaps": []
}
```
