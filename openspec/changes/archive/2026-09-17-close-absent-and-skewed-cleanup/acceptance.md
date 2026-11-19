# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A merged worktree whose directory was already deleted by hand completes on one `complete` run with `worktree-already-absent` and its unchanged local ref removed, and the journal closes instead of failing on the missing directory.
- A merged pull request whose `merged` timeline event is stamped a few seconds off `merged_at` verifies as accepted-and-archived and its worktree cleans up, while an event a minute off still blocks.
- Agent-written files anywhere under `.artifacts/` no longer block cleanup, while `.artifacts-user/`, `artifacts/`, and links inside `.artifacts/` still do.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "close-absent-and-skewed-cleanup",
  "sourcePr": 458,
  "archive": "openspec/changes/archive/2026-09-17-close-absent-and-skewed-cleanup/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-17-close-absent-and-skewed-cleanup/acceptance.md",
  "finalizedDate": "2026-09-17",
  "specBaseSha": "c17efd7b122d25007b356393ee31bac6871aa8ed",
  "acceptanceScenarios": [
    "A merged worktree whose directory was already deleted by hand completes on one `complete` run with `worktree-already-absent` and its unchanged local ref removed, and the journal closes instead of failing on the missing directory.",
    "A merged pull request whose `merged` timeline event is stamped a few seconds off `merged_at` verifies as accepted-and-archived and its worktree cleans up, while an event a minute off still blocks.",
    "Agent-written files anywhere under `.artifacts/` no longer block cleanup, while `.artifacts-user/`, `artifacts/`, and links inside `.artifacts/` still do."
  ],
  "archiveDigest": "074cb61b2d0507e2e69999fd2878ba2abde28b68a67138990558336f50dde7c8",
  "specDigest": "5952075a18883cf5918c3d48a3d1e50859cf05ea8b23454fd7d035befaebe4db",
  "tasksDigest": "a4ff01e9bcfb2918850fb0146002cf1c3ef70819af225b86a7ed13f2706a8003",
  "evidenceDigest": "5c8e27dea86b981afa117d02b88743072f3d42c97427433f23a934d46f658d6a",
  "knownGaps": []
}
```
