# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Resizing the outer terminal pre-fits globally hidden, unclaimed resident tabs without painting them.
- Switching tabs exposes the target only at the current dimensions, with no old-size flash or reflow jump.
- During active terminal resizing, only quiet centered `🖥️` and live dimension text such as `Resize 120 x 40` occupy consecutive rows; the strip, child UI, overlays, and cursor are hidden.
- After resizing stops, the curtain remains for 220 ms before the complete settled UI appears dimmed with its cursor hidden, then returns to normal; updates remain dimmed and resumed resizing restores the curtain.
- A stalled holder cannot leave the resize curtain visible indefinitely.
- Reattaching to an existing tab from a differently sized terminal refits the child before its fresh surface commits.
- Tabs viewed or controlled by another client remain at that client's geometry.
- A read-only spectator does not resize any shared child or claim input merely by switching views.
- Settings empty search results show lowered adjacent rows with `👀` directly above `No settings found` without trailing punctuation.
- Launching an A1 session at its already established geometry does not flash the resize curtain.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "refit-tabs-after-resize",
  "sourcePr": 823,
  "archive": "openspec/changes/archive/2026-10-24-refit-tabs-after-resize/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-24-refit-tabs-after-resize/acceptance.md",
  "finalizedDate": "2026-10-24",
  "specBaseSha": "249897fcdddca6cfba2e74efcb28c73b2b8d5c18",
  "acceptanceScenarios": [
    "Resizing the outer terminal pre-fits globally hidden, unclaimed resident tabs without painting them.",
    "Switching tabs exposes the target only at the current dimensions, with no old-size flash or reflow jump.",
    "During active terminal resizing, only quiet centered `🖥️` and live dimension text such as `Resize 120 x 40` occupy consecutive rows; the strip, child UI, overlays, and cursor are hidden.",
    "After resizing stops, the curtain remains for 220 ms before the complete settled UI appears dimmed with its cursor hidden, then returns to normal; updates remain dimmed and resumed resizing restores the curtain.",
    "A stalled holder cannot leave the resize curtain visible indefinitely.",
    "Reattaching to an existing tab from a differently sized terminal refits the child before its fresh surface commits.",
    "Tabs viewed or controlled by another client remain at that client's geometry.",
    "A read-only spectator does not resize any shared child or claim input merely by switching views.",
    "Settings empty search results show lowered adjacent rows with `👀` directly above `No settings found` without trailing punctuation.",
    "Launching an A1 session at its already established geometry does not flash the resize curtain."
  ],
  "archiveDigest": "7ce169c71e0a431ba969b01829e898a3f8e875649e660fde3ab87b7a506410cf",
  "specDigest": "70df7f4c2fb8b3e0cdc5b5c5f9b159ed748fb30a79b64452875ee3d4c0faccd9",
  "tasksDigest": "193faaff87c33b29c76cc9eb72daedca4432c5c58488bc59be4cd40d5d1297e9",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
