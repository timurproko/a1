# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Approval prompts use relevant task discussion or current branch hints instead of generic labels such as Implement task.
- Generated names retain up to three explanatory words within 32 characters without using pasted-image paths as subjects.
- Sentence case is first and default while valid saved format choices and manual names remain unchanged.
- Narrow footers reduce detailed statistics before shortening session names and keep model text aligned without wrapping.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "contextual-session-names",
  "sourcePr": 911,
  "archive": "openspec/changes/archive/2026-11-11-contextual-session-names/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-11-contextual-session-names/acceptance.md",
  "finalizedDate": "2026-11-11",
  "specBaseSha": "911ec01eb031c68e1f76faf55222d197f3134f52",
  "acceptanceScenarios": [
    "Approval prompts use relevant task discussion or current branch hints instead of generic labels such as Implement task.",
    "Generated names retain up to three explanatory words within 32 characters without using pasted-image paths as subjects.",
    "Sentence case is first and default while valid saved format choices and manual names remain unchanged.",
    "Narrow footers reduce detailed statistics before shortening session names and keep model text aligned without wrapping."
  ],
  "archiveDigest": "354bbfd9767439bc46181ed6f4a25786f219b7fe4bdd1159ecea03474679a8b9",
  "specDigest": "e8c0957fc412a636954f6c79ee3ac09c5d9e4ff1afe4350111e2b13e5ee594b2",
  "tasksDigest": "7b523a8269aba5b015f95ebe3f09a12e864ad6d1bf1e392b4e43f52ca47d932e",
  "evidenceDigest": "bc3bd2e7b0b3a49b32c5501f4ffb843c0877bff42f27fa0c02a818d9471d65b7",
  "knownGaps": []
}
```
