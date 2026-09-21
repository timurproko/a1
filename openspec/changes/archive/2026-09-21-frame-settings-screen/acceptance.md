# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `/settings` keeps a full-width theme-border rule fixed at the top and initially shows a one-column-inset bold accent `Settings` title below it.
- The first settings section starts immediately below the title without an empty row.
- Settings group names render bold in the active theme's Markdown-heading color while selected labels, values, hints, and notices retain their semantic roles.
- Section headings, setting-row leading markers, and shortcut guidance align with the title's one-column left edge.
- Scrolling moves the `Settings` title out of view, pins only the active section heading immediately below the fixed top rule, and keeps footer guidance fixed.
- The scrollbar starts at the top of the current scrolling region before and after the title disappears.
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
    "The first settings section starts immediately below the title without an empty row.",
    "Settings group names render bold in the active theme's Markdown-heading color while selected labels, values, hints, and notices retain their semantic roles.",
    "Section headings, setting-row leading markers, and shortcut guidance align with the title's one-column left edge.",
    "Scrolling moves the `Settings` title out of view, pins only the active section heading immediately below the fixed top rule, and keeps footer guidance fixed.",
    "The scrollbar starts at the top of the current scrolling region before and after the title disappears.",
    "Opening search retains the shared input's top rule, prompt row, and bottom rule, with its top rule replacing the ordinary footer divider.",
    "Pointer rows, wheel ownership, scrollbar dragging and paging, value-menu placement, dialog interaction, and constrained frames remain aligned with visible content."
  ],
  "archiveDigest": "e6ca6dbcfe801574fb7e64186fba282131ee583ebaefc3cad45d8e0caed10635",
  "specDigest": "fa5f80c506451a3669a4ac9f6ec1655d9f598b614f61f28ece6e5be6f0324f32",
  "tasksDigest": "c62bfebd09fb6b9541baf54361ffc6ba0b1f4521efaef4b5fbd29f0c940c215d",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
