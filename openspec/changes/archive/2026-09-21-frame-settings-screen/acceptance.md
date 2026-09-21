# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `/settings` keeps a full-width theme-border rule fixed at the top and initially shows a one-column-inset bold accent `Settings` title below it.
- One empty row separates the title from the first settings section.
- Settings group names render bold in the active theme's Markdown-heading color while selected labels, values, hints, and notices retain their semantic roles.
- Scrolling moves the `Settings` title out of view and pins only the active section heading immediately below the fixed top rule.
- Before scrolling, the scrollbar starts alongside the title; after the title disappears, it starts alongside the pinned section.
- Search retains its top rule, prompt row, and bottom rule without an empty result row above it.
- Wheel input over the open search component scrolls results through the final setting.
- Opening and closing an untouched search restores the prior scroll position, including at the bottom.
- Dropdown effective-value checkmarks render cyan, including when that choice is highlighted.
- Pointer rows, wheel ownership, scrollbar interaction, menus, dialogs, and constrained frames remain aligned with visible content.

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
    "Scrolling moves the `Settings` title out of view and pins only the active section heading immediately below the fixed top rule.",
    "Before scrolling, the scrollbar starts alongside the title; after the title disappears, it starts alongside the pinned section.",
    "Search retains its top rule, prompt row, and bottom rule without an empty result row above it.",
    "Wheel input over the open search component scrolls results through the final setting.",
    "Opening and closing an untouched search restores the prior scroll position, including at the bottom.",
    "Dropdown effective-value checkmarks render cyan, including when that choice is highlighted.",
    "Pointer rows, wheel ownership, scrollbar interaction, menus, dialogs, and constrained frames remain aligned with visible content."
  ],
  "archiveDigest": "8d4c93f3eec38fd5f0c47e6c95ee1a768fcf67a173ac0fa032fc34b47e10225f",
  "specDigest": "6d2fa129464bc50c365371486f569cfadcb37ea615fd305c4086c476362a7610",
  "tasksDigest": "a7df93185fa5b66abac1049de40e771c15c1cf4b7b33d96fe2ace8ce5679154f",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
