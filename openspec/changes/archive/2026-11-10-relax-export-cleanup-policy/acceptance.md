# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- An explicit request to delete an identified worktree export needs no preservation prompt, while preservation remains optional and generic cleanup retains unknown files.
- Agent entry points route to the owning procedures, and one explicit instruction can approve a presented plan and request implementation without authorizing merge.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "relax-export-cleanup-policy",
  "sourcePr": 904,
  "archive": "openspec/changes/archive/2026-11-10-relax-export-cleanup-policy/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-10-relax-export-cleanup-policy/acceptance.md",
  "finalizedDate": "2026-11-10",
  "specBaseSha": "3d3c76792f41343dee7f72854c2b60c3edd4a155",
  "acceptanceScenarios": [
    "An explicit request to delete an identified worktree export needs no preservation prompt, while preservation remains optional and generic cleanup retains unknown files.",
    "Agent entry points route to the owning procedures, and one explicit instruction can approve a presented plan and request implementation without authorizing merge."
  ],
  "archiveDigest": "f66cc0bc3490439c465a01cb528d366aa547c0b163eb94b90b12fc551ade1749",
  "specDigest": "849378a031eea21d648bd6941b01d59b41ab92d94d00f109844d2df754a2fba2",
  "tasksDigest": "81bafe47aa8890c81a99e0840db690ffe768b0cbdef244d2974c67e2ce8e9771",
  "evidenceDigest": "2145f4d043ccb662160e7fb347ab6f6686a656960c775deb5dd0dca7cfa4a3e7",
  "knownGaps": []
}
```
