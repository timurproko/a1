# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Clicking `+` with the default plus menu adds an Agent at once, without a menu.
- Right-clicking `+` shows `Configure`, which opens the `Plus Menu` modal over the current tab; `Space` toggles a kind, and `+` then opens a menu of the enabled kinds.
- Settings shows a `Tab Bar` section whose `Plus menu` entry opens the same dialog, and disabling every kind hides `+`.
- `Alt+/` dims the frame and opens a palette of Agent session, Settings, and Changelog; typing filters, arrows move, `Enter` opens, `Esc` closes, and the mouse does nothing.
- Changelog opens as one `Changelog` tab, and resident Agents no longer offer `/changelog`.
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
  "specBaseSha": "3b474cdf46e31c9249b5cd3a6fb1833154c9981a",
  "acceptanceScenarios": [
    "Clicking `+` with the default plus menu adds an Agent at once, without a menu.",
    "Right-clicking `+` shows `Configure`, which opens the `Plus Menu` modal over the current tab; `Space` toggles a kind, and `+` then opens a menu of the enabled kinds.",
    "Settings shows a `Tab Bar` section whose `Plus menu` entry opens the same dialog, and disabling every kind hides `+`.",
    "`Alt+/` dims the frame and opens a palette of Agent session, Settings, and Changelog; typing filters, arrows move, `Enter` opens, `Esc` closes, and the mouse does nothing.",
    "Changelog opens as one `Changelog` tab, and resident Agents no longer offer `/changelog`.",
    "The tab rename selection shows a blue background with unchanged text color.",
    "`/name` in an Agent renames its tab, and renaming the tab renames the session."
  ],
  "archiveDigest": "c5c5dd1775993968d337e4c333dbc8c0f95c77c42784ee1865998849874c21f4",
  "specDigest": "7c5b298521308cdf3b629da6f694fa1ef927b887f1824b220abfc0f037583742",
  "tasksDigest": "5be342136011854cfcf7d311988ab6737f4a2d4b115d3d4534597ea7cdc83dfc",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
