# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Clicking `+` with the default plus menu adds an Agent at once, without a menu.
- Right-clicking `+` shows `Configure`, which opens the `Plus Menu` modal over the current tab listing Agent, Settings, and Changelog; `Space` toggles a kind, `+` then offers the enabled kinds, and with none enabled `+` is hidden.
- Settings shows a `Tab Bar` section whose `Plus menu` entry opens the same `Plus Menu` modal.
- `Alt+/` dims the frame and opens a palette of Agent, Settings, and Changelog; typing filters, arrows move, `Enter` opens, `Esc` closes, and the mouse does nothing.
- Choosing Changelog from the palette opens one `Changelog` tab at once that `Esc` does not close, and resident Agents no longer offer `/changelog`.
- Pressing the new-Agent shortcut many times opens one Agent at a time; no more start until the opening one shows.
- A new Agent, Settings, or Changelog tab shows at once, with no fade and no spinner, as soon as it has drawn; until then the current tab or landing stays, so no empty screen or stray cursor shows. Only resizing fades.
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
    "Pressing the new-Agent shortcut many times opens one Agent at a time; no more start until the opening one shows.",
    "A new Agent, Settings, or Changelog tab shows at once, with no fade and no spinner, as soon as it has drawn; until then the current tab or landing stays, so no empty screen or stray cursor shows. Only resizing fades.",
    "The tab rename selection shows a blue background with unchanged text color.",
    "`/name` in an Agent renames its tab, and renaming the tab renames the session."
  ],
  "archiveDigest": "e0aac4bc8e5df08b9f28f58c15df57e70dceda4e9b1f7a5192477b0e8afe1dcf",
  "specDigest": "5d858b2c28ca931bee21f52536d9aa55d9c6cedf46456b5358ecf08acff106a6",
  "tasksDigest": "e548f56d898d19a08fdf534edcceac40166835cdad32d93af61c03d51c921a93",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
