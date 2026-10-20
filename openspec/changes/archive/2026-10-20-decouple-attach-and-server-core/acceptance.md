# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Tabs switch, open, close, rename, reorder by drag and by shortcut, and jump by number exactly as before, and a close lands on the nearest neighbour.
- The tab context menu, the `+` menu, and the overflow menu open, hover, choose, and close as before, and a popup, a rename prompt, and a drag never show together.
- Settings opens, hides, and reopens instantly from its shortcut and menu, and typing, pasting, and resizing while a new tab starts reach that tab.
- A crashed or restarted tab comes back after its restart delay, and its holder keeps answering while the restart waits.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "decouple-attach-and-server-core",
  "sourcePr": 809,
  "archive": "openspec/changes/archive/2026-10-20-decouple-attach-and-server-core/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-20-decouple-attach-and-server-core/acceptance.md",
  "finalizedDate": "2026-10-20",
  "specBaseSha": "6e3fc4115df868de6fd01d0f57cd43d2f1624827",
  "acceptanceScenarios": [
    "Tabs switch, open, close, rename, reorder by drag and by shortcut, and jump by number exactly as before, and a close lands on the nearest neighbour.",
    "The tab context menu, the `+` menu, and the overflow menu open, hover, choose, and close as before, and a popup, a rename prompt, and a drag never show together.",
    "Settings opens, hides, and reopens instantly from its shortcut and menu, and typing, pasting, and resizing while a new tab starts reach that tab.",
    "A crashed or restarted tab comes back after its restart delay, and its holder keeps answering while the restart waits."
  ],
  "archiveDigest": "a5d48f0083ddfcfecb71edbeda05b6fe4a261e3167a7d4e837eee616d5efc520",
  "specDigest": "e483737a89ef84e5c5c4b01ca730a5c7769b12c6308f3a911aaaaa978fa36ada",
  "tasksDigest": "484c9db460a717d0fcfa19a9af1ba47e92bb919fa11af0d238a7fd674690f702",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
