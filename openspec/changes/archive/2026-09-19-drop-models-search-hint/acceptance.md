# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- In bare A1, typing `/mod` shows the `models` entry with only its description and no search placeholder; `a1 pi` still shows the pinned `model` entry with its provider-and-model placeholder.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "drop-models-search-hint",
  "sourcePr": 516,
  "archive": "openspec/changes/archive/2026-09-19-drop-models-search-hint/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-19-drop-models-search-hint/acceptance.md",
  "finalizedDate": "2026-09-19",
  "specBaseSha": "23bea061139bca3d77285a0dae7756fbdb8dacb0",
  "acceptanceScenarios": [
    "In bare A1, typing `/mod` shows the `models` entry with only its description and no search placeholder; `a1 pi` still shows the pinned `model` entry with its provider-and-model placeholder."
  ],
  "archiveDigest": "dd94413a720507f85a16bb1512dbbc3230bbeab3449960f2a7be7c2f5001ba77",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "ccd95f46e855f099e75ec091ed827118b830430b6166af3a37e0fd0cbd616f63",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
