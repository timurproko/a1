# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- On macOS with a stock terminal configuration, Option+1 through Option+0 view tabs one through ten instead of typing symbols into the agent prompt.
- Option+A creates an Agent tab, Option+W closes the tab, Option+Comma opens Settings, and Option+Slash opens Commands, with no character reaching the agent.
- Option characters whose Alt chord is not bound to a tab action, such as Option+P, still type their character.
- After a tab action is rebound, its old Option character types again, and Windows, Linux, and terminals already sending Option as Alt behave as before.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "map-macos-option-shortcuts",
  "sourcePr": 857,
  "archive": "openspec/changes/archive/2026-10-31-map-macos-option-shortcuts/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-31-map-macos-option-shortcuts/acceptance.md",
  "finalizedDate": "2026-10-31",
  "specBaseSha": "a2e98c45364dec69b07a1ae71d3ea20a85feb6f9",
  "acceptanceScenarios": [
    "On macOS with a stock terminal configuration, Option+1 through Option+0 view tabs one through ten instead of typing symbols into the agent prompt.",
    "Option+A creates an Agent tab, Option+W closes the tab, Option+Comma opens Settings, and Option+Slash opens Commands, with no character reaching the agent.",
    "Option characters whose Alt chord is not bound to a tab action, such as Option+P, still type their character.",
    "After a tab action is rebound, its old Option character types again, and Windows, Linux, and terminals already sending Option as Alt behave as before."
  ],
  "archiveDigest": "93c9dd54be31ca53f522db28b56f536be030e4d3bf32c6405fe071b67b3eff83",
  "specDigest": "844961bfa7ebbc6fe88dc59d6d46642c06eb9f1c49f6593832c858fd3e87ecbc",
  "tasksDigest": "ab723452d2ed71fc33f3058b4568db4a3e6c5f036a3725279a7e04b7abaa7f92",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
