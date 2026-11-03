# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Models-dialog selection changes only the active session model while preserving the saved default and model scope behavior.
- Settings places `Default model` above per-model thinking, uses concise rows with a green persisted-default checkmark, and closes the selector immediately when Enter starts background persistence.
- A fresh Agent tab starts on the authenticated persisted default even when it is outside `enabledModels`, while its cycling scope remains unchanged.
- Failed default-model persistence reopens the preserved selector with an error and retains the prior default, while the comparison profile keeps its existing model-selection behavior.

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
    "Settings places `Default model` above per-model thinking, uses concise rows with a green persisted-default checkmark, and closes the selector immediately when Enter starts background persistence.",
    "A fresh Agent tab starts on the authenticated persisted default even when it is outside `enabledModels`, while its cycling scope remains unchanged.",
    "Failed default-model persistence reopens the preserved selector with an error and retains the prior default, while the comparison profile keeps its existing model-selection behavior."
  ],
  "archiveDigest": "00729e57ba29d996f4bb70b2dac0d17429c3d1c3b541d9eb45e4095afc32dc8e",
  "specDigest": "858bf1c89738220db19aba536f318f868e28bfa0bfaebe1f9f1a791bea665de5",
  "tasksDigest": "6a35c3b9f4d52d0940810ff5dd257164b89c5c444223858de3ff65725319b2cc",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
