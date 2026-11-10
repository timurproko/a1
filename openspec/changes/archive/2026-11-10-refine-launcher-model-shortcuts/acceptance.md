# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Ctrl+M cycles all available models when unscoped or only available scoped models when scoped, without opening a selector or changing the draft.
- Model selection opens the original in-place Models surface without loading or refresh-status text, with search, scope controls, prompt restoration, and transcript interaction intact.
- Ctrl+P opens Launcher without a description and switches among Agent, Settings, Changelog, and Hotkeys while preserving session state.
- Quiet model switches, visible diagnostics, legacy Enter, explicit keybinding overrides, and comparison defaults remain unchanged.
- Hotkeys shows the current shortcuts through Launcher instead of a bare-A1 Agent built-in command, while comparison and extension commands remain available.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "refine-launcher-model-shortcuts",
  "sourcePr": 901,
  "archive": "openspec/changes/archive/2026-11-10-refine-launcher-model-shortcuts/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-10-refine-launcher-model-shortcuts/acceptance.md",
  "finalizedDate": "2026-11-10",
  "specBaseSha": "0786d541a99a4f97166a34a3c1f3ea79097d7ce4",
  "acceptanceScenarios": [
    "Ctrl+M cycles all available models when unscoped or only available scoped models when scoped, without opening a selector or changing the draft.",
    "Model selection opens the original in-place Models surface without loading or refresh-status text, with search, scope controls, prompt restoration, and transcript interaction intact.",
    "Ctrl+P opens Launcher without a description and switches among Agent, Settings, Changelog, and Hotkeys while preserving session state.",
    "Quiet model switches, visible diagnostics, legacy Enter, explicit keybinding overrides, and comparison defaults remain unchanged.",
    "Hotkeys shows the current shortcuts through Launcher instead of a bare-A1 Agent built-in command, while comparison and extension commands remain available."
  ],
  "archiveDigest": "a5b3e37fc206af99e2a6c8abf35ec2953f12a875ac01186c21b93d62f98952bf",
  "specDigest": "5d3b2bbbb930f5d1151532093dd25609d139a34d4aae09151f1375b45cfd4ad2",
  "tasksDigest": "c87a81e729282fa36c036dd15713c4417bc124b79c3c17e9be9b4db7fca6b9c0",
  "evidenceDigest": "67ce2c216a02de8c918e8af00e97377610a84638f341160ead5c8d9e64f044db",
  "knownGaps": []
}
```
