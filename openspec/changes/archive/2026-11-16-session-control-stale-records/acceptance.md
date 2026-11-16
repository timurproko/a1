# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A starting session removes discovery records whose owner pid no longer exists and leaves records of live processes and unparseable records in place.
- A lookup resolves a live session when the directory also holds hundreds of dead-owner records, and removes the dead records it examined.
- `control-limit` is still returned when more than 256 live candidates are examined or the directory exceeds the raw ceiling, without selecting a session.
- An injected process inspector used by tests never deletes records; only the real probe prunes.
- The start-time sweep stops at its time budget and never prevents the endpoint from starting.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "session-control-stale-records",
  "sourcePr": 959,
  "archive": "openspec/changes/archive/2026-11-16-session-control-stale-records/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-16-session-control-stale-records/acceptance.md",
  "finalizedDate": "2026-11-16",
  "specBaseSha": "8dc9767e3eed31c4c59defef473613a506a5db47",
  "acceptanceScenarios": [
    "A starting session removes discovery records whose owner pid no longer exists and leaves records of live processes and unparseable records in place.",
    "A lookup resolves a live session when the directory also holds hundreds of dead-owner records, and removes the dead records it examined.",
    "`control-limit` is still returned when more than 256 live candidates are examined or the directory exceeds the raw ceiling, without selecting a session.",
    "An injected process inspector used by tests never deletes records; only the real probe prunes.",
    "The start-time sweep stops at its time budget and never prevents the endpoint from starting."
  ],
  "archiveDigest": "3611ae605e8746a7446e97ef560e30a786ad5e2e0ae689370a3e61e4c11d99a8",
  "specDigest": "4c51e384247d13a95da26882350db002543408134b902c898213de14ee9b02cc",
  "tasksDigest": "d66e3ca404439f98e1c1814959e400ecd08ca94ab96c453e120e602d6135241d",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
