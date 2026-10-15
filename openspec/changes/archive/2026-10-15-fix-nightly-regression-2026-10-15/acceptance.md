# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- The 2026-10-15 Full regression failure on develop is repaired, and its failed lanes pass on the fix head without weakened assertions, budgets, timeouts, or coverage.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-10-15",
  "sourcePr": 768,
  "archive": "openspec/changes/archive/2026-10-15-fix-nightly-regression-2026-10-15/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-15-fix-nightly-regression-2026-10-15/acceptance.md",
  "finalizedDate": "2026-10-15",
  "specBaseSha": "96e54a0afde25dbd7f8a6c098ff196a7e63989a4",
  "acceptanceScenarios": [
    "The 2026-10-15 Full regression failure on develop is repaired, and its failed lanes pass on the fix head without weakened assertions, budgets, timeouts, or coverage."
  ],
  "archiveDigest": "352f107b614b8097bd3e7b43eb3fcd1199a9013b873e1e23723446173d8647dc",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "d14fa3549f78a3e7fc710a14a675c1377117cc56857fdf4dbe85c0e470691045",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
