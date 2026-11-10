# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Ctrl+M cycles all available models when unscoped or only available scoped models when scoped, without opening a selector or changing the draft.
- Model selection uses the original in-place Models surface with search, scope controls, prompt restoration, and transcript interaction intact.
- Ctrl+P opens Launcher without a description and switches among Agent, Settings, and Changelog while preserving session state.
- Quiet model switches, visible diagnostics, legacy Enter, explicit keybinding overrides, and comparison defaults remain unchanged.

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
    "Model selection uses the original in-place Models surface with search, scope controls, prompt restoration, and transcript interaction intact.",
    "Ctrl+P opens Launcher without a description and switches among Agent, Settings, and Changelog while preserving session state.",
    "Quiet model switches, visible diagnostics, legacy Enter, explicit keybinding overrides, and comparison defaults remain unchanged."
  ],
  "archiveDigest": "33fc602f58230d5676808792c1b5ef9f5ea11d24083b37c08cf686542015cdec",
  "specDigest": "94b53860eaef82d90db8d7d03e2d0951b9ae7a513177d3e15b6fc3eda92fc23b",
  "tasksDigest": "fbab4bd715d76cc51abf8bb213783291e53832ea8c9deff1647da347331de298",
  "evidenceDigest": "b9f057cd377f07e2730c01464a1315a55b25750dfb390b8c9bc0bc0184786943",
  "knownGaps": []
}
```
