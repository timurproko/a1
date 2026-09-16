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
  "archiveDigest": "24bf5b24113bbec340b8f9117684e5c899f1226a01e4c52540949cbeca82203a",
  "specDigest": "376f6d80b65e33816ec9e579604bd9c49b1c8c75a26126e76e48d62c56d5bbb3",
  "tasksDigest": "940ae7db360d23ff15e77c91461eeb43b0b7a7aa6c4cdae0e2643fb1004419f8",
  "evidenceDigest": "661dda9e505e750cff55222ccd710b61a920d9eb386e62f66e876452d85dcabf",
  "knownGaps": []
}
```
