# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A repository without a `start` entry is entered as before, with the same checkout path and refusals.
- The command receives the primary checkout, the task branch and the selected base as arguments, without a shell.
- A1 attaches only to a registered task worktree of the repository that has the requested branch checked out.
- A failing command, an empty result or a wrong path refuses entry, and A1 creates or deletes nothing itself.
- An untrusted repository is refused before the command runs, answered from saved decisions without a prompt.
- A malformed `start` entry or an unknown placeholder refuses entry instead of falling back to the built-in checkout.
- A branch already checked out outside `.worktrees/` is attached there without running the command.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "declared-worktree-start",
  "sourcePr": 1000,
  "archive": "openspec/changes/archive/2026-11-20-declared-worktree-start/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-20-declared-worktree-start/acceptance.md",
  "finalizedDate": "2026-11-20",
  "specBaseSha": "e983726fba7a88748891d474427007506215579f",
  "acceptanceScenarios": [
    "A repository without a `start` entry is entered as before, with the same checkout path and refusals.",
    "The command receives the primary checkout, the task branch and the selected base as arguments, without a shell.",
    "A1 attaches only to a registered task worktree of the repository that has the requested branch checked out.",
    "A failing command, an empty result or a wrong path refuses entry, and A1 creates or deletes nothing itself.",
    "An untrusted repository is refused before the command runs, answered from saved decisions without a prompt.",
    "A malformed `start` entry or an unknown placeholder refuses entry instead of falling back to the built-in checkout.",
    "A branch already checked out outside `.worktrees/` is attached there without running the command."
  ],
  "archiveDigest": "aabe7cde6a06c64f931f0cad300d687a63aedaac341862e4b7d7ce5d59989580",
  "specDigest": "80b7242eed5c4e794f240b32f17d13fbae0d276ec7cd85405a180a5651dfbbc3",
  "tasksDigest": "c998d56c5792523153e10b9ef57232c9f1e8150c30375c42af10b0df267d0130",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
