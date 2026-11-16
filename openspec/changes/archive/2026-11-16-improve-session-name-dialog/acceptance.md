# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Opening Session Name shows the current name with the caret at the end; unnamed sessions start empty.
- Mouse selection and Ctrl+A, Ctrl+Z, Ctrl+X, Ctrl+C, and Ctrl+V edit the name using prompt-matching selection colors without extra footer hints.
- Hovering the footer name highlights only its visible cells; right-click opens a compact pre-pivot-styled Edit menu.
- Choosing Edit preserves the unsent prompt and attachments through name submission or cancellation without sending a model prompt.
- Direct naming, comparison-profile behavior, and unrelated dialogs remain unchanged.

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
    "Opening Session Name shows the current name with the caret at the end; unnamed sessions start empty.",
    "Mouse selection and Ctrl+A, Ctrl+Z, Ctrl+X, Ctrl+C, and Ctrl+V edit the name using prompt-matching selection colors without extra footer hints.",
    "Hovering the footer name highlights only its visible cells; right-click opens a compact pre-pivot-styled Edit menu.",
    "Choosing Edit preserves the unsent prompt and attachments through name submission or cancellation without sending a model prompt.",
    "Direct naming, comparison-profile behavior, and unrelated dialogs remain unchanged."
  ],
  "archiveDigest": "d55d03b824d44def4bac933174cfbc6a253113686bda5e731818830865f4b3ab",
  "specDigest": "c4466e522c510b1a2d7abbaa4e0036c53dbee7b2e2030ecbc6a930a8dd7727dd",
  "tasksDigest": "43eff144a211e10b8dd3444ee5a69559c84e3112725bea2741fb7a883ba55a30",
  "evidenceDigest": "bc286e30d029d7bbe8d3eb74f057e0878d1a5755b6c1ede439190bbea6cbfd29",
  "knownGaps": []
}
```
