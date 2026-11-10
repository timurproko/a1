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
  "archiveDigest": "3eb3c726476d83eb6498c6469ca6ff8735af0bab3fe1d0578f4e671b4bffd73d",
  "specDigest": "e6d4960c4e63a687030286051cb892776a25e7a538ba78300920b3b156847a41",
  "tasksDigest": "9f1e064047aa52bb7a099ded30d9300fb7db50106f7b058f21d68c16d1a83d65",
  "evidenceDigest": "7e5e2bfc8ce434bd2d43822e549a33591c8148ccc3e7e49eabf606fdb17832d0",
  "knownGaps": []
}
```
