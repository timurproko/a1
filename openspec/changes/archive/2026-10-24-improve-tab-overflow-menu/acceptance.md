# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- The overflow popup lists only tabs without drawn chips, without checkmarks; selecting one swaps it into the previously viewed chip's slot and puts the displaced tab in the menu.
- Popup rows reserve a status-glyph slot beside every hidden tab name; working and attention glyphs use their current colors, while idle rows keep a blank slot.
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
  "specBaseSha": "a51b16feea8a32e61cd59c68a2ecfbe4c7f875b1",
  "acceptanceScenarios": [
    "The overflow popup lists only tabs without drawn chips, without checkmarks; selecting one swaps it into the previously viewed chip's slot and puts the displaced tab in the menu.",
    "Popup rows reserve a status-glyph slot beside every hidden tab name; working and attention glyphs use their current colors, while idle rows keep a blank slot.",
    "Top and bottom popup clicks activate the exact named hidden tab after hover, resize, or reorder; removed and clipped rows cannot select a different tab.",
    "Narrow A1 footer rows use a dim single-cell ellipsis and preserve the full model name when it fits, without changing Pi comparison or PR badge links."
  ],
  "archiveDigest": "2696c822b29ff37c8be0755f969acd4dc8ab8ea788462b59d93cd9ce0b76e8b1",
  "specDigest": "9a9c472b52a29716a4b50307b7eaa4f6358a09dd0944ec5b51b1b724658c7223",
  "tasksDigest": "ab08df3a6f7f539ded2a69014b60d88ec808e84844d3778ee484e1615aaa9d6c",
  "evidenceDigest": "9de9bd263f9be7f4a8245eb62f74ffa038d8b51ef0dff13261f37ec961ea0165",
  "knownGaps": []
}
```
