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
  "archiveDigest": "30267d9b00d910fe1d4d2ea22ef71fc57a6bcf264ebb8b44480e52712dfd5a27",
  "specDigest": "90a472c118270ec3b92437c0d7fa4611e84e4dc6870e7e68023a27d9702fc6eb",
  "tasksDigest": "8c6c3c3c65620433178cb51b78e9f809779381e7dfc4ea87f3987a6c38f7710b",
  "evidenceDigest": "a0fc23019452b2958df4d925d492e72a5447f9da9760ace1c91ed20e09006d90",
  "knownGaps": []
}
```
