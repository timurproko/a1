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
  "specBaseSha": "f6f04f45d0f409115d3ba12817e6883596becae5",
  "acceptanceScenarios": [
    "A session started without settings uses the blue accent declared as the default.",
    "Changing the declared accent default also changes the settings-less accent, with no second value to update."
  ],
  "archiveDigest": "212502238eb5cd3ac956c1802951defe29ab5b70d0dab7e066757e8fb74b98c3",
  "specDigest": "25658847e71ca7d840079d7c42da2deebe56b564b00d35d6b6e4a9f5f9801f28",
  "tasksDigest": "467e43b004be39e11d734d7074fad8a3139356e738fc6220bcd0c8003954998b",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
