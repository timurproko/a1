# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Explicit discard removes only the exact closed-unmerged candidate's unchanged remote ref, worktree, and local ref after complete safety checks.
- Open, merged, reopened, advanced, protected, forked, dirty, active, ambiguous, and unrelated candidates remain preserved.
- Interrupted or partially completed discard remains journaled and resumable without granting queue/watch or bulk cleanup authority.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "discard-closed-unmerged-worktrees",
  "sourcePr": 441,
  "archive": "openspec/changes/archive/2026-09-16-discard-closed-unmerged-worktrees/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-16-discard-closed-unmerged-worktrees/acceptance.md",
  "finalizedDate": "2026-09-16",
  "specBaseSha": "e48194b1ee7c535bcebe7bce09c664a63f38687e",
  "acceptanceScenarios": [
    "Explicit discard removes only the exact closed-unmerged candidate's unchanged remote ref, worktree, and local ref after complete safety checks.",
    "Open, merged, reopened, advanced, protected, forked, dirty, active, ambiguous, and unrelated candidates remain preserved.",
    "Interrupted or partially completed discard remains journaled and resumable without granting queue/watch or bulk cleanup authority."
  ],
  "archiveDigest": "310dbad57b34eb603e5a1eb76cdab94bf4d713fc8308be6e87430d32135810c8",
  "specDigest": "acc7fcc87580488cb0cd221ba750cee702a1e10eddb6feef8c0363d1aa0d57d7",
  "tasksDigest": "836c372626c059794c32865558158f607e67c4d71ca4ba1a1a4c4fe74dd67bb8",
  "evidenceDigest": "047d5bf9fedd600b18d78930f68683699774c8f9dfec30577e083335a78404a9",
  "knownGaps": []
}
```
