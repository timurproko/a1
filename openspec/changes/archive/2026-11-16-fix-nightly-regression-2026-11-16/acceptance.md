# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- The 2026-11-16 Full regression failure on develop is repaired, and its failed lanes pass on the fix head without weakened assertions, budgets, timeouts, or coverage.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-11-16",
  "sourcePr": 950,
  "archive": "openspec/changes/archive/2026-11-16-fix-nightly-regression-2026-11-16/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-16-fix-nightly-regression-2026-11-16/acceptance.md",
  "finalizedDate": "2026-11-16",
  "specBaseSha": "58018652bf9de05fa1afcc1cffaf42ccc9e55f2b",
  "acceptanceScenarios": [
    "The 2026-11-16 Full regression failure on develop is repaired, and its failed lanes pass on the fix head without weakened assertions, budgets, timeouts, or coverage."
  ],
  "archiveDigest": "d5504f7143c071721523aba09eb6ff59f38ae5bd142de9c42ca4ec649474cb13",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "a6e6947747eaed12ffedd3cdb14d8b6d49698ec359955212cb40ab8b4d97aabc",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
