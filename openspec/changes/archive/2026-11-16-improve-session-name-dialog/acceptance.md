# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Opening Session Name fully selects the current name for immediate replacement; unnamed sessions start empty.
- Drag, double-click word selection, triple-click full-name selection, and Ctrl+A, Ctrl+Z, Ctrl+X, Ctrl+C, and Ctrl+V use prompt-matching selection colors without extra hints.
- Footer name, model, and thinking controls highlight only their visible text and directly open their corresponding dialogs on normal left-click without a context menu.
- Footer-opened dialogs preserve unsent prompt text and attachments through submission or cancellation without sending a model prompt.
- Successful bare-A1 renaming updates the footer and terminal title without an extra success message; genuine errors remain visible.
- The thinking level remains visible in the footer while its dialog is open; saving a default alone does not change the active level.
- Footer controls remain hoverable over dock dialogs; the same control cancels like Escape, while a different control replaces the dialog without saving unsent edits.
- When shown, the provider follows the model as model [provider] before the thinking level, matching the Models dialog.
- Comparison-profile behavior and unrelated workflow feedback remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "improve-session-name-dialog",
  "sourcePr": 960,
  "archive": "openspec/changes/archive/2026-11-16-improve-session-name-dialog/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-16-improve-session-name-dialog/acceptance.md",
  "finalizedDate": "2026-11-16",
  "specBaseSha": "9c9745533e01ff07560b64f8080e62c23dd8315a",
  "acceptanceScenarios": [
    "Opening Session Name fully selects the current name for immediate replacement; unnamed sessions start empty.",
    "Drag, double-click word selection, triple-click full-name selection, and Ctrl+A, Ctrl+Z, Ctrl+X, Ctrl+C, and Ctrl+V use prompt-matching selection colors without extra hints.",
    "Footer name, model, and thinking controls highlight only their visible text and directly open their corresponding dialogs on normal left-click without a context menu.",
    "Footer-opened dialogs preserve unsent prompt text and attachments through submission or cancellation without sending a model prompt.",
    "Successful bare-A1 renaming updates the footer and terminal title without an extra success message; genuine errors remain visible.",
    "The thinking level remains visible in the footer while its dialog is open; saving a default alone does not change the active level.",
    "Footer controls remain hoverable over dock dialogs; the same control cancels like Escape, while a different control replaces the dialog without saving unsent edits.",
    "When shown, the provider follows the model as model [provider] before the thinking level, matching the Models dialog.",
    "Comparison-profile behavior and unrelated workflow feedback remain unchanged."
  ],
  "archiveDigest": "15833a707697738578e6a04e8bc2269f2c76924faa245277a8fc742af5c60bf6",
  "specDigest": "01fb07458696beea5bb1bc4606184cb3746079cad5abe1e0e3ac1df50171fe88",
  "tasksDigest": "26f1a06a1c4a57309b8e7679939b6749de8b026c6b9f14775d3e84ef4b5a6a55",
  "evidenceDigest": "c37fb10f581e9f42a87d88bc0a9b3637c7ca153a9f1534d469056c6378da74c1",
  "knownGaps": []
}
```
