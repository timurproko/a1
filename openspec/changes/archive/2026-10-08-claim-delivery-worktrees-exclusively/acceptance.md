# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Worktree inventory reports deterministic current, busy, available, and unverifiable states without exposing owner identity.
- Atomic linking admits one racing runtime, preserves an existing stream on failure, and rejects live or uncertain owners.
- Exact process generation checks permit clean release, crash recovery, and resume without trusting PID, age, inactivity, or Git cleanliness.
- Bare A1 publishes and refreshes its runtime lease while comparison mode remains claim-free.
- Delivery guidance requires successful exact-path acquisition before planning or implementation edits.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "claim-delivery-worktrees-exclusively",
  "sourcePr": 724,
  "archive": "openspec/changes/archive/2026-10-08-claim-delivery-worktrees-exclusively/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-08-claim-delivery-worktrees-exclusively/acceptance.md",
  "finalizedDate": "2026-10-08",
  "specBaseSha": "40f750e915534a530844d44575fa460f37a7a2bd",
  "acceptanceScenarios": [
    "Worktree inventory reports deterministic current, busy, available, and unverifiable states without exposing owner identity.",
    "Atomic linking admits one racing runtime, preserves an existing stream on failure, and rejects live or uncertain owners.",
    "Exact process generation checks permit clean release, crash recovery, and resume without trusting PID, age, inactivity, or Git cleanliness.",
    "Bare A1 publishes and refreshes its runtime lease while comparison mode remains claim-free.",
    "Delivery guidance requires successful exact-path acquisition before planning or implementation edits."
  ],
  "archiveDigest": "77b409dc3d5691ccc727b04f3ee7e9fa989cee8393b2147a78df496f2e8f0ab7",
  "specDigest": "fddf1145ad97b5ba1d895c966fc0aca6732248c35c584645215d15f377fb074d",
  "tasksDigest": "2337d2cb22160a99cd85969907e403c5d0699b11d56bda9fe570582ad06753b2",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
