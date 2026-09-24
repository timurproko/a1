# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Stream frame counting is unaffected by independently scheduled lifecycle status rendering.
- Burst updates remain bounded to one cadence frame, immediate input leaves no stale stream frame, and final content flushes exactly one frame.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-09-24",
  "sourcePr": 581,
  "archive": "openspec/changes/archive/2026-09-24-fix-nightly-regression-2026-09-24/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-24-fix-nightly-regression-2026-09-24/acceptance.md",
  "finalizedDate": "2026-09-24",
  "specBaseSha": "ac123a6604960e8ecbed86a544d2e3d17086d65c",
  "acceptanceScenarios": [
    "Stream frame counting is unaffected by independently scheduled lifecycle status rendering.",
    "Burst updates remain bounded to one cadence frame, immediate input leaves no stale stream frame, and final content flushes exactly one frame."
  ],
  "archiveDigest": "27a3257ed1ff84713e43f5e6229affa7676d6d0ea99e34ccb9de11793de98b43",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "dacb79ced8b85e6c12ef4b817ebfed7ec3341c9366b58a915451322ae24039fd",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
