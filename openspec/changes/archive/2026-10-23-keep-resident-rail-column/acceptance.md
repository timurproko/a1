# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- In a multi-agent tab on Windows, scrolling away from the end and back, hovering or dragging the rail, and streaming new rows never leave a rail cell one column left of the gutter with a blank final column.
- Rows that held the jump-to-bottom control or the last streamed line show the rail in the same column as every other row, as in solo mode.
- Ordinary backspaces, cursor movement, styles, links, and row-bounded repaint in resident tabs behave as before.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "keep-resident-rail-column",
  "sourcePr": 820,
  "archive": "openspec/changes/archive/2026-10-23-keep-resident-rail-column/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-23-keep-resident-rail-column/acceptance.md",
  "finalizedDate": "2026-10-23",
  "specBaseSha": "cb802f39bbc4bfdc5165bd140fd7cb227c2a0932",
  "acceptanceScenarios": [
    "In a multi-agent tab on Windows, scrolling away from the end and back, hovering or dragging the rail, and streaming new rows never leave a rail cell one column left of the gutter with a blank final column.",
    "Rows that held the jump-to-bottom control or the last streamed line show the rail in the same column as every other row, as in solo mode.",
    "Ordinary backspaces, cursor movement, styles, links, and row-bounded repaint in resident tabs behave as before."
  ],
  "archiveDigest": "0e2ed75b0d9e573f2a8dcd8b490617aeefd67253e6d0ae41632ea88c2a965d36",
  "specDigest": "61c75b8934d78fca23cb8507cb0006d3521cdb2dca7b79366a8a7398a9ac2f82",
  "tasksDigest": "3907c5b135094430e5e637fd8fd5ef9b8a9c651cbd8c2f1ffa432a4779372824",
  "evidenceDigest": "580e998fb19650c6612cc65c45815bf7146c741904260fb81c8107600c7e4657",
  "knownGaps": []
}
```
