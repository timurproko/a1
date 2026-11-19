# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- One A1 session links, lists, activates, and releases worktrees exactly as before, and `a1 session worktrees` output is byte-identical.
- Two agents of one runtime hold claims on two worktrees; activating one agent keeps the other's claim, and the listing shows the other worktree as `busy` with its agent.
- Releasing the runtime clears both agents' claims and runtime records.
- Claim and runtime records written by a single-agent release are read as the primary agent's and rewritten with `formatVersion: 2` and `agentId: "primary"`.
- A mutation lock whose holder is gone, or whose pid now has another start identity, is evicted and the mutation proceeds; a live, unidentified, or uninspectable holder keeps the lock and the mutation reports `worktree-claim-busy`.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "per-agent-worktree-claims",
  "sourcePr": 736,
  "archive": "openspec/changes/archive/2026-10-10-per-agent-worktree-claims/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-10-per-agent-worktree-claims/acceptance.md",
  "finalizedDate": "2026-10-10",
  "specBaseSha": "d7fa345b377e58ae0451abd7983080ac6e3cc6f0",
  "acceptanceScenarios": [
    "One A1 session links, lists, activates, and releases worktrees exactly as before, and `a1 session worktrees` output is byte-identical.",
    "Two agents of one runtime hold claims on two worktrees; activating one agent keeps the other's claim, and the listing shows the other worktree as `busy` with its agent.",
    "Releasing the runtime clears both agents' claims and runtime records.",
    "Claim and runtime records written by a single-agent release are read as the primary agent's and rewritten with `formatVersion: 2` and `agentId: \"primary\"`.",
    "A mutation lock whose holder is gone, or whose pid now has another start identity, is evicted and the mutation proceeds; a live, unidentified, or uninspectable holder keeps the lock and the mutation reports `worktree-claim-busy`."
  ],
  "archiveDigest": "806ffe36e94a45247e7c4639a709b6e158f7df2fd360dd44809fcdc73957528d",
  "specDigest": "a55e258b41a29915ef9afab90524a45b301b3b797a81358a58664706a8b2ffc2",
  "tasksDigest": "aa5304c5347c3c5cddb6dfefdd33d76930e9182863fd733a8ea9a196751e2b38",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
