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
  "specBaseSha": "88efe404f0790cbbd8fe5259036bd9525941bd73",
  "acceptanceScenarios": [
    "The 2026-11-13 Full regression failure on develop is repaired, and its failed lanes pass on the fix head without weakened assertions, budgets, timeouts, or coverage."
  ],
  "archiveDigest": "00223bc9a4135883a7364b20bc1499fe27aaaa7edd93e4c0b9efaaf3ce961b17",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "adda6ce8604f65ed7a99ad805f744504679183d5f751e55d2b5f635018d93ad7",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
