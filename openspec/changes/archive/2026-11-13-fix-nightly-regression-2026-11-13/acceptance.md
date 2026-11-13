# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- The 2026-11-13 Full regression failure on develop is repaired, and its failed lanes pass on the fix head without weakened assertions, budgets, timeouts, or coverage.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-11-13",
  "sourcePr": 920,
  "archive": "openspec/changes/archive/2026-11-13-fix-nightly-regression-2026-11-13/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-13-fix-nightly-regression-2026-11-13/acceptance.md",
  "finalizedDate": "2026-11-13",
  "specBaseSha": "41ab0cfa23a7793ed80bec89aff54c804d8973ec",
  "acceptanceScenarios": [
    "The 2026-11-13 Full regression failure on develop is repaired, and its failed lanes pass on the fix head without weakened assertions, budgets, timeouts, or coverage."
  ],
  "archiveDigest": "099535eb3d8b98df86f1010c032c6d70ac4f3b954a26ebe52274b8a16a7d69b6",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "becb82ec44204943ae1bca36bec25108fa8b1be375e5720bdf468c5142be2d52",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
