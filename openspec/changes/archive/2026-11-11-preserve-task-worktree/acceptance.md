# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Implementation completion and review handoff keep the task worktree attached for follow-up fixes.
- Subsequent built-in tools and PR discovery retain the task checkout until an explicit detach or task switch.
- Explicit detach preserves task files and branches, and runtime shutdown still releases editing claims.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "preserve-task-worktree",
  "sourcePr": 912,
  "archive": "openspec/changes/archive/2026-11-11-preserve-task-worktree/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-11-preserve-task-worktree/acceptance.md",
  "finalizedDate": "2026-11-11",
  "specBaseSha": "7ded4b4ce37e96f098fac413fc4ac55ee96f7293",
  "acceptanceScenarios": [
    "Implementation completion and review handoff keep the task worktree attached for follow-up fixes.",
    "Subsequent built-in tools and PR discovery retain the task checkout until an explicit detach or task switch.",
    "Explicit detach preserves task files and branches, and runtime shutdown still releases editing claims."
  ],
  "archiveDigest": "8204a20c648c92daa104ef532923635561c8168f82c908fe6b4d39257ff9f70f",
  "specDigest": "b0d031ac09276d2631e117a3c8938738981811372103d83612ef467a2919a710",
  "tasksDigest": "20ec15d1b2b91dd433a28a9e8a3d5364bc2b3a928a2864295acd43a26ee35e0e",
  "evidenceDigest": "61fa370c1d4cfd63baf593cd52c67f6f164b9f3cdd60f2be488fcf6bdc2f666d",
  "knownGaps": []
}
```
