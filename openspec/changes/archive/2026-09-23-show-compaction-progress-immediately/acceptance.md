# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Observable bare-A1 compactions show `Compacting(0%)…` during preparation and authentication, before the summary stream opens.
- Streamed summary text advances the monotonic estimate below 100%, and completing compaction clears the progress state.
- Sessions without an observable stream and the `a1 pi` comparison route retain the plain `Compacting…` fallback.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "show-compaction-progress-immediately",
  "sourcePr": 572,
  "archive": "openspec/changes/archive/2026-09-23-show-compaction-progress-immediately/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-23-show-compaction-progress-immediately/acceptance.md",
  "finalizedDate": "2026-09-23",
  "specBaseSha": "2e7328372969d99cd9bd1f0bb33f371c4e6fdd2f",
  "acceptanceScenarios": [
    "Observable bare-A1 compactions show `Compacting(0%)…` during preparation and authentication, before the summary stream opens.",
    "Streamed summary text advances the monotonic estimate below 100%, and completing compaction clears the progress state.",
    "Sessions without an observable stream and the `a1 pi` comparison route retain the plain `Compacting…` fallback."
  ],
  "archiveDigest": "557e22cc795e5cc1734bd6549e5b39d48fdabeb2067e79dea8ff8a84859c0888",
  "specDigest": "77b053df9ef759441e40d4bad2f79c535d93703b6fe1140ac98cb36386e0be94",
  "tasksDigest": "786723fc3cc94a5cda88bbc87def7a1532f15c713d1676abeff057693d6d1b28",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
