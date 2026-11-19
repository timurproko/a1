# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- In a resident multi-agent tab, an unaccepted contextual prompt suggestion appears dim rather than white
- Pressing Tab accepts the suggestion and it then shows at the same normal intensity as typed prompt text
- Switching away from the tab and back, or reattaching to it, keeps an unaccepted suggestion dim
- Selecting text that includes a dim suggestion shows the uniform selection highlight, and text after the selection keeps its own intensity

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-multiagent-suggestion-dimming",
  "sourcePr": 780,
  "archive": "openspec/changes/archive/2026-10-16-fix-multiagent-suggestion-dimming/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-16-fix-multiagent-suggestion-dimming/acceptance.md",
  "finalizedDate": "2026-10-16",
  "specBaseSha": "8ae9a4d20f67292a5e86de6733c5e867e95a7351",
  "acceptanceScenarios": [
    "In a resident multi-agent tab, an unaccepted contextual prompt suggestion appears dim rather than white",
    "Pressing Tab accepts the suggestion and it then shows at the same normal intensity as typed prompt text",
    "Switching away from the tab and back, or reattaching to it, keeps an unaccepted suggestion dim",
    "Selecting text that includes a dim suggestion shows the uniform selection highlight, and text after the selection keeps its own intensity"
  ],
  "archiveDigest": "96ba72c14c34f8db865b616a956490870d7a5d66c402bfa47f19a7549aaae0be",
  "specDigest": "ba05415a688dc2bc1292f8ad28dcb91cb662ca7e306129e9f0fcbc541e0c74d2",
  "tasksDigest": "6c6c30a0d5f71a3f43ff224bf5cbfe8978dbe47fa2e0fbc2013dfe271810d2c4",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
