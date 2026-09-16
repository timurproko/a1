# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The two repository-owned native Cargo target roots are handled automatically through the existing bounded generated-content inspection and standard non-force completion path.
- Arbitrary, sibling, and near-match target trees remain blocked and preserved without weakening ordinary/generated entry allowances or unsafe-content checks.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "handle-large-generated-cleanup-trees",
  "sourcePr": 439,
  "archive": "openspec/changes/archive/2026-09-16-handle-large-generated-cleanup-trees/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-16-handle-large-generated-cleanup-trees/acceptance.md",
  "finalizedDate": "2026-09-16",
  "specBaseSha": "926da1ea4672f43a696706d877eb576babd1fdb3",
  "acceptanceScenarios": [
    "The two repository-owned native Cargo target roots are handled automatically through the existing bounded generated-content inspection and standard non-force completion path.",
    "Arbitrary, sibling, and near-match target trees remain blocked and preserved without weakening ordinary/generated entry allowances or unsafe-content checks."
  ],
  "archiveDigest": "7501d96773c6e60bd2d7bbf852b737b2e7d7f28f059d4fade5eebf7544bd9893",
  "specDigest": "5592927f54abdca6eeba082589903c52d556e625d7dab2a811395619474fcb28",
  "tasksDigest": "4760aba43223d093ca866b0bb46b0e1df807ce6323d99686910fc9d30029e29c",
  "evidenceDigest": "7c1e6f92a58ad65fbe800a0dd185d3ccf86f1850f66f413fc201c8b06f7ec246",
  "knownGaps": []
}
```
