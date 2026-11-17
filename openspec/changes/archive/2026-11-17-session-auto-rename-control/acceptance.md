# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- External applications can persist a per-session automatic-name override without changing the profile or peer sessions.
- Disabling automatic naming cancels pending work and preserves the current name; enabling retains ordinary manual-name protection.
- Existing external renames and color control retain exact-session guards and acknowledged readback.
- Herdr agent menus no longer offer Rename, while Pin, Close, navigation and tab or space renaming remain available.
- Legacy sidebar-rename preferences cannot restore the removed feature or suppress native session-name reporting.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "session-auto-rename-control",
  "sourcePr": 971,
  "archive": "openspec/changes/archive/2026-11-17-session-auto-rename-control/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-17-session-auto-rename-control/acceptance.md",
  "finalizedDate": "2026-11-17",
  "specBaseSha": "4d5f2086d7bd18e6b3476bff82117fd0ccfc9351",
  "acceptanceScenarios": [
    "External applications can persist a per-session automatic-name override without changing the profile or peer sessions.",
    "Disabling automatic naming cancels pending work and preserves the current name; enabling retains ordinary manual-name protection.",
    "Existing external renames and color control retain exact-session guards and acknowledged readback.",
    "Herdr agent menus no longer offer Rename, while Pin, Close, navigation and tab or space renaming remain available.",
    "Legacy sidebar-rename preferences cannot restore the removed feature or suppress native session-name reporting."
  ],
  "archiveDigest": "ad43af59c1e08b6d1564cb47f6739d78343e439064c59c33acb4245c8ed82e9b",
  "specDigest": "f10ebebe17735a8559e56c1087ffe132f8ac4a7ec1159f81d91bac988a05c2b0",
  "tasksDigest": "02dfc4dddb1fe6973fa29a2f4e10c0fd8e3276768b51357cf1beebc8ba35a13d",
  "evidenceDigest": "a28072eb9b32877289802a5979d2560f61ab17698f94a3ec87c30c0aeb805c19",
  "knownGaps": []
}
```
