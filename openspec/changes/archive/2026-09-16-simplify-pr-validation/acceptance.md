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
  "archiveDigest": "c1b40e2bb5468c147d9464a0d0c7238c9128741844890d422f0db201e3e43231",
  "specDigest": "376f6d80b65e33816ec9e579604bd9c49b1c8c75a26126e76e48d62c56d5bbb3",
  "tasksDigest": "d2decad4c13463919ee78f213f6e175d446d725d66f833d6872f8d1f38b2f015",
  "evidenceDigest": "cb9dc7ed69024e67230a9ab5b606dac66bc2e8511d938e1dd42acbc1d322b142",
  "knownGaps": []
}
```
