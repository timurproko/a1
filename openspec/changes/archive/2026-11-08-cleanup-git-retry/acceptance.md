# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- `local-cleanup.test.ts` passes on Windows when its four node test files run in parallel, where it previously failed with `ENOENT: realpath ''`.
- On Windows, repository discovery retries an empty common-directory answer and continues once Git returns the path.
- A common-directory answer that stays empty fails cleanup with `git-operation-failed` and never resolves an empty path.
- Sweep, handoff, complete and discard behave exactly as before when Git answers normally.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "cleanup-git-retry",
  "sourcePr": 890,
  "archive": "openspec/changes/archive/2026-11-08-cleanup-git-retry/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-08-cleanup-git-retry/acceptance.md",
  "finalizedDate": "2026-11-08",
  "specBaseSha": "4622f3555d1443c0c318ab7112bde6e18580cc97",
  "acceptanceScenarios": [
    "`local-cleanup.test.ts` passes on Windows when its four node test files run in parallel, where it previously failed with `ENOENT: realpath ''`.",
    "On Windows, repository discovery retries an empty common-directory answer and continues once Git returns the path.",
    "A common-directory answer that stays empty fails cleanup with `git-operation-failed` and never resolves an empty path.",
    "Sweep, handoff, complete and discard behave exactly as before when Git answers normally."
  ],
  "archiveDigest": "3c09a22f40343e1f86967337e8a38f053b3720ab06e6b5dfa59768687da506e4",
  "specDigest": "676c1321bbda87891452c1d9fa2e74c36f25378dbe9b186fb640a5d57c452682",
  "tasksDigest": "905f8cc2534e45ed2a109bf201b9cc0127062e1421b737c11c7ab5113054081b",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
