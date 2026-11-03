# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Models-dialog selection changes only the active session model while preserving the saved default and model scope behavior.
- Settings places `Default model` above per-model thinking, uses concise rows with a green persisted-default checkmark, and closes the selector immediately when Enter starts background persistence.
- A fresh Agent tab immediately previews and starts on the authenticated persisted default even when it is outside `enabledModels`, while its cycling scope remains unchanged.
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
    "A fresh Agent tab immediately previews and starts on the authenticated persisted default even when it is outside `enabledModels`, while its cycling scope remains unchanged.",
    "Failed default-model persistence reopens the preserved selector with an error and retains the prior default, while the comparison profile keeps its existing model-selection behavior."
  ],
  "archiveDigest": "a1b45dc2a01e02a65119cea684390d67c18fddee36b980fdc655662aab0c7290",
  "specDigest": "ed9222732974e7737808ad79564a2bb37098b2f7004e7431f0479427d8e72ac6",
  "tasksDigest": "c4bee5452ad5b54c0398aa113a5998443820c0a3abd20eff09ddb4d746168332",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
