# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Resizing the outer terminal pre-fits globally hidden, unclaimed resident tabs without painting them.
- Switching tabs exposes the target only at the current dimensions, with no old-size flash or reflow jump.
- During active terminal resizing, only centered live dimension text such as `Resize 120 × 40` is visible; the strip, child UI, overlays, and cursor are hidden.
- After resizing settles and current geometry is available, the complete UI returns in one synchronized repaint without intermediate reflow.
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
  "specBaseSha": "3b474cdf46e31c9249b5cd3a6fb1833154c9981a",
  "acceptanceScenarios": [
    "Resizing the outer terminal pre-fits globally hidden, unclaimed resident tabs without painting them.",
    "Switching tabs exposes the target only at the current dimensions, with no old-size flash or reflow jump.",
    "During active terminal resizing, only centered live dimension text such as `Resize 120 × 40` is visible; the strip, child UI, overlays, and cursor are hidden.",
    "After resizing settles and current geometry is available, the complete UI returns in one synchronized repaint without intermediate reflow.",
    "A stalled holder cannot leave the resize curtain visible indefinitely.",
    "Reattaching to an existing tab from a differently sized terminal refits the child before its fresh surface commits.",
    "Tabs viewed or controlled by another client remain at that client's geometry.",
    "A read-only spectator does not resize any shared child or claim input merely by switching views."
  ],
  "archiveDigest": "571cb344d50b3a1016f34eb8e6164d9809ac04e5fb3b09bc78195dd2ecbe63bd",
  "specDigest": "125b4829ebe1e84c9a32fb02e288533eb6449f1726ee9e489fef09d85d77f982",
  "tasksDigest": "b008aa0c4da06c677d85146b41d42d3f689d645f36dcecf26ed866acc74d9cb5",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
