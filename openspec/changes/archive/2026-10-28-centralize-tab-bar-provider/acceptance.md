# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Agent, Settings, and Changelog behavior comes from one shared tab-kind provider.
- New and newly revealed tabs append after existing visible tabs while selected and dragged tabs retain their slots.
- Editor-owned prompt word and line selection remains highlighted without changing the clipboard on release.
- Pasting replaces the selected prompt text with the clipboard content that existed before target selection.
- Explicit prompt copy and cut retain their exact-text behavior and selection handling.
- Complete-frame transcript, prompt-row, application-message, and status selection still honors Copy on select.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "centralize-tab-bar-provider",
  "sourcePr": 847,
  "archive": "openspec/changes/archive/2026-10-28-centralize-tab-bar-provider/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-28-centralize-tab-bar-provider/acceptance.md",
  "finalizedDate": "2026-10-28",
  "specBaseSha": "81d81ade9416f501305300eafaafd2972b0efafb",
  "acceptanceScenarios": [
    "Agent, Settings, and Changelog behavior comes from one shared tab-kind provider.",
    "New and newly revealed tabs append after existing visible tabs while selected and dragged tabs retain their slots.",
    "Editor-owned prompt word and line selection remains highlighted without changing the clipboard on release.",
    "Pasting replaces the selected prompt text with the clipboard content that existed before target selection.",
    "Explicit prompt copy and cut retain their exact-text behavior and selection handling.",
    "Complete-frame transcript, prompt-row, application-message, and status selection still honors Copy on select."
  ],
  "archiveDigest": "5921a9446f59772ffe9518d3e78964bf8cf650cbf1d8716219b5802956eb2234",
  "specDigest": "59eb3a02d18f3325e141819b3e9a836bba0099bf690467e1dc8ba5cce39138ed",
  "tasksDigest": "ea7786e70fc9162d979a9d59002017f5a1a67a9961b8bb35530b87befbec94fd",
  "evidenceDigest": "e7e75eaed12f6b89d853fbae3b70716b4a93af2957f7ff7ef393ed3b3f1d6ee4",
  "knownGaps": []
}
```
