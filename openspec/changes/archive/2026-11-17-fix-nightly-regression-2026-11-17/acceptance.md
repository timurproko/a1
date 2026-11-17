# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- The 2026-11-17 Full regression failure on develop is repaired, and its failed lanes pass on the fix head without weakened assertions, budgets, timeouts, or coverage.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-11-17",
  "sourcePr": 964,
  "archive": "openspec/changes/archive/2026-11-17-fix-nightly-regression-2026-11-17/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-17-fix-nightly-regression-2026-11-17/acceptance.md",
  "finalizedDate": "2026-11-17",
  "specBaseSha": "eaf705b9831d1df8389fd0aaab348cd58b41b4d3",
  "acceptanceScenarios": [
    "The 2026-11-17 Full regression failure on develop is repaired, and its failed lanes pass on the fix head without weakened assertions, budgets, timeouts, or coverage."
  ],
  "archiveDigest": "b55c92ae2d0297e27247dc5be0c31f62557cadc3c3516a08b7a1a34633f94187",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "3da90d00da0d3f6a5e3df98896c43b72dc42a664ff068f3497de0294c4200a53",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
