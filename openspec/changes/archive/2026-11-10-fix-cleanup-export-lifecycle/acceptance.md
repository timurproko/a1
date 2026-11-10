# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Default bare-A1 exports use persistent user storage without replacing older exports; explicit destinations and comparison behavior remain intact.
- Cleanup reports file and development-process blockers together without exposing file contents or complete command lines.
- Only explicitly authorized exact cleanup stops identity-verified development processes, protecting caller ancestry and unrelated checkouts.
- A selected legacy export is durably preserved outside its worktree before source removal, and interrupted verified steps resume without overwriting files.
- Dirty, linked, active, unverifiable, and ineligible candidates remain protected; ordinary sweeps never stop processes or move exports.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-cleanup-export-lifecycle",
  "sourcePr": 902,
  "archive": "openspec/changes/archive/2026-11-10-fix-cleanup-export-lifecycle/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-10-fix-cleanup-export-lifecycle/acceptance.md",
  "finalizedDate": "2026-11-10",
  "specBaseSha": "726730e263055d034f77466a9464dbf2a9f12e98",
  "acceptanceScenarios": [
    "Default bare-A1 exports use persistent user storage without replacing older exports; explicit destinations and comparison behavior remain intact.",
    "Cleanup reports file and development-process blockers together without exposing file contents or complete command lines.",
    "Only explicitly authorized exact cleanup stops identity-verified development processes, protecting caller ancestry and unrelated checkouts.",
    "A selected legacy export is durably preserved outside its worktree before source removal, and interrupted verified steps resume without overwriting files.",
    "Dirty, linked, active, unverifiable, and ineligible candidates remain protected; ordinary sweeps never stop processes or move exports."
  ],
  "archiveDigest": "7663b22c42b81ec9dfae75efc2f44da7b3aca12ee000a4c960074764d7f865b3",
  "specDigest": "e6d4960c4e63a687030286051cb892776a25e7a538ba78300920b3b156847a41",
  "tasksDigest": "98a514ab20075c1c1083b644d82f6e63ca33b5da628f5d55a75f9ab57ac39fe0",
  "evidenceDigest": "becec552d28ea38799dc5f55bf01888b3651266625175c80c0a72136bd3124f0",
  "knownGaps": []
}
```
