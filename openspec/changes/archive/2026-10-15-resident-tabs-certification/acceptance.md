# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Every published release contains a hash-verified terminal host for each supported platform, and an altered binary is never executed
- `a1 update` during a streaming tab leaves the turn running and its release retained
- `a1 tabs` with no host running reports none and starts nothing
- `a1 tabs host stop` stops all tabs and the host, even when the host is unresponsive
- `a1 tabs doctor` produces a bundle with no prompts, terminal content, journals, or credentials
- `a1 solo` runs the direct UI and never writes a session held by a live tab

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "resident-tabs-certification",
  "sourcePr": 750,
  "archive": "openspec/changes/archive/2026-10-15-resident-tabs-certification/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-15-resident-tabs-certification/acceptance.md",
  "finalizedDate": "2026-10-15",
  "specBaseSha": "96e54a0afde25dbd7f8a6c098ff196a7e63989a4",
  "acceptanceScenarios": [
    "Every published release contains a hash-verified terminal host for each supported platform, and an altered binary is never executed",
    "`a1 update` during a streaming tab leaves the turn running and its release retained",
    "`a1 tabs` with no host running reports none and starts nothing",
    "`a1 tabs host stop` stops all tabs and the host, even when the host is unresponsive",
    "`a1 tabs doctor` produces a bundle with no prompts, terminal content, journals, or credentials",
    "`a1 solo` runs the direct UI and never writes a session held by a live tab"
  ],
  "archiveDigest": "2ec26de39987b7c4e0b150c1ebd7a767a1c25e0d6f66a045c759ab7311090ceb",
  "specDigest": "0bb7adb31f52726c3ed5ee5a5a1bbd4b4474a9ef573b6bc4e5b5e4dfe2ba91b1",
  "tasksDigest": "482908193d2f01895b58cf8aa86ea8a902573646e300562e70bf7a78bbe119eb",
  "evidenceDigest": "4cc85620eef91cb76763e41ad65ffc2f24f4fd2081abf142ce4dccf3074e2381",
  "knownGaps": []
}
```
