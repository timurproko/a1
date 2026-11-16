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
- When shown, the provider follows the model as model [provider] before the thinking level; model and provider share one hover/click target, separate from thinking.
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
    "When shown, the provider follows the model as model [provider] before the thinking level; model and provider share one hover/click target, separate from thinking.",
    "Comparison-profile behavior and unrelated workflow feedback remain unchanged."
  ],
  "archiveDigest": "a2156b192fe0a7aa3d5497bfb4c384edcaa084d31e187a2ba6016aafec4ea459",
  "specDigest": "ec28ad6cc5f0453f39b59825d9e4259008f50f2c0a4f0dba827359311bb27e5f",
  "tasksDigest": "0772dbc107a88b424cbff18c915819fcdcef7ed0ba14bc3ec5a305df767bb04a",
  "evidenceDigest": "f2bc509f32edd23272ad52ab2bde6d125b45c0e1f551d8e20483ed05906f78cb",
  "knownGaps": []
}
```
