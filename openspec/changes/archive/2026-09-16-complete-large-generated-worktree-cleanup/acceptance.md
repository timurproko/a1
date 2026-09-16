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
  "specBaseSha": "5ba547a0d571d2a67a5aab6bcb81277186aa4ef4",
  "acceptanceScenarios": [
    "Policy-approved generated trees can exceed the 20,000-entry ordinary allowance and still reach normal non-force cleanup within their dedicated bound.",
    "Generated trees that exhaust their 100,000-entry allowance or cross nested-Git, link, or special-file boundaries retain the worktree and fail closed."
  ],
  "archiveDigest": "3053354cce5cccf5a22a39e8729682825f3e7841c79c739c605907db01dcf0a7",
  "specDigest": "09508852e190dbe44ba18c242e1031cc28507180f98292a1137c87e963356a44",
  "tasksDigest": "85c28a320a9330fdd7e9ad6af49ddd64df9ae13d0b40f0a5a1f1a0c2a365eba2",
  "evidenceDigest": "44a8e1735752598ed517bccbfd8f93903cb62a11858be8885b5f33df73bfc888",
  "knownGaps": []
}
```
