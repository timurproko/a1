# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Resizing the outer terminal pre-fits globally hidden, unclaimed resident tabs without painting them.
- Switching tabs exposes the target only at the current dimensions, with no old-size flash or reflow jump.
- During active terminal resizing, only centered live dimension text such as `Resize 120 × 40` is visible; the strip, child UI, overlays, and cursor are hidden.
- After resizing stops, the dimension curtain remains briefly before the complete settled UI appears dimmed with its child cursor hidden.
- The dimmed UI returns to normal intensity after a short transition, and ordinary updates during that transition remain dimmed.
- Resuming resize during the transition immediately restores the dimension curtain.
- A stalled holder cannot leave the resize curtain visible indefinitely.
- Reattaching to an existing tab from a differently sized terminal refits the child before its fresh surface commits.
- Tabs viewed or controlled by another client remain at that client's geometry.
- A read-only spectator does not resize any shared child or claim input merely by switching views.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "refit-tabs-after-resize",
  "sourcePr": 823,
  "archive": "openspec/changes/archive/2026-10-24-refit-tabs-after-resize/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-24-refit-tabs-after-resize/acceptance.md",
  "finalizedDate": "2026-10-24",
  "specBaseSha": "63a5d9ec34bcda4632c48015cd1da0857f8ea545",
  "acceptanceScenarios": [
    "Resizing the outer terminal pre-fits globally hidden, unclaimed resident tabs without painting them.",
    "Switching tabs exposes the target only at the current dimensions, with no old-size flash or reflow jump.",
    "During active terminal resizing, only centered live dimension text such as `Resize 120 × 40` is visible; the strip, child UI, overlays, and cursor are hidden.",
    "After resizing stops, the dimension curtain remains briefly before the complete settled UI appears dimmed with its child cursor hidden.",
    "The dimmed UI returns to normal intensity after a short transition, and ordinary updates during that transition remain dimmed.",
    "Resuming resize during the transition immediately restores the dimension curtain.",
    "A stalled holder cannot leave the resize curtain visible indefinitely.",
    "Reattaching to an existing tab from a differently sized terminal refits the child before its fresh surface commits.",
    "Tabs viewed or controlled by another client remain at that client's geometry.",
    "A read-only spectator does not resize any shared child or claim input merely by switching views."
  ],
  "archiveDigest": "2f245977bf753b8ec9fe6938e7419ad1141d63ccd5ecab24eed74cf3df1e947b",
  "specDigest": "17dcbaf9e7dde545174c1f7b872fe418332998cb9905d98839da9662f73a62bd",
  "tasksDigest": "8250a97f2d737fab86456c5a2f75c427d10e7ae5591ee082ad9929b8f6b3c9d6",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
