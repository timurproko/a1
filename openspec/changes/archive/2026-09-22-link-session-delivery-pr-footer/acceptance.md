# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A session can explicitly link its same-repository delivery worktree and restore that context after resume.
- Concurrent sessions remain isolated by stable session identity, while foreign, detached, malformed, deleted, and reused contexts fail closed.
- Association, branch, pull-request, and session changes refresh serially without changing the session or tool working directory.
- Narrow bare-A1 footers preserve the complete linked PR badge by truncating path and branch text first without leaking hyperlink state.
- Clearing or omitting an association falls back to startup-repository discovery, and `a1 pi` retains comparison output without cleanup authority changes.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "link-session-delivery-pr-footer",
  "sourcePr": 552,
  "archive": "openspec/changes/archive/2026-09-22-link-session-delivery-pr-footer/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-22-link-session-delivery-pr-footer/acceptance.md",
  "finalizedDate": "2026-09-22",
  "specBaseSha": "9ecb43861946b084665a8d8e68072c825d033731",
  "acceptanceScenarios": [
    "A session can explicitly link its same-repository delivery worktree and restore that context after resume.",
    "Concurrent sessions remain isolated by stable session identity, while foreign, detached, malformed, deleted, and reused contexts fail closed.",
    "Association, branch, pull-request, and session changes refresh serially without changing the session or tool working directory.",
    "Narrow bare-A1 footers preserve the complete linked PR badge by truncating path and branch text first without leaking hyperlink state.",
    "Clearing or omitting an association falls back to startup-repository discovery, and `a1 pi` retains comparison output without cleanup authority changes."
  ],
  "archiveDigest": "2b7b922e43ceaa458ac29e94450cc6cea872b27ca088c99580d4db84b4eac599",
  "specDigest": "2c5231d57a3c945f7f84bb0d8a04748a486d3795b12bf8871abef6b0d943d402",
  "tasksDigest": "bb397adce06b8c20e0639594b0bc64b9897adf1af3570fe8106b3928b1dc056f",
  "evidenceDigest": "d91d9e58952a0509abc45f3543a0f0a59eb3dfbf64bc26d20826d0e35b92b726",
  "knownGaps": []
}
```
