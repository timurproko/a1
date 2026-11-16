# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Opening Session Name fully selects the current name for immediate replacement; unnamed sessions start empty.
- Drag, double-click word selection, triple-click full-name selection, and Ctrl+A, Ctrl+Z, Ctrl+X, Ctrl+C, and Ctrl+V use prompt-matching selection colors without extra hints.
- Footer name, model, and thinking controls have one-cell side hover padding and directly open their corresponding dialogs on normal left-click without a context menu.
- Footer-opened dialogs preserve unsent prompt text and attachments through submission or cancellation without sending a model prompt.
- Successful bare-A1 renaming updates the footer and terminal title without an extra success message; genuine errors remain visible.
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
  "specBaseSha": "fb28fb83b581079a590b68c5d9c36ff91a9bc33f",
  "acceptanceScenarios": [
    "Opening Session Name fully selects the current name for immediate replacement; unnamed sessions start empty.",
    "Drag, double-click word selection, triple-click full-name selection, and Ctrl+A, Ctrl+Z, Ctrl+X, Ctrl+C, and Ctrl+V use prompt-matching selection colors without extra hints.",
    "Footer name, model, and thinking controls have one-cell side hover padding and directly open their corresponding dialogs on normal left-click without a context menu.",
    "Footer-opened dialogs preserve unsent prompt text and attachments through submission or cancellation without sending a model prompt.",
    "Successful bare-A1 renaming updates the footer and terminal title without an extra success message; genuine errors remain visible.",
    "Comparison-profile behavior and unrelated workflow feedback remain unchanged."
  ],
  "archiveDigest": "9e42776490cefb5b8deda6cf5455a173d3fde58d0530c3e727508cef2bda46bf",
  "specDigest": "800935a76369ca677ba2b772ed3325a380277ab5260819a7c4109fd1bf6f98f5",
  "tasksDigest": "5354925ac93e32894664ca34abd8ef503e48247877dd430620071f6b54e2f645",
  "evidenceDigest": "8b3c2242e2d9a1e4af644bdd5a50f06ce41cd14de914f7b1077501aa0b867011",
  "knownGaps": []
}
```
