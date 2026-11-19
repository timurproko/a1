# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Autocomplete border validation exercises truecolor and 256-color rendering explicitly.
- Dark and light dim labels remain distinct in truecolor while valid 256-color quantization no longer causes a false failure.
- Border labels, widths, and background-paint guarantees continue to pass for both editor history modes.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-nightly-regression-2026-10-02",
  "sourcePr": 660,
  "archive": "openspec/changes/archive/2026-10-02-fix-nightly-regression-2026-10-02/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-02-fix-nightly-regression-2026-10-02/acceptance.md",
  "finalizedDate": "2026-10-02",
  "specBaseSha": "bf95b96b6ce8445db40beb1b0f9c8893dbfc1985",
  "acceptanceScenarios": [
    "Autocomplete border validation exercises truecolor and 256-color rendering explicitly.",
    "Dark and light dim labels remain distinct in truecolor while valid 256-color quantization no longer causes a false failure.",
    "Border labels, widths, and background-paint guarantees continue to pass for both editor history modes."
  ],
  "archiveDigest": "7912cc222c793bde99f85097b45cfdd0bb6dc31edc2b17d81451a81a9b005902",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "dacb79ced8b85e6c12ef4b817ebfed7ec3341c9366b58a915451322ae24039fd",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
