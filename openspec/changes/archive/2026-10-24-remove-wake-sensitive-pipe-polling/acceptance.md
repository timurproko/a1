# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Windows resident frame transfer wakes on pipe completion rather than short readiness sleeps.
- Pending reads permit independent writes, and connection shutdown safely cancels and drains pending operations.
- Opt-in observations distinguish idle wait, local completion time, and wake epochs without terminal content or process restarts.
- Existing protocol bytes and session ownership remain compatible, and a detected wake gap requests one cached repaint.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "remove-wake-sensitive-pipe-polling",
  "sourcePr": 831,
  "archive": "openspec/changes/archive/2026-10-24-remove-wake-sensitive-pipe-polling/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-24-remove-wake-sensitive-pipe-polling/acceptance.md",
  "finalizedDate": "2026-10-24",
  "specBaseSha": "2b69a496dd9f12b2399002a19498ac9f97d79c90",
  "acceptanceScenarios": [
    "Windows resident frame transfer wakes on pipe completion rather than short readiness sleeps.",
    "Pending reads permit independent writes, and connection shutdown safely cancels and drains pending operations.",
    "Opt-in observations distinguish idle wait, local completion time, and wake epochs without terminal content or process restarts.",
    "Existing protocol bytes and session ownership remain compatible, and a detected wake gap requests one cached repaint."
  ],
  "archiveDigest": "ba3d18817f4f1e3891bf75508d0ce20361b8373a4515a275932b0c708ff0e5c6",
  "specDigest": "45ce472903cec1e97be751010364db680083bd8cd95a33e6135b69db8b38fc39",
  "tasksDigest": "6b1ebad65568d5f64eafa8b8a0459ea3afd59e0b3568ab2f25c53da88f7f4b2b",
  "evidenceDigest": "24c76ed5d91dfc304cd65a83db52fd9e0921667a6d9bd4f5548b853118a2d0f3",
  "knownGaps": []
}
```
