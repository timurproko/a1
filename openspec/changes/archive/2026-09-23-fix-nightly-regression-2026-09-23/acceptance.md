# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Focused validation passes 103 tests covering the adapter, pull-request discovery, validation planning, and resource-sensitive ownership; the merged platform-contract checks pass another 24 tests.
- Typecheck, architecture governance, strict OpenSpec validation, code-documentation governance, and diff checks pass locally.
- Hosted evidence has independently passed the corrected macOS, Linux, and Windows lanes while narrowing subsequent failures to the fixed validation ownership/contracts recorded in the OpenSpec design.
- The finalized exact-head Full regression remains the required merge gate.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-09-23",
  "sourcePr": 559,
  "archive": "openspec/changes/archive/2026-09-23-fix-nightly-regression-2026-09-23/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-23-fix-nightly-regression-2026-09-23/acceptance.md",
  "finalizedDate": "2026-09-23",
  "specBaseSha": "0ad1ef894f032c10caa830c91c4bd188be8312a7",
  "acceptanceScenarios": [
    "Focused validation passes 103 tests covering the adapter, pull-request discovery, validation planning, and resource-sensitive ownership; the merged platform-contract checks pass another 24 tests.",
    "Typecheck, architecture governance, strict OpenSpec validation, code-documentation governance, and diff checks pass locally.",
    "Hosted evidence has independently passed the corrected macOS, Linux, and Windows lanes while narrowing subsequent failures to the fixed validation ownership/contracts recorded in the OpenSpec design.",
    "The finalized exact-head Full regression remains the required merge gate."
  ],
  "archiveDigest": "9bd2a0b2b5f39fb818d7770ffa86635b7d847dddb2c33bbb898fae747873c059",
  "specDigest": "abbe53067431602ab9a2835e24782ec4bf8a99728c1165e6d9f012957377d949",
  "tasksDigest": "b6b31a073b6eb74ddb4dfe7d0b61af764f02ebc1b02221a64d1f16e6c913a730",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
