# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Stream frame counting is unaffected by independently scheduled lifecycle status rendering.
- Burst updates remain bounded to one cadence frame, immediate input leaves no stale stream frame, and final content flushes exactly one frame.
- Same-head finalization uses current lifecycle metadata, while drifted or unavailable pull-request identity fails closed.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-09-24",
  "sourcePr": 581,
  "archive": "openspec/changes/archive/2026-09-24-fix-nightly-regression-2026-09-24/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-24-fix-nightly-regression-2026-09-24/acceptance.md",
  "finalizedDate": "2026-09-24",
  "specBaseSha": "126d5c23a3945e1a77aed127088d106b43c9b4d4",
  "acceptanceScenarios": [
    "Stream frame counting is unaffected by independently scheduled lifecycle status rendering.",
    "Burst updates remain bounded to one cadence frame, immediate input leaves no stale stream frame, and final content flushes exactly one frame.",
    "Same-head finalization uses current lifecycle metadata, while drifted or unavailable pull-request identity fails closed."
  ],
  "archiveDigest": "eb372d869e372c9fc7c2fdcc94faa7e2e9aff16d3744ee19a10d4baf35323750",
  "specDigest": "a9ff9e01463f658debe738ae3856f6bf7617e213c3ec216b619303005c2062a5",
  "tasksDigest": "ecaaa7d0d38bb35a45e0c2fd3c0f1d4c46a2620616721e72a0153996c25b7789",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
