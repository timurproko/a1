# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Exact ignored .artifacts/validation reports are removed with an otherwise eligible worktree through the standard non-force completion command.
- Sibling, near-match, unknown, linked, special, and nested artifact content remains blocking and preserved.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "include-validation-artifacts-in-managed-cleanup",
  "sourcePr": 438,
  "archive": "openspec/changes/archive/2026-09-16-include-validation-artifacts-in-managed-cleanup/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-16-include-validation-artifacts-in-managed-cleanup/acceptance.md",
  "finalizedDate": "2026-09-16",
  "specBaseSha": "5ba547a0d571d2a67a5aab6bcb81277186aa4ef4",
  "acceptanceScenarios": [
    "Exact ignored .artifacts/validation reports are removed with an otherwise eligible worktree through the standard non-force completion command.",
    "Sibling, near-match, unknown, linked, special, and nested artifact content remains blocking and preserved."
  ],
  "archiveDigest": "866449cec1193a5b3a15cc1dcac3099494bb00e7e87e3277e05b4d0950904844",
  "specDigest": "ef9a3b5cda6c8606ae7b87a393434b7b3d2ca66992ce96a0f5b92c9b7af026f6",
  "tasksDigest": "a06c71233da796b97768c6a52f295ca9d30f8e457026ad50ffe6bcd29dd26323",
  "evidenceDigest": "fccc4a2f366c0ec5197c0d51bb1dd88b07a01422416ca1e236893f4d12ea8c59",
  "knownGaps": []
}
```
