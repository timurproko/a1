# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- The overflow popup lists only tabs without drawn chips, without checkmarks; selecting one swaps it into the previously viewed chip's slot and puts the displaced tab in the menu.
- Popup rows reserve a status-glyph slot beside every hidden tab name; working and attention glyphs use their current colors, while idle rows keep a blank slot.
- Alt+number selects only the chip in that visible position; Alt+3 does nothing when only two chips are drawn, even if a third tab exists.
- A hidden-tab selection replaces the old chip without briefly showing it again or replaying the incoming tab's hidden title animation.
- Top and bottom popup clicks activate the exact named hidden tab after hover, resize, or reorder; removed and clipped rows cannot select a different tab.
- Narrow A1 footer rows use a dim single-cell ellipsis and preserve the full model name when it fits, without changing Pi comparison or PR badge links.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "improve-tab-overflow-menu",
  "sourcePr": 827,
  "archive": "openspec/changes/archive/2026-10-24-improve-tab-overflow-menu/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-24-improve-tab-overflow-menu/acceptance.md",
  "finalizedDate": "2026-10-24",
  "specBaseSha": "662fd5b5aa10de92f773889f0dcd2f026a285322",
  "acceptanceScenarios": [
    "The overflow popup lists only tabs without drawn chips, without checkmarks; selecting one swaps it into the previously viewed chip's slot and puts the displaced tab in the menu.",
    "Popup rows reserve a status-glyph slot beside every hidden tab name; working and attention glyphs use their current colors, while idle rows keep a blank slot.",
    "Alt+number selects only the chip in that visible position; Alt+3 does nothing when only two chips are drawn, even if a third tab exists.",
    "A hidden-tab selection replaces the old chip without briefly showing it again or replaying the incoming tab's hidden title animation.",
    "Top and bottom popup clicks activate the exact named hidden tab after hover, resize, or reorder; removed and clipped rows cannot select a different tab.",
    "Narrow A1 footer rows use a dim single-cell ellipsis and preserve the full model name when it fits, without changing Pi comparison or PR badge links."
  ],
  "archiveDigest": "236669ac2d45bf52e2b417cbbeb5b7ebe3387d211632b32b44285d81fc126d86",
  "specDigest": "dc4a5f215f07546328dea40362f9e06dfbd334b617cb5d65a2f3c9e24646a0df",
  "tasksDigest": "4aa475669ce3a278fa4354c31592382725f29fda2977df4494465275baecc539",
  "evidenceDigest": "950dbbd86551e50788aae2f6c1f0a2b8b1efb273b94ac3505c8fa54fa9810d70",
  "knownGaps": []
}
```
