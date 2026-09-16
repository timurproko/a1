# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Standard completion removes an eligible worktree whose only remaining generated content is ignored output beneath the exact `native/process-guardian/target` root.
- Other Cargo target roots, near matches, and protected content boundaries remain blocking and are preserved.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "complete-rust-generated-worktree-cleanup",
  "sourcePr": 440,
  "archive": "openspec/changes/archive/2026-09-16-complete-rust-generated-worktree-cleanup/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-16-complete-rust-generated-worktree-cleanup/acceptance.md",
  "finalizedDate": "2026-09-16",
  "specBaseSha": "926da1ea4672f43a696706d877eb576babd1fdb3",
  "acceptanceScenarios": [
    "Standard completion removes an eligible worktree whose only remaining generated content is ignored output beneath the exact `native/process-guardian/target` root.",
    "Other Cargo target roots, near matches, and protected content boundaries remain blocking and are preserved."
  ],
  "archiveDigest": "8ca10626f5e90d3ca0a2da8e6257ffb407782a79f3612417d685a12d33ddcdff",
  "specDigest": "0a57d07e29ed5ce2e0ebfbc04813466c4f5823d962c7847d3ccf085d02ed67ae",
  "tasksDigest": "c485b81679fda8be6206c169b502c38ff0b17a5ec6b1b463d0240c5efdece5b4",
  "evidenceDigest": "3700f972c4eb4144988f826bc133a360ca3196f320b1aec18d508f341fcf0a88",
  "knownGaps": []
}
```
