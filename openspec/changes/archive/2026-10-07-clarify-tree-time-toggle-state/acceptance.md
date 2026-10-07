# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Session Tree initially shows `Shift+T time (off)` instead of `Shift+T label time`.
- Pressing `Shift+T` changes the footer to `time (on)` and displays label timestamps.
- Populated and empty result areas omit `label time` while numeric counts, `No entries found`, shortcut ordering, and width bounds remain intact.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "clarify-tree-time-toggle-state",
  "sourcePr": 703,
  "archive": "openspec/changes/archive/2026-10-07-clarify-tree-time-toggle-state/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-07-clarify-tree-time-toggle-state/acceptance.md",
  "finalizedDate": "2026-10-07",
  "specBaseSha": "dc4726623778e968b69f898ea21a338b2446655d",
  "acceptanceScenarios": [
    "Session Tree initially shows `Shift+T time (off)` instead of `Shift+T label time`.",
    "Pressing `Shift+T` changes the footer to `time (on)` and displays label timestamps.",
    "Populated and empty result areas omit `label time` while numeric counts, `No entries found`, shortcut ordering, and width bounds remain intact."
  ],
  "archiveDigest": "23604e9bf2fb4f5d15256c79ead9e2c3a7bb1b50ab58bc81a2890f1ecc8963fe",
  "specDigest": "6204b6b5ee4411585978c3d48a328e303537be8f5a601871e346fea4530efba6",
  "tasksDigest": "0631103b8de114b35f2df4e35633d7b09a7fdec74fd597dc2b8addde44ea62ad",
  "evidenceDigest": "523d272a23f50dc8d2eeac95b4d5d805501b048ab492d1a2ce120ccc242bef04",
  "knownGaps": []
}
```
