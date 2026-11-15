# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- `a1 api` capabilities now lists `session.lifecycle` and `session.exit` and reports `lifecycle: true` while every existing operation and flag is unchanged.
- `session.lifecycle` returns the exact target plus lifecycle, editor emptiness, pending submissions, queued input, overlay state and ordered blockers without clearing, dismissing or interrupting anything.
- `session.exit` on an idle empty session acknowledges `status: "admitted"` once and the session stops through the same path as `/quit`.
- `session.exit` while a turn runs, a draft exists, input is queued or an overlay is open fails with the first blocker code and leaves the session exactly as it was.
- Concurrent exit requests admit exactly one; later requests and a stopping session answer `session-stopping`, and a failed engine quit allows a later request.
- Lifecycle requests before the shell exists, after disposal, or for a mismatched runtime fail with `session-unavailable` without reaching the shell.
- Pinned Pi queued input is read through its pending count, never through `clearQueue`.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "session-exit-control",
  "sourcePr": 946,
  "archive": "openspec/changes/archive/2026-11-15-session-exit-control/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-15-session-exit-control/acceptance.md",
  "finalizedDate": "2026-11-15",
  "specBaseSha": "a87e847b82e9394a4acf9f1451267328b7ffd1e8",
  "acceptanceScenarios": [
    "`a1 api` capabilities now lists `session.lifecycle` and `session.exit` and reports `lifecycle: true` while every existing operation and flag is unchanged.",
    "`session.lifecycle` returns the exact target plus lifecycle, editor emptiness, pending submissions, queued input, overlay state and ordered blockers without clearing, dismissing or interrupting anything.",
    "`session.exit` on an idle empty session acknowledges `status: \"admitted\"` once and the session stops through the same path as `/quit`.",
    "`session.exit` while a turn runs, a draft exists, input is queued or an overlay is open fails with the first blocker code and leaves the session exactly as it was.",
    "Concurrent exit requests admit exactly one; later requests and a stopping session answer `session-stopping`, and a failed engine quit allows a later request.",
    "Lifecycle requests before the shell exists, after disposal, or for a mismatched runtime fail with `session-unavailable` without reaching the shell.",
    "Pinned Pi queued input is read through its pending count, never through `clearQueue`."
  ],
  "archiveDigest": "61cf32a2464fea8d57132e4a84c03a6d2d19e269a3f706cdfcf22a0dbe6d8916",
  "specDigest": "de56c5c30ed381d74dd38d2d24acc1cec9d0aa095f2ab4e6d68856a814af1625",
  "tasksDigest": "834e53087feeaaab995e0a228bddccb2f4a8cf20b402eda6636fd3d01cbff2a1",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
