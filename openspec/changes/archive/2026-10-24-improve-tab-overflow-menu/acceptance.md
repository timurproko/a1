# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- The overflow popup lists only tabs without drawn chips, without checkmarks; selecting one swaps it into the currently active chip's slot and puts the displaced tab in the menu.
- Popup rows reserve a status-glyph slot beside every hidden tab name; working and attention glyphs use their current colors, while idle rows keep a blank slot.
- Alt+number selects only the chip in that visible position; Alt+3 does nothing when only two chips are drawn, even if a third tab exists.
- A hidden-tab selection replaces the old chip without briefly showing it again or replaying the incoming tab's hidden title animation.
- Top and bottom popup clicks activate the exact named hidden tab after hover, resize, or reorder; removed and clipped rows cannot select a different tab.
- Narrow A1 footer rows use a dim single-cell ellipsis and preserve the full model name when it fits, without changing Pi comparison or PR badge links.
- The centered `⋯` overflow and `+` add menus open by click, without Alt+- or Alt+= shortcuts; the overflow control retains its muted color and hit area.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "improve-tab-overflow-menu",
  "sourcePr": 827,
  "archive": "openspec/changes/archive/2026-10-24-improve-tab-overflow-menu/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-24-improve-tab-overflow-menu/acceptance.md",
  "finalizedDate": "2026-10-24",
  "specBaseSha": "94d20148619a7a3e25f5b84a6e6684ed1cab7973",
  "acceptanceScenarios": [
    "The overflow popup lists only tabs without drawn chips, without checkmarks; selecting one swaps it into the currently active chip's slot and puts the displaced tab in the menu.",
    "Popup rows reserve a status-glyph slot beside every hidden tab name; working and attention glyphs use their current colors, while idle rows keep a blank slot.",
    "Alt+number selects only the chip in that visible position; Alt+3 does nothing when only two chips are drawn, even if a third tab exists.",
    "A hidden-tab selection replaces the old chip without briefly showing it again or replaying the incoming tab's hidden title animation.",
    "Top and bottom popup clicks activate the exact named hidden tab after hover, resize, or reorder; removed and clipped rows cannot select a different tab.",
    "Narrow A1 footer rows use a dim single-cell ellipsis and preserve the full model name when it fits, without changing Pi comparison or PR badge links.",
    "The centered `⋯` overflow and `+` add menus open by click, without Alt+- or Alt+= shortcuts; the overflow control retains its muted color and hit area."
  ],
  "archiveDigest": "1cec9d70427691ae1b75f815d505408e1211b5041e7b577457a27be4b0e5173c",
  "specDigest": "e2f088d64fdd6388fa2bc6a8d6442f226c389a1bdda7757d1040c89ec453eaa5",
  "tasksDigest": "d28c6cd6165aebf5de917ff0aaec2fb302dd9c6cc44f4d4e3db67199662f848e",
  "evidenceDigest": "3aad504417880d694027c740dd5a6d89f02c9302a174a465419f3152f5ad35d4",
  "knownGaps": []
}
```
