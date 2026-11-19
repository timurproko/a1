# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Bottom-scrolled settings search places the final setting directly above the input rule without an empty row.
- Sticky section context and scrollbar position remain aligned with the filled result viewport.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-settings-search-bottom-gap",
  "sourcePr": 541,
  "archive": "openspec/changes/archive/2026-09-22-fix-settings-search-bottom-gap/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-22-fix-settings-search-bottom-gap/acceptance.md",
  "finalizedDate": "2026-09-22",
  "specBaseSha": "98b88f36b68d2ec70e2a3bd572cc49970d55dfbd",
  "acceptanceScenarios": [
    "Bottom-scrolled settings search places the final setting directly above the input rule without an empty row.",
    "Sticky section context and scrollbar position remain aligned with the filled result viewport."
  ],
  "archiveDigest": "da28583fc9d26ad322a357af4e2a180b811f387785e41ef2d243edfb77754abd",
  "specDigest": "dce133d4d6aeebf655444be10c71ab61e02933ec097db591d85c6cb4c62bd7bb",
  "tasksDigest": "8769d2fe11bb60902045af47a2c5f4701b60fb02269134744462b5f14419711f",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
