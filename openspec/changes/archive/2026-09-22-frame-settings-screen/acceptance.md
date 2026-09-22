# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `/settings` keeps a full-width theme-border rule fixed at the top and initially shows a one-column-inset bold accent `Settings` title below it.
- One empty row separates the title from the first settings section.
- Settings group names render bold in the active theme's Markdown-heading color.
- Scrolling moves the `Settings` title out of view and pins only the active section heading below the fixed top rule.
- Before scrolling, the scrollbar starts alongside the title; afterward it starts alongside the pinned section.
- Search retains its top rule, prompt row, and bottom rule without a trailing empty result row.
- Wheel input anywhere over the open search footer, including its bottom status row, reaches the actual final setting.
- Opening and closing an untouched search restores the prior scroll position.
- Dropdown effective-value checkmarks render cyan, including when highlighted.
- Pointer rows, wheel ownership, scrollbar interaction, menus, dialogs, and constrained frames remain aligned.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "frame-settings-screen",
  "sourcePr": 530,
  "archive": "openspec/changes/archive/2026-09-22-frame-settings-screen/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-22-frame-settings-screen/acceptance.md",
  "finalizedDate": "2026-09-22",
  "specBaseSha": "6ae061516ba71675476541a958bd6e49903e280f",
  "acceptanceScenarios": [
    "`/settings` keeps a full-width theme-border rule fixed at the top and initially shows a one-column-inset bold accent `Settings` title below it.",
    "One empty row separates the title from the first settings section.",
    "Settings group names render bold in the active theme's Markdown-heading color.",
    "Scrolling moves the `Settings` title out of view and pins only the active section heading below the fixed top rule.",
    "Before scrolling, the scrollbar starts alongside the title; afterward it starts alongside the pinned section.",
    "Search retains its top rule, prompt row, and bottom rule without a trailing empty result row.",
    "Wheel input anywhere over the open search footer, including its bottom status row, reaches the actual final setting.",
    "Opening and closing an untouched search restores the prior scroll position.",
    "Dropdown effective-value checkmarks render cyan, including when highlighted.",
    "Pointer rows, wheel ownership, scrollbar interaction, menus, dialogs, and constrained frames remain aligned."
  ],
  "archiveDigest": "3cd7067885b83a269c1ad1e6eda91ca3f6954b550fe1f5ff47f86c4f2b403f2c",
  "specDigest": "7a3505a3228487c082573d6858f4a364cafc1891f540cd5907cacff630a57001",
  "tasksDigest": "09bdb285aa20d98dce4711ace352546bd9f0f86a107d58b0e20865f7774089a0",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
