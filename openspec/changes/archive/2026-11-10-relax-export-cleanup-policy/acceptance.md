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
  "archiveDigest": "777b00ac0c09a9d7491e3ff99dc5419dbccd21d90e7a2bdcdd076f7df2415e16",
  "specDigest": "849378a031eea21d648bd6941b01d59b41ab92d94d00f109844d2df754a2fba2",
  "tasksDigest": "495117cb43bb22de981938077956ba65ef7d31a53b6358335b742bc38495afd9",
  "evidenceDigest": "d590622543d69ab5eac6bcf5b9e1ded7de390f208395a751fe429b3bb317b1a4",
  "knownGaps": []
}
```
