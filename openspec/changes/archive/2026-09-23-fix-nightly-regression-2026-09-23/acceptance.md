# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The full-release plan now emits `--maxWorkers=2` only for the complete ordinary partition and records matching structured evidence.
- Focused validation passed 80 tests covering tier planning, full-regression policy, suite/resource partitioning, and OpenSpec acceptance policy; typecheck, strict OpenSpec validation, and code-documentation governance also passed.
- The change preserves the existing forty-minute lane timeout and does not remove, retry, or reclassify any regression test.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-09-23",
  "sourcePr": 559,
  "archive": "openspec/changes/archive/2026-09-23-fix-nightly-regression-2026-09-23/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-23-fix-nightly-regression-2026-09-23/acceptance.md",
  "finalizedDate": "2026-09-23",
  "specBaseSha": "e019d944e52c648153dd0effa0901e9804b1a72d",
  "acceptanceScenarios": [
    "The full-release plan now emits `--maxWorkers=2` only for the complete ordinary partition and records matching structured evidence.",
    "Focused validation passed 80 tests covering tier planning, full-regression policy, suite/resource partitioning, and OpenSpec acceptance policy; typecheck, strict OpenSpec validation, and code-documentation governance also passed.",
    "The change preserves the existing forty-minute lane timeout and does not remove, retry, or reclassify any regression test."
  ],
  "archiveDigest": "fc92d439a2d5710de3de8d13ad2003173e7f1015470cc9e5ce3085d75892140e",
  "specDigest": "8b81f771ce27622cc296f5673905314c2d62a7a1127fef80347c68a3d6698592",
  "tasksDigest": "bafa6c584e9dc2d059fcf2c73c9cf7fae71210e445a1ec1c0fec3ff5d3c35f3b",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
