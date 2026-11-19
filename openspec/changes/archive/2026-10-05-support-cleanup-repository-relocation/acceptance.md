# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A terminal journal moved from `D:/Git/a1` to `E:/Git/a1` is atomically rebound during a mutation-locked operation while read-only access remains non-mutating.
- The migrated history grants no deletion authority; the current worktree is captured and registered afresh before normal cleanup evaluation.
- Any owned, released, partially deleting, malformed, out-of-root, duplicate-after-rebase, repository-mismatched, or remote-mismatched journal remains unchanged and blocked.
- A failed atomic replacement preserves the prior complete drive-bound journal.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "support-cleanup-repository-relocation",
  "sourcePr": 675,
  "archive": "openspec/changes/archive/2026-10-05-support-cleanup-repository-relocation/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-05-support-cleanup-repository-relocation/acceptance.md",
  "finalizedDate": "2026-10-05",
  "specBaseSha": "b0fbd191ec482bbdf8670ea7b6d5cc47ce75fdba",
  "acceptanceScenarios": [
    "A terminal journal moved from `D:/Git/a1` to `E:/Git/a1` is atomically rebound during a mutation-locked operation while read-only access remains non-mutating.",
    "The migrated history grants no deletion authority; the current worktree is captured and registered afresh before normal cleanup evaluation.",
    "Any owned, released, partially deleting, malformed, out-of-root, duplicate-after-rebase, repository-mismatched, or remote-mismatched journal remains unchanged and blocked.",
    "A failed atomic replacement preserves the prior complete drive-bound journal."
  ],
  "archiveDigest": "9877a29bee905600c6728d24b8efa5bdc359a8b7f1a3b4fd2b90299e22ae43bd",
  "specDigest": "e9cceca4f95d1b2efe6de2ff4f9db396cbd3a4aba70b7445c9d5b6aba08cc6fd",
  "tasksDigest": "1108f945bc6e88b18f8910c77dba25458142cb8d585e0f71c453968c8042a33b",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
