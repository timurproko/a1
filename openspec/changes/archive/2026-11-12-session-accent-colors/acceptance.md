# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Both color menus offer blue, green, orange, pink, purple, cyan, and neutral grey in order without an automatic option.
- Default color persists for future session starts while Current color changes only the selected live session.
- New and resumed sessions initialize from the latest saved default, falling back to blue, without restoring an ephemeral current override.
- External applications list colors and get or set one exact live session through always-JSON commands without a format flag.
- Invalid, expired, ambiguous, stopped, and replaced targets fail explicitly without changing a peer or replaying a delayed request.
- The comparison profile and unrelated shared settings retain their existing behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "session-accent-colors",
  "sourcePr": 917,
  "archive": "openspec/changes/archive/2026-11-12-session-accent-colors/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-12-session-accent-colors/acceptance.md",
  "finalizedDate": "2026-11-12",
  "specBaseSha": "d1c71410f84da2a8f2de7adb73847ac28984242a",
  "acceptanceScenarios": [
    "Both color menus offer blue, green, orange, pink, purple, cyan, and neutral grey in order without an automatic option.",
    "Default color persists for future session starts while Current color changes only the selected live session.",
    "New and resumed sessions initialize from the latest saved default, falling back to blue, without restoring an ephemeral current override.",
    "External applications list colors and get or set one exact live session through always-JSON commands without a format flag.",
    "Invalid, expired, ambiguous, stopped, and replaced targets fail explicitly without changing a peer or replaying a delayed request.",
    "The comparison profile and unrelated shared settings retain their existing behavior."
  ],
  "archiveDigest": "fbdedfc823d255317bd0fe981acd2ea2dd12b674a993e4524361ee621e78725d",
  "specDigest": "53efb6b700494e7e8ca7021e59c3d2c2390b5bd1f8398b9f607dfa8f64adc074",
  "tasksDigest": "f63e9d838b7c2a829041ca285d08990fe051175e64f8fb26161f4264bb7bef88",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
