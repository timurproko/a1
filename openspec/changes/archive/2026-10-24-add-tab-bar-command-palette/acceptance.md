# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Clicking `+` with the default plus menu adds an Agent at once, without a menu.
- Right-clicking `+` shows `Configure`, which opens the `Plus Menu` modal over the current tab listing Agent, Settings, and Changelog; `Space` toggles a kind, `+` then offers the enabled kinds, and with none enabled `+` is hidden.
- Settings shows a `Tab Bar` section whose `Plus menu` entry opens the same `Plus Menu` modal.
- `Alt+/` dims the frame and opens a palette of Agent, Settings, and Changelog; typing filters, arrows move, `Enter` opens, `Esc` closes, and the mouse does nothing.
- Choosing Changelog from the palette opens one `Changelog` tab at once that `Esc` does not close, and resident Agents no longer offer `/changelog`.
- A new Agent, Settings, or Changelog tab appears in the tab bar at once while the current content, landing included, hides, and its content fades in like the resize fade, which fades the tab bar too; no cursor shows until it is in.
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
  "specBaseSha": "d917b44ab251c15b042f43090505958c9dcc68d8",
  "acceptanceScenarios": [
    "Clicking `+` with the default plus menu adds an Agent at once, without a menu.",
    "Right-clicking `+` shows `Configure`, which opens the `Plus Menu` modal over the current tab listing Agent, Settings, and Changelog; `Space` toggles a kind, `+` then offers the enabled kinds, and with none enabled `+` is hidden.",
    "Settings shows a `Tab Bar` section whose `Plus menu` entry opens the same `Plus Menu` modal.",
    "`Alt+/` dims the frame and opens a palette of Agent, Settings, and Changelog; typing filters, arrows move, `Enter` opens, `Esc` closes, and the mouse does nothing.",
    "Choosing Changelog from the palette opens one `Changelog` tab at once that `Esc` does not close, and resident Agents no longer offer `/changelog`.",
    "A new Agent, Settings, or Changelog tab appears in the tab bar at once while the current content, landing included, hides, and its content fades in like the resize fade, which fades the tab bar too; no cursor shows until it is in.",
    "The tab rename selection shows a blue background with unchanged text color.",
    "`/name` in an Agent renames its tab, and renaming the tab renames the session."
  ],
  "archiveDigest": "c20814bc1d9406a6744646819f3d54b87506718242d9f034e4ef9bc4a0ad3f67",
  "specDigest": "1514cca23be97183d34177aaf1097c9001b0b0a51d9574bdd2cb69e35ddca75f",
  "tasksDigest": "d50b2918f4d8a89b0ad80296e93c4b8583ec60314150a0e6aa068e6ab78f20bf",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
