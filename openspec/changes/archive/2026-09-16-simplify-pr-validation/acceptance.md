# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- An ordinary owned-path change runs the bounded PR core and only its reviewed unit and integration owners, while unknown or validation-authority paths select complete coverage.
- Re-running failed jobs on an unchanged run reuses untouched successful attempts, while a current failure or changed head or selection blocks the aggregate.
- Fast, full, and release commands retain complete tests and platform coverage, and exact-artifact gates reject stale or tampered build and package evidence.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "simplify-pr-validation",
  "sourcePr": 428,
  "archive": "openspec/changes/archive/2026-09-16-simplify-pr-validation/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-16-simplify-pr-validation/acceptance.md",
  "finalizedDate": "2026-09-16",
  "specBaseSha": "049884c37766a6e230d09164cdbd97a58cf0e749",
  "acceptanceScenarios": [
    "An ordinary owned-path change runs the bounded PR core and only its reviewed unit and integration owners, while unknown or validation-authority paths select complete coverage.",
    "Re-running failed jobs on an unchanged run reuses untouched successful attempts, while a current failure or changed head or selection blocks the aggregate.",
    "Fast, full, and release commands retain complete tests and platform coverage, and exact-artifact gates reject stale or tampered build and package evidence."
  ],
  "archiveDigest": "1ce44c61aaf6ebdeae9cda7e24b3cdc5410f150fb18da823073c218e6191ba35",
  "specDigest": "b5cd301db323dd46d1690aec4316a5a81e73b2b863018fe6d03638fb32745fb7",
  "tasksDigest": "872be75ddc9a6ea9ac0c83d36a31056d94f2f4b91ca70f03b6c476d1c53e2894",
  "evidenceDigest": "772c5074f3661857094a02dd898d6d2cb1d93dbe3b9a36aeaed85e0e04862f8b",
  "knownGaps": []
}
```
