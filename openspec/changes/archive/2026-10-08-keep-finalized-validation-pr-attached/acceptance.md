# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Automated first finalization and same-path re-finalization bind the exact pushed head and trigger native PR-associated validation whose lane progress is visible on the pull request.
- Missing or stale head bindings defer protected validation, while concurrent body or head changes are preserved and retried without stale metadata writes.
- Manual Development validation remains available as a diagnostic run but cannot publish the protected PR merge context.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "keep-finalized-validation-pr-attached",
  "sourcePr": 721,
  "archive": "openspec/changes/archive/2026-10-08-keep-finalized-validation-pr-attached/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-08-keep-finalized-validation-pr-attached/acceptance.md",
  "finalizedDate": "2026-10-08",
  "specBaseSha": "40f750e915534a530844d44575fa460f37a7a2bd",
  "acceptanceScenarios": [
    "Automated first finalization and same-path re-finalization bind the exact pushed head and trigger native PR-associated validation whose lane progress is visible on the pull request.",
    "Missing or stale head bindings defer protected validation, while concurrent body or head changes are preserved and retried without stale metadata writes.",
    "Manual Development validation remains available as a diagnostic run but cannot publish the protected PR merge context."
  ],
  "archiveDigest": "9ac1b6ba996ac644b1e9920970ab876c7997b5aa547e2bc6afb45543db3dd7d8",
  "specDigest": "24ae0f35f1819f918a0d704b80efc18cf5bc2893fd7ae60c677e8415ef235f8f",
  "tasksDigest": "3d081095a31a7256dc4da1dbf71a76caf8ea786934ec458d47e1f7d9d4b66271",
  "evidenceDigest": "d242889140ab41f2c8135aedd088ce6917c679221d345cb63b5364c82a51f1d5",
  "knownGaps": []
}
```
