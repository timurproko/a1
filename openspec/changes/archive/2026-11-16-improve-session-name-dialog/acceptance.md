# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Opening Session Name fully selects the current name for immediate replacement; unnamed sessions start empty.
- Drag, double-click word selection, triple-click full-name selection, and Ctrl+A, Ctrl+Z, Ctrl+X, Ctrl+C, and Ctrl+V use prompt-matching selection colors without extra hints.
- Footer name, model, and thinking controls highlight only their visible text and directly open their corresponding dialogs on normal left-click without a context menu.
- Footer-opened dialogs preserve unsent prompt text and attachments through submission or cancellation without sending a model prompt.
- Successful bare-A1 renaming updates the footer and terminal title without an extra success message; genuine errors remain visible.
- The thinking level remains visible in the footer while its dialog is open; saving a default alone does not change the active level.
- Footer controls remain hoverable over dock dialogs, and another click cancels the dialog like Escape without saving unsent edits.
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
    "Footer controls remain hoverable over dock dialogs, and another click cancels the dialog like Escape without saving unsent edits.",
    "Comparison-profile behavior and unrelated workflow feedback remain unchanged."
  ],
  "archiveDigest": "8426b389b959d99e562e9645c3411947b41c727440cbec1e71f9d09a23900673",
  "specDigest": "2ad8138461b92f6a3fd030c95d52e69e6a1b642773f62b21b0664848bdf8a9c9",
  "tasksDigest": "5fe4d73372a1d02c26c8bd1ef5ee8c2149bfb008c0efc7d313159088989f8946",
  "evidenceDigest": "3c2272e6820cac238017b529dc50bc6aab40cb0e7fb2cd3dc60c6e954b1ff3ff",
  "knownGaps": []
}
```
