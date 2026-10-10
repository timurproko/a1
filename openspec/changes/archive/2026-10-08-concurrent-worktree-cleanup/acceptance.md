# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Cleanup of a disjoint worktree proceeds while another candidate is paused in generated-content cleanup.
- Same-path and same-ref operations defer without racing ownership, journals, worktree removal, or branch deletion.
- Sweep reports a held candidate as deferred and continues removing other eligible worktrees.
- Concurrent candidate transitions and reports remain complete, atomic, and independently auditable.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "concurrent-worktree-cleanup",
  "sourcePr": 725,
  "archive": "openspec/changes/archive/2026-10-08-concurrent-worktree-cleanup/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-08-concurrent-worktree-cleanup/acceptance.md",
  "finalizedDate": "2026-10-08",
  "specBaseSha": "3b2c0f1dc8c8878f1f3c9e31b0e4387ec5d412c2",
  "acceptanceScenarios": [
    "Cleanup of a disjoint worktree proceeds while another candidate is paused in generated-content cleanup.",
    "Same-path and same-ref operations defer without racing ownership, journals, worktree removal, or branch deletion.",
    "Sweep reports a held candidate as deferred and continues removing other eligible worktrees.",
    "Concurrent candidate transitions and reports remain complete, atomic, and independently auditable."
  ],
  "archiveDigest": "249f6cacbcad6c032bc383520c665c3271e96ed231e550a4f611279404f56515",
  "specDigest": "e988a0dfd8358405609c05375d5c87765942d1f1dd0c36b9ce29818eae8e5856",
  "tasksDigest": "cc80314f4bfd404b145986e923c8cb865131497bb4c0b391e2a26d3da6bbb227",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
