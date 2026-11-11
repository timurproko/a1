# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A session whose attached checkout was removed fails one tool call with an explanation and then works from primary.
- Work addressed to a lost checkout is never silently written to the primary checkout.
- Plain detach still preserves files and branches, including when the attached checkout is already gone.
- Completion keeps the session attached when the checkout holds uncommitted or untracked content.
- Completion returns tools and the footer to primary before the configured cleanup command starts.
- A failed, unavailable, or skipped cleanup leaves the session working on primary and is not reported as removal.
- Repository cleanup reports attached-session instead of removing a checkout a running A1 session has attached.
- Repository guidance directs agents to guarded completion after a verified merge, not direct cleanup.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "guard-worktree-completion",
  "sourcePr": 915,
  "archive": "openspec/changes/archive/2026-11-11-guard-worktree-completion/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-11-guard-worktree-completion/acceptance.md",
  "finalizedDate": "2026-11-11",
  "specBaseSha": "df8f3fea78404f0413ce40de8d39b7102ead643a",
  "acceptanceScenarios": [
    "A session whose attached checkout was removed fails one tool call with an explanation and then works from primary.",
    "Work addressed to a lost checkout is never silently written to the primary checkout.",
    "Plain detach still preserves files and branches, including when the attached checkout is already gone.",
    "Completion keeps the session attached when the checkout holds uncommitted or untracked content.",
    "Completion returns tools and the footer to primary before the configured cleanup command starts.",
    "A failed, unavailable, or skipped cleanup leaves the session working on primary and is not reported as removal.",
    "Repository cleanup reports attached-session instead of removing a checkout a running A1 session has attached.",
    "Repository guidance directs agents to guarded completion after a verified merge, not direct cleanup."
  ],
  "archiveDigest": "9bde6a3a80d4d5f9f23adb9fb891c22d098404e982f475e07a384a5b48edd9ab",
  "specDigest": "1c2c06ae0f4232c1470059c90ba5019daa525219f4876a7a813b5c729ee36bc0",
  "tasksDigest": "8c6c3c3c65620433178cb51b78e9f809779381e7dfc4ea87f3987a6c38f7710b",
  "evidenceDigest": "209a9b13aea44acbb42c426a4a5ad51134d1dfa3e93b93b2556ee7c4269b097a",
  "knownGaps": []
}
```
