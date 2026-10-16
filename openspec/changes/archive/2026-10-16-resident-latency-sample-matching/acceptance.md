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
  "specBaseSha": "633517a1c1afc2519b6011204a07cf42fe8e7800",
  "acceptanceScenarios": [
    "The macOS arm64 native terminal host job records all 23 resident input-to-process samples with none rejected, and its p95 is no longer the cold first input.",
    "A recorded negative latency fails its metric and reports the rejected count instead of disappearing from the p95."
  ],
  "archiveDigest": "3793d1390095092a302a2a292e228519cfd4db1c5d63b2f9a4c4b835c518d841",
  "specDigest": "dc3f8a06b5dd6bef00112e1b9def44556f73d17a8722b67482746ae5c6bf21fc",
  "tasksDigest": "6a8271cc47038346d36f3db9ba492aecf2533b5dd361353ae139ed6a1fb7cbc3",
  "evidenceDigest": "20ce2750b4107fbc978373c4752f1f7223b8fbc09af06af400501d3ed59ceed1",
  "knownGaps": []
}
```
