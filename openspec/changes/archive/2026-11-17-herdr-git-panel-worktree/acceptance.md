# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A1 and Claude Code project providers resolve the selected agent's active repository instead of stale launch directories.
- Additional agent providers work without editing shared directory or Git panel logic.
- Worktree switches and detach follow the committed project context without stale Git results.
- Invalid, stale or mismatched directory reports preserve ordinary shell and terminal fallbacks.
- Local and remote directory lookup stays bound to the selected terminal and its machine.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "herdr-git-panel-worktree",
  "sourcePr": 969,
  "archive": "openspec/changes/archive/2026-11-17-herdr-git-panel-worktree/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-17-herdr-git-panel-worktree/acceptance.md",
  "finalizedDate": "2026-11-17",
  "specBaseSha": "ec189803f98bb65776866de9676a53de8154ed17",
  "acceptanceScenarios": [
    "A1 and Claude Code project providers resolve the selected agent's active repository instead of stale launch directories.",
    "Additional agent providers work without editing shared directory or Git panel logic.",
    "Worktree switches and detach follow the committed project context without stale Git results.",
    "Invalid, stale or mismatched directory reports preserve ordinary shell and terminal fallbacks.",
    "Local and remote directory lookup stays bound to the selected terminal and its machine."
  ],
  "archiveDigest": "4744441034e3292c0e0350843b4dca69da7bf5b6a76e54e12e401e66d261bdeb",
  "specDigest": "3d6fbcecfd8e5de50dea526248295059cc35f1f4390fde84a4217151c33437a7",
  "tasksDigest": "aa7e7e5bbb7e0833dae5ba151f23ba46163a336ce31882363f65bcf73152f847",
  "evidenceDigest": "45e66ec8b3436245ca29f57a30f87d3264cfda5241bc5840f47af692910c9e48",
  "knownGaps": []
}
```
