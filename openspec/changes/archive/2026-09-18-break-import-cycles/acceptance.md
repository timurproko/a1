# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The architecture gate reports zero import cycles and `importCycles` in the allowlist is empty.
- The `release` and `session-ui` barrels export the same names as before and every test that reaches the moved helpers through them passes.
- A bare-specifier import followed by a relative `import type` yields no runtime edge, and the eager startup graph baseline holds at the corrected exact totals.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "break-import-cycles",
  "sourcePr": 478,
  "archive": "openspec/changes/archive/2026-09-18-break-import-cycles/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-18-break-import-cycles/acceptance.md",
  "finalizedDate": "2026-09-18",
  "specBaseSha": "c06de2e4f3bf2fa8c71ea5bc560f117fc0d789ed",
  "acceptanceScenarios": [
    "The architecture gate reports zero import cycles and `importCycles` in the allowlist is empty.",
    "The `release` and `session-ui` barrels export the same names as before and every test that reaches the moved helpers through them passes.",
    "A bare-specifier import followed by a relative `import type` yields no runtime edge, and the eager startup graph baseline holds at the corrected exact totals."
  ],
  "archiveDigest": "90d554140bc7ff39e1290cd23b16548700c470274751fee905e5dcbd615ba9e6",
  "specDigest": "5f81c1173714bf974e54e876f20765612052974317921c46546a7a3c50e04854",
  "tasksDigest": "4f0338329ed421eb260b7dba53a8ebef89080d968f0895b42f4cebb63b009210",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
