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
  "specBaseSha": "ff11eab6c7a9c24766375e4625e5300c92708866",
  "acceptanceScenarios": [
    "Every published release contains a hash-verified terminal host for each supported platform, and an altered binary is never executed",
    "`a1 update` during a streaming tab leaves the turn running and its release retained",
    "`a1 tabs` with no host running reports none and starts nothing",
    "`a1 tabs host stop` stops all tabs and the host, even when the host is unresponsive",
    "`a1 tabs doctor` produces a bundle with no prompts, terminal content, journals, or credentials",
    "`a1 solo` runs the direct UI and never writes a session held by a live tab"
  ],
  "archiveDigest": "00f071ad52d8e97df32eeec79b061572f5dadfa067ff4edc098f3fba5b69bd7d",
  "specDigest": "0bb7adb31f52726c3ed5ee5a5a1bbd4b4474a9ef573b6bc4e5b5e4dfe2ba91b1",
  "tasksDigest": "1d68e2f09a858d12a9b3c0bab0dc12002179cde031f57f82c04a8e734ce5faa6",
  "evidenceDigest": "7a9433d7d2e2076776e07eb2d6f945356e28251d1da2442e5e137c9049f690a7",
  "knownGaps": []
}
```
