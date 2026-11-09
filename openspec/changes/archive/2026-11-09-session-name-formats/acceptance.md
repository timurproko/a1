# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Agent settings offers exactly Kebab case, Sentence case, and Title Case for automatic session names, persists the choice, and defaults to Kebab case.
- Automatic names, context-driven replacements, and prompt fallback use the selected format and retain the 16-character limit and naming safety guards.
- Format changes leave existing and manual names untouched, while pending naming results use the latest effective choice without another request.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "session-name-formats",
  "sourcePr": 896,
  "archive": "openspec/changes/archive/2026-11-09-session-name-formats/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-09-session-name-formats/acceptance.md",
  "finalizedDate": "2026-11-09",
  "specBaseSha": "5611d6339b9a320baebd3329b3abd85a810c48f9",
  "acceptanceScenarios": [
    "Agent settings offers exactly Kebab case, Sentence case, and Title Case for automatic session names, persists the choice, and defaults to Kebab case.",
    "Automatic names, context-driven replacements, and prompt fallback use the selected format and retain the 16-character limit and naming safety guards.",
    "Format changes leave existing and manual names untouched, while pending naming results use the latest effective choice without another request."
  ],
  "archiveDigest": "58f1afb33a96a1cd844f9dfe8db6960dc9cb8eed330d13903a4abbd904ecac4c",
  "specDigest": "a128df5512062a23eebbf8635774acae86ae56b78d02c2f4b6d78459953ce734",
  "tasksDigest": "b37164dab9107d8d6df4d07828ec4f489acee93c3ff886265b2567395798b0aa",
  "evidenceDigest": "e9571eb6a01604aaaf7e0dd2c8f0fb301ed399780a5fd86265aa66df6850f026",
  "knownGaps": []
}
```
