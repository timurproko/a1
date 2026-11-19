# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Cleanup removes exact central-policy disposable-root symlinks and junctions without traversing their targets.
- External target paths and sentinel bytes remain unchanged after ordinary worktree cleanup.
- Broken, cyclic, drifting, replaced, near-match, and unapproved root links fail closed.
- Descendant links retain their existing same-root containment and nested-repository safeguards.
- Link removal failures preserve the worktree and pre-removal journal state for a safe retry.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "remove-disposable-root-links",
  "sourcePr": 713,
  "archive": "openspec/changes/archive/2026-10-08-remove-disposable-root-links/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-08-remove-disposable-root-links/acceptance.md",
  "finalizedDate": "2026-10-08",
  "specBaseSha": "45d2e9bb33c7f836ee34bddb2d1c78cd429e3254",
  "acceptanceScenarios": [
    "Cleanup removes exact central-policy disposable-root symlinks and junctions without traversing their targets.",
    "External target paths and sentinel bytes remain unchanged after ordinary worktree cleanup.",
    "Broken, cyclic, drifting, replaced, near-match, and unapproved root links fail closed.",
    "Descendant links retain their existing same-root containment and nested-repository safeguards.",
    "Link removal failures preserve the worktree and pre-removal journal state for a safe retry."
  ],
  "archiveDigest": "fcdf94a81fb5a34797c1a8a980efbd98f5e78ecf66937cd0d7b27a5aad4cd6cd",
  "specDigest": "0659ea5ae9f33379fa97513447384db33110ee88a73c326aa75d2d787b90ff38",
  "tasksDigest": "68ae74f513e223a0348a5b13bd0017826dcbb95cf26b41a3416840c90238bab5",
  "evidenceDigest": "635d52d1c64c0a4d9c36d6540591c3fa3474320b96f13941646e70439c21cfb4",
  "knownGaps": []
}
```
