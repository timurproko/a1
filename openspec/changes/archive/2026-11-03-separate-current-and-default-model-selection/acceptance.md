# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Models-dialog selection changes only the active session model while preserving the saved default and model scope behavior.
- Settings provides a searchable authenticated-model configurator that persists the default for future sessions without changing the active model or thinking state.
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
    "Settings provides a searchable authenticated-model configurator that persists the default for future sessions without changing the active model or thinking state.",
    "Failed default-model persistence retains the prior default and selector state, while the comparison profile keeps its existing model-selection behavior."
  ],
  "archiveDigest": "df21bc6f4347ec9b4010d213d12f832285f1ef5bd3d0b929087a7f22e2bd4d0e",
  "specDigest": "0f16f2b83efaf19b66e1ce64c6243d6c4fb4d9b8ef6d5241a7e15a198bf01fb4",
  "tasksDigest": "b45b6fbf40fcc60f276afe1fa069a6b5982d46a5ebf00036c426076f45a173c4",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
