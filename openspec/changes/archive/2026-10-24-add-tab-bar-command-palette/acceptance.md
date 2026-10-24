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
- Renaming a tab renames its session; a resident Agent does not offer `/name` and refuses it with a hint to rename the tab, while A1 run on its own still has `/name`.

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
    "Renaming a tab renames its session; a resident Agent does not offer `/name` and refuses it with a hint to rename the tab, while A1 run on its own still has `/name`."
  ],
  "archiveDigest": "023e1acb384a225ca51ac70794d51ff8ed5b6d692b7670e21c6dbd939a9247b1",
  "specDigest": "481d041eb90d57a46fafe26418ec3b5280baaf925a6bdc2278b0e9650bad0425",
  "tasksDigest": "9aad55609b33f203d3b956b5598cee33b59dfe79f85524ce2b85f2cb0654823d",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
