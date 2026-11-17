# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- The publication version and run header appear once above an unprefixed indented full-log link and progress lines.
- Every changed job occupies a separate line with its name aligned after a fixed-width neutral-text status label.
- Only single-column dots carry yellow, green, red, or gray status color while labels and job names retain default text color.
- Redirected output and color-disabled terminals retain readable aligned statuses without ANSI escape sequences.
- Repeated snapshots and inactive optional skips remain quiet while meaningful skips and failure diagnostics stay visible.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "align-publication-status-dots",
  "sourcePr": 942,
  "archive": "openspec/changes/archive/2026-11-15-align-publication-status-dots/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-15-align-publication-status-dots/acceptance.md",
  "finalizedDate": "2026-11-15",
  "specBaseSha": "3f2ed26f0cc99a5ac22901221a3ea2b89de755c3",
  "acceptanceScenarios": [
    "The publication version and run header appear once above an unprefixed indented full-log link and progress lines.",
    "Every changed job occupies a separate line with its name aligned after a fixed-width neutral-text status label.",
    "Only single-column dots carry yellow, green, red, or gray status color while labels and job names retain default text color.",
    "Redirected output and color-disabled terminals retain readable aligned statuses without ANSI escape sequences.",
    "Repeated snapshots and inactive optional skips remain quiet while meaningful skips and failure diagnostics stay visible."
  ],
  "archiveDigest": "9e2d4f402b4f4d0a9b73e4ef1659749f934405df75172ce74a2d4bd3e539d8b4",
  "specDigest": "2e6775b1a98793afb11470813b474d53ac0470d1496521e5deb4024ab1d067f6",
  "tasksDigest": "a8c0549f5e10e25d042864e8ed86b30a84e8d917bb4ccf1cbccddb3e81adcffb",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
