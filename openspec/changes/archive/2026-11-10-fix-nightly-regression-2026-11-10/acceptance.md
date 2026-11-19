# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- The 2026-11-10 Full regression failure on develop is repaired, and its failed lanes pass on the fix head without weakened assertions, budgets, timeouts, or coverage.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-11-10",
  "sourcePr": 899,
  "archive": "openspec/changes/archive/2026-11-10-fix-nightly-regression-2026-11-10/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-10-fix-nightly-regression-2026-11-10/acceptance.md",
  "finalizedDate": "2026-11-10",
  "specBaseSha": "e2dd6f6e5e63bb872c7e1a81c0dfe596948ad4cb",
  "acceptanceScenarios": [
    "The 2026-11-10 Full regression failure on develop is repaired, and its failed lanes pass on the fix head without weakened assertions, budgets, timeouts, or coverage."
  ],
  "archiveDigest": "8c184c34ba316796cdf99d4a97e7e0a10d94305dc119b338900354c439e643a7",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "dacb79ced8b85e6c12ef4b817ebfed7ec3341c9366b58a915451322ae24039fd",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
