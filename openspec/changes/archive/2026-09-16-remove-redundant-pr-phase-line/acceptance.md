# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- New version-3 pull request descriptions begin with Proposal and omit proposal/implementation phase banners while preserving the existing delivery workflow.
- Open candidates and local finalization reject the superseded phase-prefixed body while retaining strict structural validation.
- Read-only verification continues to recognize immutable merged version-3 deliveries created with the former phase prefix.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "remove-redundant-pr-phase-line",
  "sourcePr": 429,
  "archive": "openspec/changes/archive/2026-09-16-remove-redundant-pr-phase-line/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-16-remove-redundant-pr-phase-line/acceptance.md",
  "finalizedDate": "2026-09-16",
  "specBaseSha": "71058e27df33ca3ac08ab527417e87c78ab01fd5",
  "acceptanceScenarios": [
    "New version-3 pull request descriptions begin with Proposal and omit proposal/implementation phase banners while preserving the existing delivery workflow.",
    "Open candidates and local finalization reject the superseded phase-prefixed body while retaining strict structural validation.",
    "Read-only verification continues to recognize immutable merged version-3 deliveries created with the former phase prefix."
  ],
  "archiveDigest": "4de7026054dc8260d8c0e9d3165d7c20c88f57364ce902c880ed2718cf8cb230",
  "specDigest": "1cbaf4ae79fb03077c82a4f6d8d0499abdf467b414823e619938a75c7394747b",
  "tasksDigest": "3ed58bee7ac47fb8a146178bad0d0bf1aa498cc261b52654c828fb19e06c10c3",
  "evidenceDigest": "1c94b634ddecfb3633a2536dbf051af1662bfdf06c167dfab08bb125245545bf",
  "knownGaps": []
}
```
