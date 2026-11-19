# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Successful observable compactions publish terminal 100% before their working status clears, even when the character estimate ends near 40% to 50%.
- Failed, aborted, stale, ended, and disposed observations never claim terminal completion, while running estimates remain monotonic.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "complete-compaction-result-progress",
  "sourcePr": 871,
  "archive": "openspec/changes/archive/2026-11-06-complete-compaction-result-progress/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-06-complete-compaction-result-progress/acceptance.md",
  "finalizedDate": "2026-11-06",
  "specBaseSha": "fc4a2588e22b6d90034465d80d7923c8fede91d8",
  "acceptanceScenarios": [
    "Successful observable compactions publish terminal 100% before their working status clears, even when the character estimate ends near 40% to 50%.",
    "Failed, aborted, stale, ended, and disposed observations never claim terminal completion, while running estimates remain monotonic."
  ],
  "archiveDigest": "ff1209dcf06cd2eabcaf0230d6b6b5a5dcbc28bde47ea4571290d11c8fc397a7",
  "specDigest": "14a116fbd80d2f4043bb7fe39fedfb43f382a4850eeeef27756aec5d636e680a",
  "tasksDigest": "9fb915dae93c31a8ad58996a5f9c46de8d30c286a3c805546a063af8d4c57d47",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
