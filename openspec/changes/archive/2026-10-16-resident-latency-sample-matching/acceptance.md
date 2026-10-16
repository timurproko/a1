# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- The macOS arm64 native terminal host job records all 23 resident input-to-process samples with none rejected, and its p95 is no longer the cold first input.
- A recorded negative latency fails its metric and reports the rejected count instead of disappearing from the p95.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "resident-latency-sample-matching",
  "sourcePr": 785,
  "archive": "openspec/changes/archive/2026-10-16-resident-latency-sample-matching/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-16-resident-latency-sample-matching/acceptance.md",
  "finalizedDate": "2026-10-16",
  "specBaseSha": "8ae9a4d20f67292a5e86de6733c5e867e95a7351",
  "acceptanceScenarios": [
    "The macOS arm64 native terminal host job records all 23 resident input-to-process samples with none rejected, and its p95 is no longer the cold first input.",
    "A recorded negative latency fails its metric and reports the rejected count instead of disappearing from the p95."
  ],
  "archiveDigest": "3793d1390095092a302a2a292e228519cfd4db1c5d63b2f9a4c4b835c518d841",
  "specDigest": "1dae82b08c58e66603f096f3f426435df5503dcc180524719362ad18b29cfae7",
  "tasksDigest": "6a8271cc47038346d36f3db9ba492aecf2533b5dd361353ae139ed6a1fb7cbc3",
  "evidenceDigest": "20ce2750b4107fbc978373c4752f1f7223b8fbc09af06af400501d3ed59ceed1",
  "knownGaps": []
}
```
