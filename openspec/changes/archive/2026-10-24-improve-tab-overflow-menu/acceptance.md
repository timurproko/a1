# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- The overflow popup lists only tabs without drawn chips, without checkmarks; selecting one swaps it into the currently active chip's slot and puts the displaced tab in the menu.
- Popup rows reserve a status-glyph slot beside every hidden tab name; working and attention glyphs use their current colors, while idle rows keep a blank slot.
- Alt+number selects only the chip in that visible position; Alt+3 does nothing when only two chips are drawn, even if a third tab exists.
- A hidden-tab selection replaces the old chip without briefly showing it again or replaying the incoming tab's hidden title animation.
- Top and bottom popup clicks activate the exact named hidden tab after hover, resize, or reorder; removed and clipped rows cannot select a different tab.
- Narrow A1 footer rows use a dim single-cell ellipsis and preserve the full model name when it fits, without changing Pi comparison or PR badge links.
- The centered `⋯` opens hidden tabs by click; enabled `+` follows its configured Agent-or-menu click behavior. Neither uses Alt+- or Alt+=, and `⋯` keeps its muted color and hit area.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "improve-tab-overflow-menu",
  "sourcePr": 827,
  "archive": "openspec/changes/archive/2026-10-24-improve-tab-overflow-menu/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-24-improve-tab-overflow-menu/acceptance.md",
  "finalizedDate": "2026-10-24",
  "specBaseSha": "8d5ba0ca2e9fcae0d070f078556341652a474120",
  "acceptanceScenarios": [
    "The overflow popup lists only tabs without drawn chips, without checkmarks; selecting one swaps it into the currently active chip's slot and puts the displaced tab in the menu.",
    "Popup rows reserve a status-glyph slot beside every hidden tab name; working and attention glyphs use their current colors, while idle rows keep a blank slot.",
    "Alt+number selects only the chip in that visible position; Alt+3 does nothing when only two chips are drawn, even if a third tab exists.",
    "A hidden-tab selection replaces the old chip without briefly showing it again or replaying the incoming tab's hidden title animation.",
    "Top and bottom popup clicks activate the exact named hidden tab after hover, resize, or reorder; removed and clipped rows cannot select a different tab.",
    "Narrow A1 footer rows use a dim single-cell ellipsis and preserve the full model name when it fits, without changing Pi comparison or PR badge links.",
    "The centered `⋯` opens hidden tabs by click; enabled `+` follows its configured Agent-or-menu click behavior. Neither uses Alt+- or Alt+=, and `⋯` keeps its muted color and hit area."
  ],
  "archiveDigest": "393026838b233a60f1857f1bd47ae58390e5e755625d79574d147d3e17c42454",
  "specDigest": "bc1de1d87072ca96bf98b63ade5c7b9b038825ae9c541aa510fe0f9146316dba",
  "tasksDigest": "d28c6cd6165aebf5de917ff0aaec2fb302dd9c6cc44f4d4e3db67199662f848e",
  "evidenceDigest": "0e897982df9ea35913eee724f66bcccad120acdfb626a8b868fa72974c1505b5",
  "knownGaps": []
}
```
