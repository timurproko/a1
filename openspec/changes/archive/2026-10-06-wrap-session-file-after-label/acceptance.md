# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Long Session Info file paths begin immediately after `File:` and consume the remaining row width before continuing untruncated on adjacent rows.
- File continuation rows stay within the visible width and keep `ID` and grouped sections in their established order.
- Fitting paths remain on one identity row, while the pinned `a1 pi` session presentation remains unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "wrap-session-file-after-label",
  "sourcePr": 684,
  "archive": "openspec/changes/archive/2026-10-06-wrap-session-file-after-label/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-06-wrap-session-file-after-label/acceptance.md",
  "finalizedDate": "2026-10-06",
  "specBaseSha": "d9ac865473ea2164df226738b42ac3c7a73014e5",
  "acceptanceScenarios": [
    "Long Session Info file paths begin immediately after `File:` and consume the remaining row width before continuing untruncated on adjacent rows.",
    "File continuation rows stay within the visible width and keep `ID` and grouped sections in their established order.",
    "Fitting paths remain on one identity row, while the pinned `a1 pi` session presentation remains unchanged."
  ],
  "archiveDigest": "5db7bf3d1605390fbca9850acaa006cc03dd955e41f11b0c53ce4bb187c9ffe3",
  "specDigest": "13d42b5dd6dcdf68b59e69a200789da046dcce5cb9efe4ce26cb8af590bbb7a3",
  "tasksDigest": "70c20f68407bf7542c17ec5c66f6113515400fd0078be2e6797a9f4c1495fd01",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
