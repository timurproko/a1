# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- The overflow popup lists only tabs without drawn chips, without checkmarks; selecting one swaps it into the previously viewed chip's slot and puts the displaced tab in the menu.
- Popup rows reserve a status-glyph slot beside every hidden tab name; working and attention glyphs use their current colors, while idle rows keep a blank slot.
- Alt+number selects only the chip in that visible position; Alt+3 does nothing when only two chips are drawn, even if a third tab exists.
- A hidden-tab selection replaces the old chip without briefly showing it again or replaying the incoming tab's hidden title animation.
- Top and bottom popup clicks activate the exact named hidden tab after hover, resize, or reorder; removed and clipped rows cannot select a different tab.
- Narrow A1 footer rows use a dim single-cell ellipsis and preserve the full model name when it fits, without changing Pi comparison or PR badge links.
- Alt+- opens the hidden-tab chooser when overflow exists, Alt++ opens the add-tab menu, and the overflow strip control displays `-` with its existing hit area and muted color.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "improve-tab-overflow-menu",
  "sourcePr": 827,
  "archive": "openspec/changes/archive/2026-10-24-improve-tab-overflow-menu/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-24-improve-tab-overflow-menu/acceptance.md",
  "finalizedDate": "2026-10-24",
  "specBaseSha": "d917b44ab251c15b042f43090505958c9dcc68d8",
  "acceptanceScenarios": [
    "The overflow popup lists only tabs without drawn chips, without checkmarks; selecting one swaps it into the previously viewed chip's slot and puts the displaced tab in the menu.",
    "Popup rows reserve a status-glyph slot beside every hidden tab name; working and attention glyphs use their current colors, while idle rows keep a blank slot.",
    "Alt+number selects only the chip in that visible position; Alt+3 does nothing when only two chips are drawn, even if a third tab exists.",
    "A hidden-tab selection replaces the old chip without briefly showing it again or replaying the incoming tab's hidden title animation.",
    "Top and bottom popup clicks activate the exact named hidden tab after hover, resize, or reorder; removed and clipped rows cannot select a different tab.",
    "Narrow A1 footer rows use a dim single-cell ellipsis and preserve the full model name when it fits, without changing Pi comparison or PR badge links.",
    "Alt+- opens the hidden-tab chooser when overflow exists, Alt++ opens the add-tab menu, and the overflow strip control displays `-` with its existing hit area and muted color."
  ],
  "archiveDigest": "91073ed390b527b20f4a95ce6f128edf8f6ac64a4d7569766a64770f2b553bbc",
  "specDigest": "3e1973d49c32324f50b487cb063320a78ccf5957e1b9063307e02c49524e49d0",
  "tasksDigest": "af660b09ef629a161d853b3dd0130b8f0ac46678bb344c102334723b34047570",
  "evidenceDigest": "af7eb2aae756b2f7d7f8a3a28097d3657a83cb06392c691297fb0a3603180a15",
  "knownGaps": []
}
```
