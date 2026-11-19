# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Nightly publication runs the process guardian builds and the full documentation review even though the approval job is skipped.
- The package job refuses to pack a build when a required guardian or documentation job did not succeed.
- The release pipeline policy test requires every job after approval to restate always() in its condition.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-09-30-2",
  "sourcePr": 646,
  "archive": "openspec/changes/archive/2026-09-30-fix-nightly-regression-2026-09-30-2/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-30-fix-nightly-regression-2026-09-30-2/acceptance.md",
  "finalizedDate": "2026-09-30",
  "specBaseSha": "88279a91c830da74fbbe999b88fb945645b281ba",
  "acceptanceScenarios": [
    "Nightly publication runs the process guardian builds and the full documentation review even though the approval job is skipped.",
    "The package job refuses to pack a build when a required guardian or documentation job did not succeed.",
    "The release pipeline policy test requires every job after approval to restate always() in its condition."
  ],
  "archiveDigest": "5493e9ee6e97e7581a818f0d11a2c34393144391e3d170a5afbb94b9b0bbcab7",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "dacb79ced8b85e6c12ef4b817ebfed7ec3341c9366b58a915451322ae24039fd",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
