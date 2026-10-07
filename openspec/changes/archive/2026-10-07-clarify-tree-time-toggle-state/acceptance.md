# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Session Tree initially shows `Shift+T time (off)` instead of `Shift+T label time`.
- Pressing `Shift+T` changes the footer to `time (on)` and displays label timestamps.
- Timestamp formatting, the enabled `label time` result status, shortcut ordering, and width bounds remain unchanged.

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
    "Timestamp formatting, the enabled `label time` result status, shortcut ordering, and width bounds remain unchanged."
  ],
  "archiveDigest": "75f3b3a61587223a8384621181cdb8ebe2ff4b989dc62cdb98c9c615e3f21771",
  "specDigest": "64f0b723c35fc7d550f62b41659662a2f936974e52af1ed533cd4b8c832e35cd",
  "tasksDigest": "b89a79dd5acfa49eae7d93bfd9629db7049cf83a0538a6a606ef1684164bf16b",
  "evidenceDigest": "67095d969fd8291b11d44c024bc61b147fa9c10e3c3ecdfd744a2526810ed37b",
  "knownGaps": []
}
```
