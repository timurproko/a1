# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Stable and development installations show Current, Develop, and Release in the same order.
- Develop shows the published preview's recorded pull request when available, while stable Current and Release remain unattributed.
- Missing preview metadata and registry failures preserve unavailable output, concise diagnostics, and successful version-command exit behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "version-all-channels",
  "sourcePr": 875,
  "archive": "openspec/changes/archive/2026-11-06-version-all-channels/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-06-version-all-channels/acceptance.md",
  "finalizedDate": "2026-11-06",
  "specBaseSha": "fdbfddae64dfff5140ae471515eace2208be9246",
  "acceptanceScenarios": [
    "Stable and development installations show Current, Develop, and Release in the same order.",
    "Develop shows the published preview's recorded pull request when available, while stable Current and Release remain unattributed.",
    "Missing preview metadata and registry failures preserve unavailable output, concise diagnostics, and successful version-command exit behavior."
  ],
  "archiveDigest": "6ecc3537b584bae9c0979ba774d09e0013edf3cafeb946a507aae437b3ef526f",
  "specDigest": "209ae799f38888526a74e0a72aaf558792e89d080e66322426fc304826f6cf6d",
  "tasksDigest": "ab7fd91cb87e68b3d7a6a78a11f37798b8af6b806a2e3a8152eb2f5a0fa0b607",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
