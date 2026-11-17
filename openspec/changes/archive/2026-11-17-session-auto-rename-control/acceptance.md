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
  "specBaseSha": "73058d664224c916bbfd358855175ad829a67c80",
  "acceptanceScenarios": [
    "External applications can persist a per-session automatic-name override without changing the profile or peer sessions.",
    "Disabling automatic naming cancels pending work and preserves the current name; enabling retains ordinary manual-name protection.",
    "Existing external renames and color control retain exact-session guards and acknowledged readback.",
    "Herdr agent menus no longer offer Rename, while Pin, Close, navigation and tab or space renaming remain available.",
    "Legacy sidebar-rename preferences cannot restore the removed feature or suppress native session-name reporting."
  ],
  "archiveDigest": "c60b965ab30a36466b873276e28615229529901d80493d7c5b59346fd621087e",
  "specDigest": "f10ebebe17735a8559e56c1087ffe132f8ac4a7ec1159f81d91bac988a05c2b0",
  "tasksDigest": "4a592f7307185909355f4620f2030696a3b60e4a2454cfbdaf0f114ce9ca9b44",
  "evidenceDigest": "12b6e2a5911862b2da9988709f4db85906224b07862081cb900d174d08452171",
  "knownGaps": []
}
```
