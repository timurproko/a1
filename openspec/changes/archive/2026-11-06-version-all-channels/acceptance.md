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
  "archiveDigest": "71387e47ca40542ba8ad3f2433943ab723e96138d0d32c3e93e589f4d1682028",
  "specDigest": "209ae799f38888526a74e0a72aaf558792e89d080e66322426fc304826f6cf6d",
  "tasksDigest": "d5bb5e76f069f4a8d0e03af2c6f6b9f02470f6ddcaddb84c461a6808a264c893",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
