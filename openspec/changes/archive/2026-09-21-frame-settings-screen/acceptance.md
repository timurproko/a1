# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `/settings` keeps a full-width theme-border rule fixed at the top and initially shows a one-column-inset bold accent `Settings` title below it.
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
  "specBaseSha": "5f5a349247b532142ae54070ff1fb9d4f6d9a5cc",
  "acceptanceScenarios": [
    "`/settings` keeps a full-width theme-border rule fixed at the top and initially shows a one-column-inset bold accent `Settings` title below it.",
    "Settings group names render bold in the active theme's Markdown-heading color while selected labels, values, hints, and notices retain their semantic roles.",
    "Section headings, setting-row leading markers, and shortcut guidance align with the title's one-column left edge.",
    "Scrolling moves the `Settings` title out of view, pins only the active section heading immediately below the fixed top rule, and keeps footer guidance fixed.",
    "The scrollbar starts at the top of the current scrolling region before and after the title disappears.",
    "Opening search retains the shared input's top rule, prompt row, and bottom rule, with its top rule replacing the ordinary footer divider.",
    "Pointer rows, wheel ownership, scrollbar dragging and paging, value-menu placement, dialog interaction, and constrained frames remain aligned with visible content."
  ],
  "archiveDigest": "6c5a1b3adb207c4cd5fba59c1d6ff005ad5ae45956e09965f4b3aab5d2284ea3",
  "specDigest": "b78af2498cbb46391f35254854c2923f528da75ed0d631e2ddb4bdc594723b55",
  "tasksDigest": "789072a27fd3ca71124463adcb2ef090e6724f22fcdb57073f0782594b0ed00d",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
