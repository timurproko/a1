# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The multi-process prompt-history concurrency suite executes exactly once in the serial resource-sensitive partition.
- The parallel full-validation remainder excludes the suite while its workload, assertions, 15-second timeout, no-retry behavior, and platform coverage remain unchanged.
- Validation-plan policy rejects missing, duplicate, or parallel placement of the suite.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-10-04",
  "sourcePr": 670,
  "archive": "openspec/changes/archive/2026-10-05-fix-nightly-regression-2026-10-04/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-05-fix-nightly-regression-2026-10-04/acceptance.md",
  "finalizedDate": "2026-10-05",
  "specBaseSha": "7dafde8c3b4a68fbeb99c24e38eea2d35ab20dab",
  "acceptanceScenarios": [
    "The multi-process prompt-history concurrency suite executes exactly once in the serial resource-sensitive partition.",
    "The parallel full-validation remainder excludes the suite while its workload, assertions, 15-second timeout, no-retry behavior, and platform coverage remain unchanged.",
    "Validation-plan policy rejects missing, duplicate, or parallel placement of the suite."
  ],
  "archiveDigest": "551df4509714a5a696d229b79e5edbda4a4aba9bb7726c77a5f5a4672ee1ce89",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "456d6cdebba6bc220872916667304e3e8975bc42f4876d687399bb70a5406fd9",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
