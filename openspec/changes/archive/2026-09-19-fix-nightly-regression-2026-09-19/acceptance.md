# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `npm run check:deprecated` passes against the pinned Pi 0.85.1 lockfile with the two documented transitive exceptions, and a governance test fails when an exception names a Pi version other than the pinned one.
- The Full regression Windows Node 22 lane packs the candidate with the pinned npm and runs the suite; `prepare-validation-package.mjs` refuses npm 10 with the reason that its pack runs prepare.
- The pi-tui identity and clipboard lifecycle tests pass on Windows Node 22 and Linux by measuring the loader and awaiting channel closure instead of sampling.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-09-19",
  "sourcePr": 502,
  "archive": "openspec/changes/archive/2026-09-19-fix-nightly-regression-2026-09-19/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-19-fix-nightly-regression-2026-09-19/acceptance.md",
  "finalizedDate": "2026-09-19",
  "specBaseSha": "1b731fd8738141d60a3f750a8c648b45556a7245",
  "acceptanceScenarios": [
    "`npm run check:deprecated` passes against the pinned Pi 0.85.1 lockfile with the two documented transitive exceptions, and a governance test fails when an exception names a Pi version other than the pinned one.",
    "The Full regression Windows Node 22 lane packs the candidate with the pinned npm and runs the suite; `prepare-validation-package.mjs` refuses npm 10 with the reason that its pack runs prepare.",
    "The pi-tui identity and clipboard lifecycle tests pass on Windows Node 22 and Linux by measuring the loader and awaiting channel closure instead of sampling."
  ],
  "archiveDigest": "b82357a2dfb38a7dd1a461b1d4ec89eb5a577248dc3d2f20c606d155182647bb",
  "specDigest": "45e7ffa8096da06081c6bbd2c5a7e922ead214b65a0cad546ffec1f3379bb16f",
  "tasksDigest": "65c94b5eec62e18f348750c8768a0335bbfefd158b98545789d034b924467035",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
