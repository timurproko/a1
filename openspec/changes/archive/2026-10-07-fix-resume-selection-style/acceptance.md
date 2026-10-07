# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Resume Session focus moves only the full-width blue background and accent arrow, leaving title and metadata foregrounds unchanged.
- The active session title remains success green whether or not its row has keyboard focus.
- Named, ordinary, and delete-confirmation rows retain their semantic colors, geometry, and existing interactions.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-resume-selection-style",
  "sourcePr": 709,
  "archive": "openspec/changes/archive/2026-10-07-fix-resume-selection-style/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-07-fix-resume-selection-style/acceptance.md",
  "finalizedDate": "2026-10-07",
  "specBaseSha": "8c2d639328f9b4d6d9ae8fe631479d687d2b7ecb",
  "acceptanceScenarios": [
    "Resume Session focus moves only the full-width blue background and accent arrow, leaving title and metadata foregrounds unchanged.",
    "The active session title remains success green whether or not its row has keyboard focus.",
    "Named, ordinary, and delete-confirmation rows retain their semantic colors, geometry, and existing interactions."
  ],
  "archiveDigest": "d585bb2e72b267dca5fa5a5a5118e78a1a021c1c06199140b09efea979de9eb3",
  "specDigest": "d8d67f70758614488421aed3b2cfa7682a269bf8b8c76971d37bcb2609cc202b",
  "tasksDigest": "7c2c8591dcc563e5520131a48a6fdf6f57185391b303aa03f58fc52f681f6f50",
  "evidenceDigest": "108840be7dcb17d3da86f2a7e2d8b2e80fbb0a09a6127028df9d377c06407355",
  "knownGaps": []
}
```
