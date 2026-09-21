# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `/settings` renders full-width theme-border rules above the title and above the active footer, with a one-column-inset bold accent `Settings` title.
- Settings group names render bold in the active theme's Markdown-heading color while selected labels, values, hints, and notices retain their existing semantic roles.
- Scrolling and sticky headings move only list content; the frame, title, search footer, status footer, notices, and structured-dialog footer remain in their fixed regions.
- Pointer rows, wheel ownership, scrollbar dragging and paging, value-menu placement, and dialog interaction align with the shifted visible list body.
- Empty, narrow, short, searched, overflowing, menu, and dialog frames keep exact terminal dimensions without exposing invisible pointer targets.

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
    "`/settings` renders full-width theme-border rules above the title and above the active footer, with a one-column-inset bold accent `Settings` title.",
    "Settings group names render bold in the active theme's Markdown-heading color while selected labels, values, hints, and notices retain their existing semantic roles.",
    "Scrolling and sticky headings move only list content; the frame, title, search footer, status footer, notices, and structured-dialog footer remain in their fixed regions.",
    "Pointer rows, wheel ownership, scrollbar dragging and paging, value-menu placement, and dialog interaction align with the shifted visible list body.",
    "Empty, narrow, short, searched, overflowing, menu, and dialog frames keep exact terminal dimensions without exposing invisible pointer targets."
  ],
  "archiveDigest": "244ccd8a3d68ce6810c8821ef408a323a3e8ae317f77f28c8d4d6429fe824972",
  "specDigest": "78b609b4ecd24976112c966a48ad3966b098a388c5bfdbb2ba1540ce63456e54",
  "tasksDigest": "cf7b71106d71c49226823e376c286130cb4a024cf77ea078f82ff0bfa72c28d6",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
