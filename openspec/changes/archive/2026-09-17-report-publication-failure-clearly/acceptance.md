# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A failed development publication ends with one `[develop]` line naming the failed jobs and their recorded messages, a non-zero exit code, and no stack trace.
- The run identifier and its URL are printed before the command starts waiting on the run.
- A failed publication run's summary lists the failed jobs and the non-zero validation invocations while the outcome requirement still decides the result job.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "report-publication-failure-clearly",
  "sourcePr": 448,
  "archive": "openspec/changes/archive/2026-09-17-report-publication-failure-clearly/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-17-report-publication-failure-clearly/acceptance.md",
  "finalizedDate": "2026-09-17",
  "specBaseSha": "5d1b93d7872d76ae0df7fbd0eb7a2f1d4edeea53",
  "acceptanceScenarios": [
    "A failed development publication ends with one `[develop]` line naming the failed jobs and their recorded messages, a non-zero exit code, and no stack trace.",
    "The run identifier and its URL are printed before the command starts waiting on the run.",
    "A failed publication run's summary lists the failed jobs and the non-zero validation invocations while the outcome requirement still decides the result job."
  ],
  "archiveDigest": "06fcca0791ded93dc3db50ad305defc1e94c470706ef7a50891e17b75123d0f9",
  "specDigest": "dc2bcc836ae978c1b7605bd0b314ff0294236751c3354c5d1b03e73f2b5dde10",
  "tasksDigest": "e0cb0a15057a1214b57083444fa6902c5a5e07168e5b04f223465912a564da63",
  "evidenceDigest": "24bcddf42bc2095bd17a2bbfb2fa27b1912bb074db55d2a6295b5d4383374166",
  "knownGaps": []
}
```
