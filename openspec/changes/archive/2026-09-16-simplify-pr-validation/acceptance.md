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
  "archiveDigest": "bac37fdd44e42ad2c724315074e9c8ffede51949799ab0d413eaaab7f154ad2b",
  "specDigest": "62b7be34487f818ddebae7bb78ec66f3b2bd46ee20a3b12b89d0ae6c33d5ad73",
  "tasksDigest": "6166a8b6ff624e17dcd225e6bb5e2ad0af09d721c812498f13000b088f1d3d18",
  "evidenceDigest": "87c257d17ebd5df172673979bd8626170e77d8d1642561452b3516d88825c5f8",
  "knownGaps": []
}
```
