# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A terminated Windows process object is reported absent even while its creation metadata remains queryable.
- Active inspection returns a stable creation token from the same handle used to observe process state.
- Nonexistent processes return the established absent result while access, wait, and identity failures remain explicit errors.
- Existing Windows Job Object descendant cleanup and packaged guardian behavior remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-windows-guardian-exit-inspection",
  "sourcePr": 565,
  "archive": "openspec/changes/archive/2026-09-23-fix-windows-guardian-exit-inspection/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-23-fix-windows-guardian-exit-inspection/acceptance.md",
  "finalizedDate": "2026-09-23",
  "specBaseSha": "e019d944e52c648153dd0effa0901e9804b1a72d",
  "acceptanceScenarios": [
    "A terminated Windows process object is reported absent even while its creation metadata remains queryable.",
    "Active inspection returns a stable creation token from the same handle used to observe process state.",
    "Nonexistent processes return the established absent result while access, wait, and identity failures remain explicit errors.",
    "Existing Windows Job Object descendant cleanup and packaged guardian behavior remain unchanged."
  ],
  "archiveDigest": "78042b8489287fe8cc7f0ad0b9de4091960c37ca44a6769f9790d6b79708223f",
  "specDigest": "1831299f1de894e872ae75a33ce35e60d1c80314f7a6269b6512ce36ca4faab5",
  "tasksDigest": "255da9a22c8b735903ee70175a200d0e102a0f6fc0fe65ec5dd59b093a6ad66c",
  "evidenceDigest": "65d9b4103653b133e47c913cf042562f082f8e119460e19911471d6afbf514d5",
  "knownGaps": []
}
```
