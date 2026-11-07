# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Explicit closed-unmerged branch-only discard removes only exact unchanged refs without creating or deleting a checkout.
- Checked-out, live-registered, open, protected, advanced, or recreated branch candidates retain their remaining resources.
- Explicit named-link remediation removes only the selected external disposable link while preserving its target and released worktree.
- Link or parent drift, dirty content, unrelated unsafe links, and ownership conflicts block remediation without widening ordinary sweep authority.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "guarded-cleanup-edge-cases",
  "sourcePr": 877,
  "archive": "openspec/changes/archive/2026-11-07-guarded-cleanup-edge-cases/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-07-guarded-cleanup-edge-cases/acceptance.md",
  "finalizedDate": "2026-11-07",
  "specBaseSha": "7e6559c8ad6c5f7f6ffbc28ed21d11219bfae45d",
  "acceptanceScenarios": [
    "Explicit closed-unmerged branch-only discard removes only exact unchanged refs without creating or deleting a checkout.",
    "Checked-out, live-registered, open, protected, advanced, or recreated branch candidates retain their remaining resources.",
    "Explicit named-link remediation removes only the selected external disposable link while preserving its target and released worktree.",
    "Link or parent drift, dirty content, unrelated unsafe links, and ownership conflicts block remediation without widening ordinary sweep authority."
  ],
  "archiveDigest": "e224f099e8e302be2778642c8004dd31b1c9ec66ef950a6e12990dff8b1547c1",
  "specDigest": "bd15ff8674761208c4989acb367fa64c024fd0df1663429f61579263ade30582",
  "tasksDigest": "7107d35d16e4cde54940929fa056e573d03d4b1fb2da8a5690a4020a17af8263",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
