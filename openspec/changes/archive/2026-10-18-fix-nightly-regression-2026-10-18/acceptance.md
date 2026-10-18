# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- The 2026-10-18 Full regression failure on develop is repaired, and its failed lanes pass on the fix head without weakened assertions, budgets, timeouts, or coverage.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-10-18",
  "sourcePr": 803,
  "archive": "openspec/changes/archive/2026-10-18-fix-nightly-regression-2026-10-18/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-18-fix-nightly-regression-2026-10-18/acceptance.md",
  "finalizedDate": "2026-10-18",
  "specBaseSha": "a57b841b8cb84684c9bfa4e88342707f1074b2d5",
  "acceptanceScenarios": [
    "The 2026-10-18 Full regression failure on develop is repaired, and its failed lanes pass on the fix head without weakened assertions, budgets, timeouts, or coverage."
  ],
  "archiveDigest": "5e5e6fb111e2a07724979e2a467920b67b6ee9219a54ee38012be9260a5fe1ff",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "dacb79ced8b85e6c12ef4b817ebfed7ec3341c9366b58a915451322ae24039fd",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
