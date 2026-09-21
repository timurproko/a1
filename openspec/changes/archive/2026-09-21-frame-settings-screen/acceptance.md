# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `/settings` renders a full-width theme-border top rule and a one-column-inset bold accent `Settings` title, with an ordinary full-width divider above footer guidance.
- Settings group names render bold in the active theme's Markdown-heading color while selected labels, values, hints, and notices retain their semantic roles.
- Section headings, setting-row leading markers, the search prompt, and shortcut guidance align with the title's one-column left edge.
- Opening search replaces the ordinary bottom divider with one prompt row, preserving the list's height and visible vertical placement.
- Scrolling, pointer rows, scrollbar dragging and paging, value-menu placement, dialog interaction, and constrained frames remain aligned with visible content.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "frame-settings-screen",
  "sourcePr": 530,
  "archive": "openspec/changes/archive/2026-09-21-frame-settings-screen/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-21-frame-settings-screen/acceptance.md",
  "finalizedDate": "2026-09-21",
  "specBaseSha": "2226c9d00fb394988592149e312118104089a837",
  "acceptanceScenarios": [
    "`/settings` renders a full-width theme-border top rule and a one-column-inset bold accent `Settings` title, with an ordinary full-width divider above footer guidance.",
    "Settings group names render bold in the active theme's Markdown-heading color while selected labels, values, hints, and notices retain their semantic roles.",
    "Section headings, setting-row leading markers, the search prompt, and shortcut guidance align with the title's one-column left edge.",
    "Opening search replaces the ordinary bottom divider with one prompt row, preserving the list's height and visible vertical placement.",
    "Scrolling, pointer rows, scrollbar dragging and paging, value-menu placement, dialog interaction, and constrained frames remain aligned with visible content."
  ],
  "archiveDigest": "d3c6793024e8db8be8a64b04c592fda2c73c6a477234bf8405068d89561aec14",
  "specDigest": "1e6a8baf64effdbf9e60a0cb650639dfd20f85fb4b0c5e89285b5652e98b7d65",
  "tasksDigest": "0d7c7cf0cf2238eccfcf6a0f6a8edb9544b239a020e3352849408b2e413897e2",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
