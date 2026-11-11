# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Task entry creates or resumes the selected checkout and returns its canonical path and branch after attachment.
- Temporary coordination is handled internally without a second inventory approval gate or blanket ownership warnings.
- Built-in tools follow the verified attachment while detach preserves worktree files and branches.
- Stable background polls do not rewrite healthy editing claims or runtime registrations.
- Both repositories use shared minimal guidance, with the external migration dependent on a compatible installed runtime.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "self-contained-worktrees",
  "sourcePr": 908,
  "archive": "openspec/changes/archive/2026-11-11-self-contained-worktrees/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-11-self-contained-worktrees/acceptance.md",
  "finalizedDate": "2026-11-11",
  "specBaseSha": "e536c1158996668749ef67184cb97fb6963b08f0",
  "acceptanceScenarios": [
    "Task entry creates or resumes the selected checkout and returns its canonical path and branch after attachment.",
    "Temporary coordination is handled internally without a second inventory approval gate or blanket ownership warnings.",
    "Built-in tools follow the verified attachment while detach preserves worktree files and branches.",
    "Stable background polls do not rewrite healthy editing claims or runtime registrations.",
    "Both repositories use shared minimal guidance, with the external migration dependent on a compatible installed runtime."
  ],
  "archiveDigest": "7717feeab404d3982dc5bffc18c24506c150ee04ea4a88f4cd854785c1b5b3b8",
  "specDigest": "dc35c405dc759316754e6b85678840aca0307678f7552e5cf7011448e2c9d899",
  "tasksDigest": "f1d140f9dd02f8dc0e1f75eb4e9e745bd2b0d5f023dc581037d081aa393cfe3f",
  "evidenceDigest": "57517616d7be8a91b777910385ff8faa03617af50db7326e6c2916696c9f0c9f",
  "knownGaps": []
}
```
