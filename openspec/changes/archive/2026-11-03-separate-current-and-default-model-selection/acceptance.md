# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Models-dialog selection changes only the active session model while preserving the saved default and model scope behavior.
- Settings places `Default model` above per-model thinking, uses concise rows with a green persisted-default checkmark, and closes the selector immediately when Enter starts background persistence.
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
    "Failed default-model persistence reopens the preserved selector with an error and retains the prior default, while the comparison profile keeps its existing model-selection behavior."
  ],
  "archiveDigest": "3bb4b6a81d6ec99b7ddf2a1b3d736288183d55148f6c1c7bffa8f138f22e507f",
  "specDigest": "0c9429bea825beae53d350d878eb71e4adeaade86a895f36eef0c3855bc6c732",
  "tasksDigest": "248d7c7f00fd6b113b9be44beaa7b9c55a65b1f0be969c2f155bc0dc914dfaba",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
