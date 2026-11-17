# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Attaching A1 from home to a worktree makes Git resolve that active repository and branch.
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
    "Attaching A1 from home to a worktree makes Git resolve that active repository and branch.",
    "Worktree switches and detach follow the committed project context without stale Git results.",
    "Invalid, stale or mismatched directory reports preserve ordinary shell and terminal fallbacks.",
    "Local and remote directory lookup stays bound to the selected terminal and its machine."
  ],
  "archiveDigest": "05aec6ae8a9a434323cedf15417188f38b72379da322494a34e134cc63712523",
  "specDigest": "0268a668b0dfccd8c3b94634be0926d4665308adb11d96d79ccefe841a03a53e",
  "tasksDigest": "62f326e80c2d69e00e9901b5d2e9d61b51963f718573cf5f63bb49d58e3b76be",
  "evidenceDigest": "ebe9d538b43cc2754f5a0ebe6b5047aa97455e8f79ff4020787aef6fdaba8c34",
  "knownGaps": []
}
```
