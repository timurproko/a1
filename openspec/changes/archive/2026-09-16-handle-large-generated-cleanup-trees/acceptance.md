# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Standard generated dependency trees above the former 20,000-entry ceiling are fully inspected and removed below the finite 100,000-entry and wall-clock bounds.
- Only the two repository-owned native Cargo target roots are handled automatically; arbitrary target paths and unsafe nested content remain blocked and preserved.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "handle-large-generated-cleanup-trees",
  "sourcePr": 439,
  "archive": "openspec/changes/archive/2026-09-16-handle-large-generated-cleanup-trees/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-16-handle-large-generated-cleanup-trees/acceptance.md",
  "finalizedDate": "2026-09-16",
  "specBaseSha": "5f3021ca80fb5402309bafe96db6791241c93f49",
  "acceptanceScenarios": [
    "Standard generated dependency trees above the former 20,000-entry ceiling are fully inspected and removed below the finite 100,000-entry and wall-clock bounds.",
    "Only the two repository-owned native Cargo target roots are handled automatically; arbitrary target paths and unsafe nested content remain blocked and preserved."
  ],
  "archiveDigest": "dab1fef3a513a2d12ed10e8db8ed1fe64f3ad7164b94acd2562fe543936a0a5d",
  "specDigest": "b118e66d0f48cb458f821ca1174ea33f78b3b030811069d6863ce68345123c53",
  "tasksDigest": "8ad3322f54e9ea0f1c712091fe004715eb0bd33de4b2d4f15aa459d6b14dbc8f",
  "evidenceDigest": "f87e069e54420948e52580def6fb08ae8fedd67123f1d20edd19ddcece5991d3",
  "knownGaps": []
}
```
