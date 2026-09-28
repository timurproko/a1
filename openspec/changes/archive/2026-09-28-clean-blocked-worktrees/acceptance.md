# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Contained generated symlinks and Windows junctions are removed without target traversal, while escapes, cycles, target drift, and late links retain their targets and block cleanup.
- Exact confirmed redundant retirement removes only a clean no-PR/no-remote checkout already contained by fresh `origin/develop`, resumes interrupted non-force removal, and is idempotent.
- Dirty, ignored, hidden-index, registered, current, locked, replaced, remotely backed, PR-associated, and locally advanced worktrees remain retained; preview and sweep still never adopt them.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "clean-blocked-worktrees",
  "sourcePr": 610,
  "archive": "openspec/changes/archive/2026-09-28-clean-blocked-worktrees/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-28-clean-blocked-worktrees/acceptance.md",
  "finalizedDate": "2026-09-28",
  "specBaseSha": "51e8492c2aac79f120c157bb8db36a29819a136e",
  "acceptanceScenarios": [
    "Contained generated symlinks and Windows junctions are removed without target traversal, while escapes, cycles, target drift, and late links retain their targets and block cleanup.",
    "Exact confirmed redundant retirement removes only a clean no-PR/no-remote checkout already contained by fresh `origin/develop`, resumes interrupted non-force removal, and is idempotent.",
    "Dirty, ignored, hidden-index, registered, current, locked, replaced, remotely backed, PR-associated, and locally advanced worktrees remain retained; preview and sweep still never adopt them."
  ],
  "archiveDigest": "b77108a422b9692ff939a12cbad526d4d0c3a0a6d7a40dccc12d9328fb0dde4d",
  "specDigest": "ed89382267123ba588349e5a8d4f741be3791283f5fb6fe8ab60b5f8951f86be",
  "tasksDigest": "c4c6447ad3cdb0170c257ef696f344407f1af7979039a0eacfaacf9c6688be04",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
