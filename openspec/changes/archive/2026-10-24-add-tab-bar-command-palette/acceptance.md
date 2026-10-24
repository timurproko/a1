# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Clicking `+` with the default plus menu adds an Agent at once, without a menu.
- Right-clicking `+` shows `Configure`, which opens the `Plus Menu` modal over the current tab listing Settings; `Space` toggles it, and `+` then opens a menu with Agent and Settings.
- Settings shows a `Tab Bar` section whose `Plus menu` entry opens the same `Plus Menu` modal.
- `Alt+/` dims the frame and opens a palette of Agent, Settings, and Changelog; typing filters, arrows move, `Enter` opens, `Esc` closes, and the mouse does nothing.
- Choosing Changelog from the palette opens one `Changelog` tab at once that `Esc` does not close, and resident Agents no longer offer `/changelog`.
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
  "specBaseSha": "249897fcdddca6cfba2e74efcb28c73b2b8d5c18",
  "acceptanceScenarios": [
    "Clicking `+` with the default plus menu adds an Agent at once, without a menu.",
    "Right-clicking `+` shows `Configure`, which opens the `Plus Menu` modal over the current tab listing Settings; `Space` toggles it, and `+` then opens a menu with Agent and Settings.",
    "Settings shows a `Tab Bar` section whose `Plus menu` entry opens the same `Plus Menu` modal.",
    "`Alt+/` dims the frame and opens a palette of Agent, Settings, and Changelog; typing filters, arrows move, `Enter` opens, `Esc` closes, and the mouse does nothing.",
    "Choosing Changelog from the palette opens one `Changelog` tab at once that `Esc` does not close, and resident Agents no longer offer `/changelog`.",
    "The tab rename selection shows a blue background with unchanged text color.",
    "`/name` in an Agent renames its tab, and renaming the tab renames the session."
  ],
  "archiveDigest": "d7659b1631015943124c898619725f474bd56459e0ad3cc1769b5c27f459208b",
  "specDigest": "55f3531acc4489b2e1441c1775f95bf572ee4602b4d3b6a188bfc30d7c964e38",
  "tasksDigest": "bdb6b60aac37ffa68b71b26a18e8571cc4713d0fb42c347221e07f93c89e8619",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
