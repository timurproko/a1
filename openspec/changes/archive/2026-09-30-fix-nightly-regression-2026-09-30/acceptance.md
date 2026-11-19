# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The packaged session-resume afterAll records its launch close, supervisor stop, and candidate removal as separate validation phases.
- The session-resume teardown bound covers the idle-owner release and removal retry worst cases while every per-test deadline and assertion is unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-09-30",
  "sourcePr": 645,
  "archive": "openspec/changes/archive/2026-09-30-fix-nightly-regression-2026-09-30/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-30-fix-nightly-regression-2026-09-30/acceptance.md",
  "finalizedDate": "2026-09-30",
  "specBaseSha": "14c450b8f9155a0327a99e65d2b9e2d39728ad9c",
  "acceptanceScenarios": [
    "The packaged session-resume afterAll records its launch close, supervisor stop, and candidate removal as separate validation phases.",
    "The session-resume teardown bound covers the idle-owner release and removal retry worst cases while every per-test deadline and assertion is unchanged."
  ],
  "archiveDigest": "e8f81aa98c73d779071c3d3e188ab8c1be0bc420b2a27bbc828a29f83b36e030",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "dacb79ced8b85e6c12ef4b817ebfed7ec3341c9366b58a915451322ae24039fd",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
