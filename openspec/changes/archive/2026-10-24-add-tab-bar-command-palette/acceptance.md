# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Clicking `+` with the default plus menu adds an Agent at once, without a menu.
- Right-clicking `+` shows `Configure`, which opens the plus-menu dialog in the Settings tab; `Space` toggles Settings and Changelog, and `+` then opens a menu of the enabled kinds.
- Settings shows a `Tab Bar` section whose `Plus menu` entry opens the same dialog.
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
    "Right-clicking `+` shows `Configure`, which opens the plus-menu dialog in the Settings tab; `Space` toggles Settings and Changelog, and `+` then opens a menu of the enabled kinds.",
    "Settings shows a `Tab Bar` section whose `Plus menu` entry opens the same dialog.",
    "`Alt+/` dims the frame and opens a palette of Agent session, Settings, and Changelog; typing filters, arrows move, `Enter` opens, `Esc` closes, and the mouse does nothing.",
    "Changelog opens as one `Changelog` tab, and resident Agents no longer offer `/changelog`.",
    "The tab rename selection shows a blue background with unchanged text color.",
    "`/name` in an Agent renames its tab, and renaming the tab renames the session."
  ],
  "archiveDigest": "be04b0dd71b62fbf3332df9217c8021d603055f23e28a7953179011c8fc00611",
  "specDigest": "9daa96992cc2def196dad49bb92b1bf90c7b5ba30d630bcaab1df92867533c54",
  "tasksDigest": "62898ce9d84b06f8e000dcb4046467c0cb9c0d01638253e0148f22b30d713ea0",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
