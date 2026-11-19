# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- `a1 session worktrees` succeeds when a registered worktree directory is missing and lists that entry as `unverifiable` with no agent.
- Live worktrees in the same inventory keep their ordinary `current`, `busy`, or `available` status.
- Linking and reading a live worktree association are unaffected by a stale registration.
- Every other filesystem error while resolving a worktree still fails the inventory as before.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "tolerate-stale-worktree-registrations",
  "sourcePr": 839,
  "archive": "openspec/changes/archive/2026-10-26-tolerate-stale-worktree-registrations/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-26-tolerate-stale-worktree-registrations/acceptance.md",
  "finalizedDate": "2026-10-26",
  "specBaseSha": "1f02b2e4d00bba6a70ff2b24e6752a7f05a445e4",
  "acceptanceScenarios": [
    "`a1 session worktrees` succeeds when a registered worktree directory is missing and lists that entry as `unverifiable` with no agent.",
    "Live worktrees in the same inventory keep their ordinary `current`, `busy`, or `available` status.",
    "Linking and reading a live worktree association are unaffected by a stale registration.",
    "Every other filesystem error while resolving a worktree still fails the inventory as before."
  ],
  "archiveDigest": "3ac3f770db54f5f29ae9ed61648ef54b2c2800bcc575b2b1ae43cd3ecc6747b3",
  "specDigest": "623fa2aaffc2656b5e3ea8f5e5ec38ec6cfa5a83d6323aeafde0dee101e87559",
  "tasksDigest": "ffeb700aa4d3f038a33c530a0f22f1e8167d1db1bee87bbebe4ed537c9a5b3fd",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
