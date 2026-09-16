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
  "archiveDigest": "9444aac52c5eaa16d9fae4285271422a38616604c8802278df3ea8c1ee192a66",
  "specDigest": "eef98d6124e3309fdefeeb657463992efb62e07d20186a00b776a85d68956e53",
  "tasksDigest": "24b5d0fa6b6b42120936c4077fd487c9d003198ebb06254bf09df9a880f4524f",
  "evidenceDigest": "d63e4d1667936ca6082fa5af026aecc2ab6bed6ba521b52bdd4f79c853adaab1",
  "knownGaps": []
}
```
