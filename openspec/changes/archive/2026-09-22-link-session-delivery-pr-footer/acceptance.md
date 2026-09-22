# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A session can explicitly link its same-repository delivery worktree and restore that context after resume.
- Concurrent sessions remain isolated by stable session identity, while foreign, detached, malformed, deleted, and reused contexts fail closed.
- Association, branch, pull-request, and session changes refresh serially without changing the session or tool working directory.
- Narrow bare-A1 footers preserve the complete linked PR badge by truncating path and branch text first without leaking hyperlink state.
- Clearing or omitting an association falls back to startup-repository discovery, and `a1 pi` retains comparison output without cleanup authority changes.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "link-session-delivery-pr-footer",
  "sourcePr": 552,
  "archive": "openspec/changes/archive/2026-09-22-link-session-delivery-pr-footer/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-22-link-session-delivery-pr-footer/acceptance.md",
  "finalizedDate": "2026-09-22",
  "specBaseSha": "9fa1e231a33ab9aad337850d843739cfcedc88b4",
  "acceptanceScenarios": [
    "A session can explicitly link its same-repository delivery worktree and restore that context after resume.",
    "Concurrent sessions remain isolated by stable session identity, while foreign, detached, malformed, deleted, and reused contexts fail closed.",
    "Association, branch, pull-request, and session changes refresh serially without changing the session or tool working directory.",
    "Narrow bare-A1 footers preserve the complete linked PR badge by truncating path and branch text first without leaking hyperlink state.",
    "Clearing or omitting an association falls back to startup-repository discovery, and `a1 pi` retains comparison output without cleanup authority changes."
  ],
  "archiveDigest": "9b3336d92c7fcb0b000ccec3a6447bc992b0bde5a73fdbd365ba985874fbabd4",
  "specDigest": "5ad7fa0646a035f5160c69b7e03ce91d6be0890872bb082a30aea6e4ea2a62af",
  "tasksDigest": "8eea1e7d3e0dbb479c74300b5326d51a72a6735eb7d9bd169a2c85f541fe67e8",
  "evidenceDigest": "03a4b2120ed2a89effee4e5813ced2d3ed03359a9a0ae0e99e43b1f1d1e99da9",
  "knownGaps": []
}
```
