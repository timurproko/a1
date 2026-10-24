# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Switching to a tab after resizing fits its content to the current terminal without another input event.
- Reattaching to an existing tab from a differently sized terminal refits the child before its fresh surface commits.
- A read-only spectator does not resize the shared child or claim input merely by switching views.

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
    "Switching to a tab after resizing fits its content to the current terminal without another input event.",
    "Reattaching to an existing tab from a differently sized terminal refits the child before its fresh surface commits.",
    "A read-only spectator does not resize the shared child or claim input merely by switching views."
  ],
  "archiveDigest": "e96a3274a5a255732618b480bbd43a21bed7d1ffa25d43a2c8e75ed4d19fcaf5",
  "specDigest": "81c2b532f1366d7357253f17d3b4a33e3253102e58ac46edfbeaba8348f16624",
  "tasksDigest": "66876bb41278bf4bf0a75b25b4e72dcaa516e81028e5584574a8bfb5df0fdb5d",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
