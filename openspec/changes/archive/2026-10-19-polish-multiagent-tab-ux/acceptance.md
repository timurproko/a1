# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Adding an Agent from the plus menu or Alt+A accepts typed input at once and never shows an input notice row.
- A new Agent tab appears with its body, status bar, editor and chip together, without a stray cursor or title flicker.
- Alt+, shows the Settings tab with its content instantly and hides it again while viewed, and Esc does not close it.
- Open strip menus stay steady while Agents stream, with accent-colored hover and dimmed shortcut labels.
- Ctrl+Delete and Ctrl+Backspace delete a whole word in tab rename, and Ctrl+Z and Ctrl+Y undo and redo it.
- Changelog and other dialogs respond to their keys inside a resident tab as in solo.
- Finished Agents show a green check and aborted Agents a red cross, and the strip row stays dark with the clock shown.
- Double Ctrl+C closes A1 from any tab with the solo quit animation when it is enabled.
- Changing the accent color in Settings recolors every running Agent tab.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "polish-multiagent-tab-ux",
  "sourcePr": 808,
  "archive": "openspec/changes/archive/2026-10-19-polish-multiagent-tab-ux/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-19-polish-multiagent-tab-ux/acceptance.md",
  "finalizedDate": "2026-10-19",
  "specBaseSha": "7eb3aad78485fd66b04357b21ddde5638ff4e8ed",
  "acceptanceScenarios": [
    "Adding an Agent from the plus menu or Alt+A accepts typed input at once and never shows an input notice row.",
    "A new Agent tab appears with its body, status bar, editor and chip together, without a stray cursor or title flicker.",
    "Alt+, shows the Settings tab with its content instantly and hides it again while viewed, and Esc does not close it.",
    "Open strip menus stay steady while Agents stream, with accent-colored hover and dimmed shortcut labels.",
    "Ctrl+Delete and Ctrl+Backspace delete a whole word in tab rename, and Ctrl+Z and Ctrl+Y undo and redo it.",
    "Changelog and other dialogs respond to their keys inside a resident tab as in solo.",
    "Finished Agents show a green check and aborted Agents a red cross, and the strip row stays dark with the clock shown.",
    "Double Ctrl+C closes A1 from any tab with the solo quit animation when it is enabled.",
    "Changing the accent color in Settings recolors every running Agent tab."
  ],
  "archiveDigest": "b5af64051cb1d16905d9c1745e35f3bc74d52c3dac540b0ebd1db402227bf275",
  "specDigest": "f0d23c3e25ac39572da9182106146bbc10de05f155fd525bbacfc991cf421f50",
  "tasksDigest": "66e452dd6238feb782918a35d50b427d1a160272e7addfd3b74964a14dc7d899",
  "evidenceDigest": "72cfa69dae46bbf4beb5edeac26e0633b8d0c30c8687f45e396b5886b096b84c",
  "knownGaps": []
}
```
