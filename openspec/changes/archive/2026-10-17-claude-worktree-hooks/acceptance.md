# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- A Claude Code session started from the primary checkout that enters a worktree by task name lands in that task's folder under `.worktrees` at the current develop head without an approval prompt.
- Entering the same task name again returns the existing worktree instead of creating another one.
- Asking Claude Code to remove a worktree leaves it on disk and names the governance cleanup tool.
- Delivery guidance tells Claude Code sessions to link by name and create the task branch inside the worktree.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "claude-worktree-hooks",
  "sourcePr": 796,
  "archive": "openspec/changes/archive/2026-10-17-claude-worktree-hooks/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-17-claude-worktree-hooks/acceptance.md",
  "finalizedDate": "2026-10-17",
  "specBaseSha": "e5bcf467ebacbbdf67bae1ee07156a1564d4e883",
  "acceptanceScenarios": [
    "A Claude Code session started from the primary checkout that enters a worktree by task name lands in that task's folder under `.worktrees` at the current develop head without an approval prompt.",
    "Entering the same task name again returns the existing worktree instead of creating another one.",
    "Asking Claude Code to remove a worktree leaves it on disk and names the governance cleanup tool.",
    "Delivery guidance tells Claude Code sessions to link by name and create the task branch inside the worktree."
  ],
  "archiveDigest": "ad6ea160a2b8f28c4114b069412ab683947214b6c4ea3a3e26651cf7dae62209",
  "specDigest": "63a00cfbcbd2374b0dc1facebdc9bb62a5448bdeffe9fc3fde157fb8c56bc4bf",
  "tasksDigest": "34cf9ce60a78a85b0ca303de145e4b338e58cef7685159e30aa35176489a02b7",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
