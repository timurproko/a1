# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Exact candidate acquisition completes before each published predecessor starts its protected replacement interval.
- Fake npm performs the destructive package swap and launcher restoration while the immutable predecessor guardian establishes a callable launcher and activates the exact candidate.
- The direct current-predecessor and official `0.2.2` bridge cases retain their exact-package, activation, warmup, command, runtime, deadline, and no-retry guarantees.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-10-05",
  "sourcePr": 674,
  "archive": "openspec/changes/archive/2026-10-05-fix-nightly-regression-2026-10-05/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-05-fix-nightly-regression-2026-10-05/acceptance.md",
  "finalizedDate": "2026-10-05",
  "specBaseSha": "54e3ba25014c8ab8848fdeb85fd956ffc14f6f48",
  "acceptanceScenarios": [
    "Exact candidate acquisition completes before each published predecessor starts its protected replacement interval.",
    "Fake npm performs the destructive package swap and launcher restoration while the immutable predecessor guardian establishes a callable launcher and activates the exact candidate.",
    "The direct current-predecessor and official `0.2.2` bridge cases retain their exact-package, activation, warmup, command, runtime, deadline, and no-retry guarantees."
  ],
  "archiveDigest": "831f55233d4c59f58575baf837424188bb5893f01d646823f5a102c1e09f4110",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "fe7815cb7c38e65ecfd375deae76bc75516c37e028e60e0bfa2b6feccba14b14",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
