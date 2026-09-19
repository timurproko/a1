# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- In bare A1, `/changelog` and `/hotkeys` open full-screen `What's New` and `Keyboard Shortcuts` screens that scroll by keyboard, wheel, and rail and close with `Esc`, appending no row to the feed.
- After an upgrade with the changelog expanded, bare A1 shows the two-line hint in the feed and opens the `What's New` screen once with only the new entries; a presented modal suppresses it for that launch.
- `a1 pi` still runs the pinned `changelog` and `hotkeys` workflows and appends the pinned in-feed documents.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "present-changelog-and-hotkeys-fullscreen",
  "sourcePr": 510,
  "archive": "openspec/changes/archive/2026-09-19-present-changelog-and-hotkeys-fullscreen/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-19-present-changelog-and-hotkeys-fullscreen/acceptance.md",
  "finalizedDate": "2026-09-19",
  "specBaseSha": "9dcee71e651ef64e19ad284880b3b599d3cac727",
  "acceptanceScenarios": [
    "In bare A1, `/changelog` and `/hotkeys` open full-screen `What's New` and `Keyboard Shortcuts` screens that scroll by keyboard, wheel, and rail and close with `Esc`, appending no row to the feed.",
    "After an upgrade with the changelog expanded, bare A1 shows the two-line hint in the feed and opens the `What's New` screen once with only the new entries; a presented modal suppresses it for that launch.",
    "`a1 pi` still runs the pinned `changelog` and `hotkeys` workflows and appends the pinned in-feed documents."
  ],
  "archiveDigest": "0c7feb762e6c614444f1c8bcfd41c89f2913eb2cb81fcdeaded6408261300368",
  "specDigest": "c47007a0aa7da18921bddd317152c6f11e0f8855b971e12c6eefa4fa1c6196c9",
  "tasksDigest": "33cc480f556f184efd7c75dfa4a99b632f8a57ad2a802771cdfb2855a24153bb",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
