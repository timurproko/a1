# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A finalized PR that deletes the canonical specs of the capabilities it retires passes finalized-delivery validation.
- A finalized PR that changes any other canonical spec path still fails with delivery-unexpected-openspec-path.
- Deliveries that retire nothing are validated exactly as before.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "openspec-retired-spec-validation",
  "sourcePr": 881,
  "archive": "openspec/changes/archive/2026-11-07-openspec-retired-spec-validation/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-07-openspec-retired-spec-validation/acceptance.md",
  "finalizedDate": "2026-11-07",
  "specBaseSha": "e9c99ad02e5ed2f45cb4fbdf7013dd6386ab78ad",
  "acceptanceScenarios": [
    "A finalized PR that deletes the canonical specs of the capabilities it retires passes finalized-delivery validation.",
    "A finalized PR that changes any other canonical spec path still fails with delivery-unexpected-openspec-path.",
    "Deliveries that retire nothing are validated exactly as before."
  ],
  "archiveDigest": "3c017c14d5a9445768c4ef96ba2550d8711c03e0efe8a91deeb80557d8984a3f",
  "specDigest": "94ca0b4de40f5141efa684d0523a3b091f998d2e177608cde69034c11b71d015",
  "tasksDigest": "734af70123e6db9150a78703f6b1031d82cef944166bd4321b6347396a4cdb8a",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
