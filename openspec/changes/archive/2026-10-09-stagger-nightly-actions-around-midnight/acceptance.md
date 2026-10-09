# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Pi upstream sync and Full regression retain daily cadence at 23:23 and 23:47 UTC.
- Nightly development publication and OpenSpec archive reconciliation retain daily cadence at 00:17 and 00:43 UTC.
- Every scheduled workflow keeps a distinct non-zero minute offset while its non-schedule behavior remains unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "stagger-nightly-actions-around-midnight",
  "sourcePr": 728,
  "archive": "openspec/changes/archive/2026-10-09-stagger-nightly-actions-around-midnight/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-09-stagger-nightly-actions-around-midnight/acceptance.md",
  "finalizedDate": "2026-10-09",
  "specBaseSha": "f9441d6824709f9118627974998bd2231da60d05",
  "acceptanceScenarios": [
    "Pi upstream sync and Full regression retain daily cadence at 23:23 and 23:47 UTC.",
    "Nightly development publication and OpenSpec archive reconciliation retain daily cadence at 00:17 and 00:43 UTC.",
    "Every scheduled workflow keeps a distinct non-zero minute offset while its non-schedule behavior remains unchanged."
  ],
  "archiveDigest": "3a25d8a7c888b65eb8203493446661832849fa07e31a6ad145932bd2395c9005",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "dd0d8f0866cd1b5de7b7151133e8781cae65fe8eefb6cef7f65431fc05f925c8",
  "evidenceDigest": "e1d5b895f7ce57cd146b6a880f815e29d402da6d1e61d8576791f76c96e24464",
  "knownGaps": []
}
```
