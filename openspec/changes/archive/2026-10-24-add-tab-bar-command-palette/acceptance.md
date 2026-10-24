# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Clicking `+` with the default plus menu adds an Agent at once, without a menu.
- Right-clicking `+` shows `Configure`, which opens the `Plus Menu` modal over the current tab; `Space` toggles a kind, and `+` then opens a menu of the enabled kinds.
- Settings shows a `Tab Bar` section whose `Plus menu` entry opens the same `Plus Menu` modal, and disabling every kind hides `+`.
- `Alt+/` dims the frame and opens a palette of Agent session, Settings, and Changelog; typing filters, arrows move, `Enter` opens, `Esc` closes, and the mouse does nothing.
- Choosing Changelog from `+` or the palette opens one `Changelog` tab, and resident Agents no longer offer `/changelog`.
- The tab rename selection shows a blue background with unchanged text color.
- `/name` in an Agent renames its tab, and renaming the tab renames the session.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "add-tab-bar-command-palette",
  "sourcePr": 821,
  "archive": "openspec/changes/archive/2026-10-24-add-tab-bar-command-palette/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-24-add-tab-bar-command-palette/acceptance.md",
  "finalizedDate": "2026-10-24",
  "specBaseSha": "a055df3f214104c380e5903d9d71ee6668f9133f",
  "acceptanceScenarios": [
    "Clicking `+` with the default plus menu adds an Agent at once, without a menu.",
    "Right-clicking `+` shows `Configure`, which opens the `Plus Menu` modal over the current tab; `Space` toggles a kind, and `+` then opens a menu of the enabled kinds.",
    "Settings shows a `Tab Bar` section whose `Plus menu` entry opens the same `Plus Menu` modal, and disabling every kind hides `+`.",
    "`Alt+/` dims the frame and opens a palette of Agent session, Settings, and Changelog; typing filters, arrows move, `Enter` opens, `Esc` closes, and the mouse does nothing.",
    "Choosing Changelog from `+` or the palette opens one `Changelog` tab, and resident Agents no longer offer `/changelog`.",
    "The tab rename selection shows a blue background with unchanged text color.",
    "`/name` in an Agent renames its tab, and renaming the tab renames the session."
  ],
  "archiveDigest": "49237e0f731f7c5d9f861a03d8524f59bc2475d906de9a0dbb7efe87f9217da4",
  "specDigest": "adf921f6c0e30cc593a7049af7a5062e7ed95279dadf0712a106fab9f4afc992",
  "tasksDigest": "ff582a3a392ce0affe1f365acfdf536e54174b7b152d7c6d0a797a8be497238f",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
