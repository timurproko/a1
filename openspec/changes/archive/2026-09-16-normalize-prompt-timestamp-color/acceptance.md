# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Submitted-prompt timestamps remain metadata-grey at normal intensity across normal, pinned, hovered, quiet/dimmed, and text-selected states.
- Prompt-body dimming, hover and selection backgrounds, timestamp geometry, and completed-compaction parity remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "normalize-prompt-timestamp-color",
  "sourcePr": 431,
  "archive": "openspec/changes/archive/2026-09-16-normalize-prompt-timestamp-color/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-16-normalize-prompt-timestamp-color/acceptance.md",
  "finalizedDate": "2026-09-16",
  "specBaseSha": "a4304c22c8d613b587195f50ca19ec0429ddbb97",
  "acceptanceScenarios": [
    "Submitted-prompt timestamps remain metadata-grey at normal intensity across normal, pinned, hovered, quiet/dimmed, and text-selected states.",
    "Prompt-body dimming, hover and selection backgrounds, timestamp geometry, and completed-compaction parity remain unchanged."
  ],
  "archiveDigest": "61dda65a7a213566bf3eb7121f81f0b261efa956042b3af357fa3fa66926c4e8",
  "specDigest": "22ad9a5f6291866e194aee7b9e12fe2777ce009e2c074125b3885429bd4f29dd",
  "tasksDigest": "1bb1baac7b8f420f5b22af91aacaf997664245145afd00c2435580ca0c13820c",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
