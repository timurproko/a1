# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Models-dialog selection changes only the active session model while preserving the saved default and model scope behavior.
- Settings places `Default model` above per-model thinking and uses concise model rows with a green persisted-default checkmark after the provider.
- Failed default-model persistence retains the prior default and selector state, while the comparison profile keeps its existing model-selection behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "separate-current-and-default-model-selection",
  "sourcePr": 862,
  "archive": "openspec/changes/archive/2026-11-03-separate-current-and-default-model-selection/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-03-separate-current-and-default-model-selection/acceptance.md",
  "finalizedDate": "2026-11-03",
  "specBaseSha": "ebe579aafe67e84a7d77b1769d8e8a972d5a30dc",
  "acceptanceScenarios": [
    "Models-dialog selection changes only the active session model while preserving the saved default and model scope behavior.",
    "Settings places `Default model` above per-model thinking and uses concise model rows with a green persisted-default checkmark after the provider.",
    "Failed default-model persistence retains the prior default and selector state, while the comparison profile keeps its existing model-selection behavior."
  ],
  "archiveDigest": "62f487ec56bfa2de49d1157987e0ee41f25f7eab882191c43968e9e5914d479e",
  "specDigest": "e6d598d81ce7eb54c2c31cacd985f97d5a7aefd7f5e9c53c112a9cf4040160ba",
  "tasksDigest": "7182d9e68134dbcf88c99d5c8c635328590966cc2f4d3fe763c4557c73aa947d",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
