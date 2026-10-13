# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- The pinned Pi public API inventory records the tool execution component as a `keyText` consumer.
- The exact public-API baseline check passes on current `develop` without weakened assertions or coverage.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-10-13",
  "sourcePr": 765,
  "archive": "openspec/changes/archive/2026-10-13-fix-nightly-regression-2026-10-13/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-13-fix-nightly-regression-2026-10-13/acceptance.md",
  "finalizedDate": "2026-10-13",
  "specBaseSha": "28678f171444de78e493f207b91880a199de813a",
  "acceptanceScenarios": [
    "The pinned Pi public API inventory records the tool execution component as a `keyText` consumer.",
    "The exact public-API baseline check passes on current `develop` without weakened assertions or coverage."
  ],
  "archiveDigest": "9fbb5cd5be21668d0924ae3634bc1652dae06bb250366c5a33f517595bf4377a",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "9cb8d79710ce0e29e1523641452699363739279dfd87525345d2d36ccd804d23",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
