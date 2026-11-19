# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Strict OpenSpec validation of the change passes and the deltas apply with 8 added, 19 modified and 16 removed requirements.
- After the archive is applied, the docs governance, package identity, naming, documentation and architecture checks pass.
- No source or workflow file changes; only the OpenSpec change and two governance record files under config.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "refresh-cli-specs",
  "sourcePr": 989,
  "archive": "openspec/changes/archive/2026-11-19-refresh-cli-specs/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-19-refresh-cli-specs/acceptance.md",
  "finalizedDate": "2026-11-19",
  "specBaseSha": "2a4504856f4f0cc9fdcbbb9da8556de7cbcedebd",
  "acceptanceScenarios": [
    "Strict OpenSpec validation of the change passes and the deltas apply with 8 added, 19 modified and 16 removed requirements.",
    "After the archive is applied, the docs governance, package identity, naming, documentation and architecture checks pass.",
    "No source or workflow file changes; only the OpenSpec change and two governance record files under config."
  ],
  "archiveDigest": "e7b8de7f4c84f1f817f85efbe0175f1698c2c10a6e346abb36f8a48da70c31fb",
  "specDigest": "fad2113382cdb18db5ab92621beba822acc34c1f9d6c644a022d621147797caf",
  "tasksDigest": "c15432ab93c281f669d151488253e02d25700582b2fbe9600572e15e590bb6d1",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
