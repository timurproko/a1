# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- The footer shows the same branch, repository path, and pull request as before, refreshes on the same intervals, and shows only the new session's metadata after a session switch, even when a probe for the previous session was still running.
- Every slash command returns the same result, wording, confirmation, and cancellation as before.
- `/share` uploads to Radius or creates a gist exactly as before; its code and network client load on the first `/share` instead of at startup.
- The session view, usage footer, diagnostics, and configured theme are unchanged.
- `PiEngineRuntime` drops to 23 methods and 14 fields, `PiEngineAdapter` to 37 methods, and `#performWorkflow` leaves the long-function ratchet; the startup graph drops from 195 to 194 files and about 5.6 KB of source.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "engine-split",
  "sourcePr": 886,
  "archive": "openspec/changes/archive/2026-11-08-engine-split/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-08-engine-split/acceptance.md",
  "finalizedDate": "2026-11-08",
  "specBaseSha": "2616e923cf023c556b3645c33d2e3973feb983b7",
  "acceptanceScenarios": [
    "The footer shows the same branch, repository path, and pull request as before, refreshes on the same intervals, and shows only the new session's metadata after a session switch, even when a probe for the previous session was still running.",
    "Every slash command returns the same result, wording, confirmation, and cancellation as before.",
    "`/share` uploads to Radius or creates a gist exactly as before; its code and network client load on the first `/share` instead of at startup.",
    "The session view, usage footer, diagnostics, and configured theme are unchanged.",
    "`PiEngineRuntime` drops to 23 methods and 14 fields, `PiEngineAdapter` to 37 methods, and `#performWorkflow` leaves the long-function ratchet; the startup graph drops from 195 to 194 files and about 5.6 KB of source."
  ],
  "archiveDigest": "81e974223d7a7e2cb4e1e5d19bceb1fc4b7b5c460bf87964ba5105d274ce0c10",
  "specDigest": "afbc768cbfe10d9cc3615271aefefa7ccfbc56c5b882172df2dd2b309a2c2dda",
  "tasksDigest": "01473a71edbed9dfe3a8ccae38406600037b87646a85d28bbdc89ed4726b4ec8",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
