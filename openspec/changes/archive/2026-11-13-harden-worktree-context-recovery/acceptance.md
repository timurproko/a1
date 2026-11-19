# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Temporary Git directory/worktree overrides cannot change the startup or target repository identity used for attachment.
- A non-repository startup rejects enter/attach without saving a false association or changing existing claims.
- Explicit worktree_detach restores the original startup directory even when ordinary tools cannot validate Git context.
- Detach preserves files, branches, history and other owners' claims, and failed ordinary operations never run elsewhere automatically.
- Recovery stays bound to the current live session, honors cancellation and tool exclusions, and is absent from comparison sessions.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "harden-worktree-context-recovery",
  "sourcePr": 924,
  "archive": "openspec/changes/archive/2026-11-13-harden-worktree-context-recovery/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-13-harden-worktree-context-recovery/acceptance.md",
  "finalizedDate": "2026-11-13",
  "specBaseSha": "51a091a09cd94935220635dc06099ffe6fc9821a",
  "acceptanceScenarios": [
    "Temporary Git directory/worktree overrides cannot change the startup or target repository identity used for attachment.",
    "A non-repository startup rejects enter/attach without saving a false association or changing existing claims.",
    "Explicit worktree_detach restores the original startup directory even when ordinary tools cannot validate Git context.",
    "Detach preserves files, branches, history and other owners' claims, and failed ordinary operations never run elsewhere automatically.",
    "Recovery stays bound to the current live session, honors cancellation and tool exclusions, and is absent from comparison sessions."
  ],
  "archiveDigest": "9b579495ba4cd5f90cf811882daa91a4fba88ed55f6bbd494ecbe10eecad27e2",
  "specDigest": "e7ffb5436bcd3acdec5989862de0f57d79bca768cf28526d15a06bc98b7ef9c4",
  "tasksDigest": "476b47b72b084e90b6ea115de55b33a88c99311b0aa28303b7a352a0887aada2",
  "evidenceDigest": "7018914a1562e995e4ae49bbed45cb7f01d6d2c5e98da28d4acf76dcdc04403b",
  "knownGaps": []
}
```
