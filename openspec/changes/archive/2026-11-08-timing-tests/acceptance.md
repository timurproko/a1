# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- "runs two concurrent launches independently" passes whichever launch reaches `spawn` first, including under parallel load on Windows where it previously timed out.
- Closing one launch's UI child still settles exactly one launch with that child's exit code, and the other settles only when its own child closes.
- Both launches still receive distinct exit-notice paths and select the target release.
- The compaction-progress test no longer fails with `EBUSY` when removing its temporary directory after passing, and a handle that never closes still fails it.
- No test gained a longer timeout, a new execution class, or an automatic retry of its assertions.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "timing-tests",
  "sourcePr": 891,
  "archive": "openspec/changes/archive/2026-11-08-timing-tests/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-08-timing-tests/acceptance.md",
  "finalizedDate": "2026-11-08",
  "specBaseSha": "9e6a0f1a13c35b50c867f8d11e2e754f19a2dd27",
  "acceptanceScenarios": [
    "\"runs two concurrent launches independently\" passes whichever launch reaches `spawn` first, including under parallel load on Windows where it previously timed out.",
    "Closing one launch's UI child still settles exactly one launch with that child's exit code, and the other settles only when its own child closes.",
    "Both launches still receive distinct exit-notice paths and select the target release.",
    "The compaction-progress test no longer fails with `EBUSY` when removing its temporary directory after passing, and a handle that never closes still fails it.",
    "No test gained a longer timeout, a new execution class, or an automatic retry of its assertions."
  ],
  "archiveDigest": "fe29a32678cb680e3d90b88e99fae2b39e4b9d3bb9b47b7dd403d7ec9e4ad87b",
  "specDigest": "b85bf850ca5ed2703e2ffcc7977e8a77acdf912fd1d9f6b3f70ecefe724ee493",
  "tasksDigest": "3dc319fccb77946d21ebf514b7de9052c506399c6097803c6dafe57f50d8c69e",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
