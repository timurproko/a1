# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Clicking `+` with the default plus menu adds an Agent at once, without a menu.
- Right-clicking `+` shows `Configure`, which opens the `Plus Menu` modal over the current tab listing Agent, Settings, and Changelog; `Space` toggles a kind, `+` then offers the enabled kinds, and with none enabled `+` is hidden.
- Settings shows a `Tab Bar` section whose `Plus menu` entry opens the same `Plus Menu` modal.
- `Alt+/` dims the frame and opens a palette of Agent, Settings, and Changelog; typing filters, arrows move, `Enter` opens, `Esc` closes, and the mouse does nothing.
- Choosing Changelog from the palette opens one `Changelog` tab at once that `Esc` does not close, and resident Agents no longer offer `/changelog`.
- A new Agent, Settings, or Changelog tab appears in the tab bar at once over an empty area and its content fades in like the resize fade, which fades the tab bar too; from the landing, the logo, folder, and version wipe away first.
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
  "specBaseSha": "a51b16feea8a32e61cd59c68a2ecfbe4c7f875b1",
  "acceptanceScenarios": [
    "Clicking `+` with the default plus menu adds an Agent at once, without a menu.",
    "Right-clicking `+` shows `Configure`, which opens the `Plus Menu` modal over the current tab listing Agent, Settings, and Changelog; `Space` toggles a kind, `+` then offers the enabled kinds, and with none enabled `+` is hidden.",
    "Settings shows a `Tab Bar` section whose `Plus menu` entry opens the same `Plus Menu` modal.",
    "`Alt+/` dims the frame and opens a palette of Agent, Settings, and Changelog; typing filters, arrows move, `Enter` opens, `Esc` closes, and the mouse does nothing.",
    "Choosing Changelog from the palette opens one `Changelog` tab at once that `Esc` does not close, and resident Agents no longer offer `/changelog`.",
    "A new Agent, Settings, or Changelog tab appears in the tab bar at once over an empty area and its content fades in like the resize fade, which fades the tab bar too; from the landing, the logo, folder, and version wipe away first.",
    "The tab rename selection shows a blue background with unchanged text color.",
    "`/name` in an Agent renames its tab, and renaming the tab renames the session."
  ],
  "archiveDigest": "0c36bc0cc899a3c784d5b09aea3a28d30986e16030369567f5cea90f04b3bac2",
  "specDigest": "65fc50f32ef1715aec4dad7e2188026ba651e7d3238f3e11a12e28eb0a59d100",
  "tasksDigest": "651eff8c4478fb7713984659b9fe2594a4041dffddcba24d38ceb7830d8c8507",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
