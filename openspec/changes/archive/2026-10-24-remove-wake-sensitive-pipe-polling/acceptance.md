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
  "specBaseSha": "94d20148619a7a3e25f5b84a6e6684ed1cab7973",
  "acceptanceScenarios": [
    "Windows resident frame transfer wakes on pipe completion rather than short readiness sleeps.",
    "Pending reads permit independent writes, and connection shutdown safely cancels and drains pending operations.",
    "Opt-in observations distinguish idle wait, local completion time, and wake epochs without terminal content or process restarts.",
    "Existing protocol bytes and session ownership remain compatible, and a detected wake gap requests one cached repaint."
  ],
  "archiveDigest": "7f55a46d92527542b09e2636d714d998640f8f6e3617bde97a6306fd6249877a",
  "specDigest": "84952a0d0b52fbab871771ac8210183390c46ac0fd17bad45d83ddc2b42beffa",
  "tasksDigest": "6b1ebad65568d5f64eafa8b8a0459ea3afd59e0b3568ab2f25c53da88f7f4b2b",
  "evidenceDigest": "9305690a98e8e8b86b6cf74494520c7a27309ff0d3e0f8b0032f2db21288b883",
  "knownGaps": []
}
```
