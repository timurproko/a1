# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Creating an Agent from the launcher, shortcut, or palette immediately shows one pending tab and a starting body instead of the previous Agent.
- Input entered during startup reaches only the new Agent when its complete screen replaces the pending presentation.
- A refused creation restores the previous view without a ghost tab or leaked input, while switching tabs does not let a late Agent steal the view.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "instant-agent-tab",
  "sourcePr": 837,
  "archive": "openspec/changes/archive/2026-10-26-instant-agent-tab/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-26-instant-agent-tab/acceptance.md",
  "finalizedDate": "2026-10-26",
  "specBaseSha": "e9340bc72d5ad0c2a21ef4f2d11ce724cd10854c",
  "acceptanceScenarios": [
    "Creating an Agent from the launcher, shortcut, or palette immediately shows one pending tab and a starting body instead of the previous Agent.",
    "Input entered during startup reaches only the new Agent when its complete screen replaces the pending presentation.",
    "A refused creation restores the previous view without a ghost tab or leaked input, while switching tabs does not let a late Agent steal the view."
  ],
  "archiveDigest": "db573f1c33f27cb33b838bdcead86f290f82069102e9c7f526e2b64fb9f29b0f",
  "specDigest": "e369d332e3f6fc7d2269e4a79133d18c37f42a1359378d25ef1b11dc229e3a8b",
  "tasksDigest": "9d88ba484a9c3502d46909049e31907c34081f6a99fc0319a258c22579930ab6",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
