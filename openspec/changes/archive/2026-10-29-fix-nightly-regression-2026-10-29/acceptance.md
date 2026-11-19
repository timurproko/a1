# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- The 2026-10-29 Full regression failure on develop is repaired, and its failed lanes pass on the fix head without weakened assertions, budgets, timeouts, or coverage.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-10-29",
  "sourcePr": 850,
  "archive": "openspec/changes/archive/2026-10-29-fix-nightly-regression-2026-10-29/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-29-fix-nightly-regression-2026-10-29/acceptance.md",
  "finalizedDate": "2026-10-29",
  "specBaseSha": "fa2d540083a2fa65f89e2a4969966d994998acee",
  "acceptanceScenarios": [
    "The 2026-10-29 Full regression failure on develop is repaired, and its failed lanes pass on the fix head without weakened assertions, budgets, timeouts, or coverage."
  ],
  "archiveDigest": "0de50e5add226f899d101aec7d004e362fc84448926de295347ce08060feb861",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "dacb79ced8b85e6c12ef4b817ebfed7ec3341c9366b58a915451322ae24039fd",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
