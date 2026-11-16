# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Predecessor updates completing after two minutes but within five minutes continue through exact-candidate manifest and launcher checks.
- Updates still incomplete at five minutes fail with retained diagnostics and fixture-process settlement, without trusting partial target files.
- Generic timeouts never authorize installer recovery, and failed smoke lanes continue to block public tag promotion.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "budget-published-predecessor-replacement",
  "sourcePr": 957,
  "archive": "openspec/changes/archive/2026-11-16-budget-published-predecessor-replacement/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-16-budget-published-predecessor-replacement/acceptance.md",
  "finalizedDate": "2026-11-16",
  "specBaseSha": "74fd89ed496e40947c30fd5a6bffb14eb8ef07fc",
  "acceptanceScenarios": [
    "Predecessor updates completing after two minutes but within five minutes continue through exact-candidate manifest and launcher checks.",
    "Updates still incomplete at five minutes fail with retained diagnostics and fixture-process settlement, without trusting partial target files.",
    "Generic timeouts never authorize installer recovery, and failed smoke lanes continue to block public tag promotion."
  ],
  "archiveDigest": "7441d676342e6e7cafc149111b40d69de1d3fdcbd449f68b039861d26b0be017",
  "specDigest": "6b1adacbb370920a0db41f1a921165abe9a6a97b7973615481fd8bf2a7e3a9bd",
  "tasksDigest": "9e6e08c247ea5a935cbd964bddad5a11bac19836c823b26b16cb31d1c97ec486",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
