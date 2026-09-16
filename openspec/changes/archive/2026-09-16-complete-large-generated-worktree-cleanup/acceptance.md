# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Policy-approved generated trees can exceed the 20,000-entry ordinary allowance and still reach normal non-force cleanup within their dedicated bound.
- Generated trees that exhaust their 100,000-entry allowance or cross nested-Git, link, or special-file boundaries retain the worktree and fail closed.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "complete-large-generated-worktree-cleanup",
  "sourcePr": 437,
  "archive": "openspec/changes/archive/2026-09-16-complete-large-generated-worktree-cleanup/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-16-complete-large-generated-worktree-cleanup/acceptance.md",
  "finalizedDate": "2026-09-16",
  "specBaseSha": "5f3021ca80fb5402309bafe96db6791241c93f49",
  "acceptanceScenarios": [
    "Policy-approved generated trees can exceed the 20,000-entry ordinary allowance and still reach normal non-force cleanup within their dedicated bound.",
    "Generated trees that exhaust their 100,000-entry allowance or cross nested-Git, link, or special-file boundaries retain the worktree and fail closed."
  ],
  "archiveDigest": "24662bea9e5493d2cb3381c98de2ceb767ba72dbc137ded2bb1bbf0e0ea1303b",
  "specDigest": "444e5bf0befc9f48e042f4ca509e6af8264187bad8437bbbb44af3d95adece43",
  "tasksDigest": "140596606d5596b78b28ad5a017a8517a3841c569fe511afd09bb552cf53bb08",
  "evidenceDigest": "d3b1f7b337319122f574a2813b22f57ac776f5773a5d6c8ff4371ba15d5a806e",
  "knownGaps": []
}
```
