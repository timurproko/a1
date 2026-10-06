# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Maintainer physical terminal review passed for spacing, titles, search, filters, selection, truncation, labels, paging/folding, nested transitions, and editor restoration.
- 122 focused tests, typecheck, production build, architecture/provenance, documentation governance, strict OpenSpec validation, and whitespace checks passed after reconciling `origin/develop`.
- Full regression and native-host gates remain CI-owned and are starting with ready-for-review transition.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "redesign-session-tree-dialog",
  "sourcePr": 682,
  "archive": "openspec/changes/archive/2026-10-06-redesign-session-tree-dialog/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-06-redesign-session-tree-dialog/acceptance.md",
  "finalizedDate": "2026-10-06",
  "specBaseSha": "d9ac865473ea2164df226738b42ac3c7a73014e5",
  "acceptanceScenarios": [
    "Maintainer physical terminal review passed for spacing, titles, search, filters, selection, truncation, labels, paging/folding, nested transitions, and editor restoration.",
    "122 focused tests, typecheck, production build, architecture/provenance, documentation governance, strict OpenSpec validation, and whitespace checks passed after reconciling `origin/develop`.",
    "Full regression and native-host gates remain CI-owned and are starting with ready-for-review transition."
  ],
  "archiveDigest": "daa4f68fd0739a4465c5a7d94b038e6f4eab069f63a31b8f9c807d8da73eb689",
  "specDigest": "4d5fe881969827e1e3421e6ea9716bac25c956b485f8d11b63ade831044c2b2c",
  "tasksDigest": "d09cdf34e50d444ab8e77c9b78465609644cea5ed3e4ec86a9bc64ee395890e6",
  "evidenceDigest": "6388b63f500eaf59527f31ae2e6faa584909039587921a8c3b223f9ffd897a40",
  "knownGaps": []
}
```
