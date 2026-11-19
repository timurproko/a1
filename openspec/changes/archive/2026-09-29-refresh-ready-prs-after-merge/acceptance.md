# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A merge into develop updates every stale open non-draft same-repository pull request, and each new head restarts ordinary finalization and CI.
- Completion of Documentation auto-merge triggers the same refresh, and a pass with nothing stale changes no branch.
- Drafts, forks, other bases, and already-current pull requests are left unchanged and reported as skipped or current.
- A pull request whose head moves during refresh is deferred without overwriting the new commit.
- A pull request that conflicts with develop is reported for manual repair while other pull requests still refresh.
- A missing or underprivileged App token fails the run visibly with no fallback to GITHUB_TOKEN, and the refresh never merges, arms auto-merge, or dispatches checks.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "refresh-ready-prs-after-merge",
  "sourcePr": 625,
  "archive": "openspec/changes/archive/2026-09-29-refresh-ready-prs-after-merge/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-29-refresh-ready-prs-after-merge/acceptance.md",
  "finalizedDate": "2026-09-29",
  "specBaseSha": "fadd03c2f2f4d2ae9ce1987d78d87b165a2666dd",
  "acceptanceScenarios": [
    "A merge into develop updates every stale open non-draft same-repository pull request, and each new head restarts ordinary finalization and CI.",
    "Completion of Documentation auto-merge triggers the same refresh, and a pass with nothing stale changes no branch.",
    "Drafts, forks, other bases, and already-current pull requests are left unchanged and reported as skipped or current.",
    "A pull request whose head moves during refresh is deferred without overwriting the new commit.",
    "A pull request that conflicts with develop is reported for manual repair while other pull requests still refresh.",
    "A missing or underprivileged App token fails the run visibly with no fallback to GITHUB_TOKEN, and the refresh never merges, arms auto-merge, or dispatches checks."
  ],
  "archiveDigest": "ae1e12c9ceb2cc383a5009a6d2c08b6521dd727e7c683a0a666c993f74cd271b",
  "specDigest": "0524de5786173bfffbcc26b763405d2df597d53e5a93432766cf90239da1dd8d",
  "tasksDigest": "45014f746e21ebbc33388419ff3e707504be3f4180c6a56115fdd9a63193aeef",
  "evidenceDigest": "f81994bf451a5a8c3bf3c1a79b25f3330b45bee2eb31cc0647633b0a0036ad14",
  "knownGaps": []
}
```
