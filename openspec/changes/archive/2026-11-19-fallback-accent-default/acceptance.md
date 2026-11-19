# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A session started without settings uses the blue accent declared as the default.
- Changing the declared accent default also changes the settings-less accent, with no second value to update.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fallback-accent-default",
  "sourcePr": 995,
  "archive": "openspec/changes/archive/2026-11-19-fallback-accent-default/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-19-fallback-accent-default/acceptance.md",
  "finalizedDate": "2026-11-19",
  "specBaseSha": "25d2964c846951c1b10453877c9177c680859df2",
  "acceptanceScenarios": [
    "A session started without settings uses the blue accent declared as the default.",
    "Changing the declared accent default also changes the settings-less accent, with no second value to update."
  ],
  "archiveDigest": "b903f72c5fe2a03466277eb74aa298a230968aa412c2a49701616dfba2739324",
  "specDigest": "25658847e71ca7d840079d7c42da2deebe56b564b00d35d6b6e4a9f5f9801f28",
  "tasksDigest": "467e43b004be39e11d734d7074fad8a3139356e738fc6220bcd0c8003954998b",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
