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
  "archiveDigest": "ea3fa6081750857fc3a31f9269d2e121386a4781c5bb7e40570a94cb565ddb3e",
  "specDigest": "bd15ff8674761208c4989acb367fa64c024fd0df1663429f61579263ade30582",
  "tasksDigest": "e6b5d2498226ce97f11081098bbe6d88d62290b0e5637c549ded270fb1e9d2f9",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
