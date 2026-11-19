# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Transient Windows fixture locks are retried while persistent cleanup failures still fail after bounded backoff.
- Pi runtime integration assertions and their existing deadlines remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-09-26",
  "sourcePr": 597,
  "archive": "openspec/changes/archive/2026-09-28-fix-nightly-regression-2026-09-26/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-28-fix-nightly-regression-2026-09-26/acceptance.md",
  "finalizedDate": "2026-09-28",
  "specBaseSha": "bb2aa9aee054c7612ba453c96456a7e75650da24",
  "acceptanceScenarios": [
    "Transient Windows fixture locks are retried while persistent cleanup failures still fail after bounded backoff.",
    "Pi runtime integration assertions and their existing deadlines remain unchanged."
  ],
  "archiveDigest": "7381ce22e013bc6de80180511837f24ad628751ca739122bbd2c9851df7b47eb",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "dacb79ced8b85e6c12ef4b817ebfed7ec3341c9366b58a915451322ae24039fd",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
