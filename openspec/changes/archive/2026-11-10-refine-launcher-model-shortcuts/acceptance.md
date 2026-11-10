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
  "archiveDigest": "c22079f0511979c15b70c85177ef54b0c4c7dde44d8bb6b108418f0c8ee9a677",
  "specDigest": "5d3b2bbbb930f5d1151532093dd25609d139a34d4aae09151f1375b45cfd4ad2",
  "tasksDigest": "fd55cef315305a991bf0ca5abf02c03ab6d3eca8a6e7315be86b6b7f0e77b071",
  "evidenceDigest": "c49dae801add9a2b3181df430ed299e7d097bf86272b9c16288beca48051dddd",
  "knownGaps": []
}
```
