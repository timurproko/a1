# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A viewed tab that reports stalled or unresponsive opens a centered `Agent stalled` dialog with Restart selected and Close beneath it, and no notice row appears under the strip.
- Enter on Restart sends one tab restart request and closes the dialog; Enter on Close runs the same close path as the chip context menu's Close.
- Esc closes the dialog without reaching the tab and does not reopen it for the same stall; a following Esc interrupts the tab as before.
- The strip and tab body are dimmed while the dialog is open and repainted in their original colours when it closes or the Agent recovers.
- Switching to another tab closes the dialog, and switching to a tab that is already stalled opens it.
- A bare `R` on a stalled tab is typed into the tab instead of restarting it, while assigned tab shortcuts such as `Alt+W` keep working over the dialog.
- The session shell appends no `No progress` line to the transcript when a resident tab stalls; the strip status still reports stalled.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "stalled-agent-dialog",
  "sourcePr": 816,
  "archive": "openspec/changes/archive/2026-10-23-stalled-agent-dialog/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-23-stalled-agent-dialog/acceptance.md",
  "finalizedDate": "2026-10-23",
  "specBaseSha": "cb802f39bbc4bfdc5165bd140fd7cb227c2a0932",
  "acceptanceScenarios": [
    "A viewed tab that reports stalled or unresponsive opens a centered `Agent stalled` dialog with Restart selected and Close beneath it, and no notice row appears under the strip.",
    "Enter on Restart sends one tab restart request and closes the dialog; Enter on Close runs the same close path as the chip context menu's Close.",
    "Esc closes the dialog without reaching the tab and does not reopen it for the same stall; a following Esc interrupts the tab as before.",
    "The strip and tab body are dimmed while the dialog is open and repainted in their original colours when it closes or the Agent recovers.",
    "Switching to another tab closes the dialog, and switching to a tab that is already stalled opens it.",
    "A bare `R` on a stalled tab is typed into the tab instead of restarting it, while assigned tab shortcuts such as `Alt+W` keep working over the dialog.",
    "The session shell appends no `No progress` line to the transcript when a resident tab stalls; the strip status still reports stalled."
  ],
  "archiveDigest": "d6918e3cb40c22a90938a9b445a292ab09793c28650770f2d82426065752976e",
  "specDigest": "7c07c64b580f9e8b7b3a30a51e529d27fdfdcd2303537b4e7adcdba748404ed2",
  "tasksDigest": "ef909cb679a194443c9e022cd02961cc175b97bcfb0e9a17efdb1cee4bd4b8f1",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
