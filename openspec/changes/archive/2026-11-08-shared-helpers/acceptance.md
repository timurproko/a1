# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- The TUI runtime still coordinates input, traces writes, freezes presentation, and routes pre-input exactly as before; each decorator now states only the members it changes.
- Release cleanup, dependency layers, restart certification, and update recovery refuse the managed root itself, nested descendants, parent traversal, and other drives, and accept a direct child that differs only in case on Windows.
- Repository scripts reject a flag passed without a value instead of reading the next flag as its value, and `resolve-validation-job` falls back to the default impact file when `--impact` is absent.
- Selection, ownership, receipt, and package-preparation digests are byte-identical to before.
- The session-selector, code-documentation, and validation-impact tests leave no temporary folders behind.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "shared-helpers",
  "sourcePr": 884,
  "archive": "openspec/changes/archive/2026-11-08-shared-helpers/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-08-shared-helpers/acceptance.md",
  "finalizedDate": "2026-11-08",
  "specBaseSha": "9e5aae820660ec94f05b83ec2a448e2f8e8bdd30",
  "acceptanceScenarios": [
    "The TUI runtime still coordinates input, traces writes, freezes presentation, and routes pre-input exactly as before; each decorator now states only the members it changes.",
    "Release cleanup, dependency layers, restart certification, and update recovery refuse the managed root itself, nested descendants, parent traversal, and other drives, and accept a direct child that differs only in case on Windows.",
    "Repository scripts reject a flag passed without a value instead of reading the next flag as its value, and `resolve-validation-job` falls back to the default impact file when `--impact` is absent.",
    "Selection, ownership, receipt, and package-preparation digests are byte-identical to before.",
    "The session-selector, code-documentation, and validation-impact tests leave no temporary folders behind."
  ],
  "archiveDigest": "8cce460f5ef562db7e7d8189795f425f8f2c7fd5eb78f3ef6ccc0f176ec957dc",
  "specDigest": "258373f5a0d6794a3d1ea360c5430d2a85b1444dace7d8fb51606be7f26d4297",
  "tasksDigest": "29e9dba70815747dcb3611718653c89f86a48d5dbbcadff6a06a883dd835dee2",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
