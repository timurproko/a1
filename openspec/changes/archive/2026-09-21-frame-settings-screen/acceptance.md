# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `/settings` keeps a full-width theme-border rule fixed at the top and initially shows a one-column-inset bold accent `Settings` title below it.
- One empty row separates the title from the first settings section.
- Settings group names render bold in the active theme's Markdown-heading color while selected labels, values, hints, and notices retain their semantic roles.
- Section headings, setting-row leading markers, and shortcut guidance align with the title's one-column left edge.
- Scrolling moves the `Settings` title out of view, pins only the active section heading immediately below the fixed top rule, and keeps footer guidance fixed.
- Before scrolling, the scrollbar starts alongside the title; after the title disappears, it starts alongside the pinned section.
- Opening search retains the shared input's top rule, prompt row, and bottom rule, with its top rule replacing the ordinary footer divider.
- Pointer rows, wheel ownership, scrollbar dragging and paging, value-menu placement, dialog interaction, and constrained frames remain aligned with visible content.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "frame-settings-screen",
  "sourcePr": 530,
  "archive": "openspec/changes/archive/2026-09-21-frame-settings-screen/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-21-frame-settings-screen/acceptance.md",
  "finalizedDate": "2026-09-21",
  "specBaseSha": "6ae061516ba71675476541a958bd6e49903e280f",
  "acceptanceScenarios": [
    "`/settings` keeps a full-width theme-border rule fixed at the top and initially shows a one-column-inset bold accent `Settings` title below it.",
    "One empty row separates the title from the first settings section.",
    "Settings group names render bold in the active theme's Markdown-heading color while selected labels, values, hints, and notices retain their semantic roles.",
    "Section headings, setting-row leading markers, and shortcut guidance align with the title's one-column left edge.",
    "Scrolling moves the `Settings` title out of view, pins only the active section heading immediately below the fixed top rule, and keeps footer guidance fixed.",
    "Before scrolling, the scrollbar starts alongside the title; after the title disappears, it starts alongside the pinned section.",
    "Opening search retains the shared input's top rule, prompt row, and bottom rule, with its top rule replacing the ordinary footer divider.",
    "Pointer rows, wheel ownership, scrollbar dragging and paging, value-menu placement, dialog interaction, and constrained frames remain aligned with visible content."
  ],
  "archiveDigest": "6ef0237bfa8f6d974fd9f587e87a0ec8decc4c560a4dcb7982aeb0ca84d29a28",
  "specDigest": "d7a8c541b21342d29e792db9362323e8b18931f60528255911d855d931b1b93d",
  "tasksDigest": "c9c244ddb0cb81199766f2c1e8d0caa352c1d0981c33564fb1cc28848f9fcd4f",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
