# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Pull-request validation contains no acceptance-record or finalized-delivery job and no acceptance route.
- A ready pull request that links a change still runs no test suite until its finalized head is recorded.
- The auto-merge workflow acts only on release reopening branches and never disarms another pull request.
- No script, test, configuration or document in the repository names a deleted delivery or cleanup file.
- Agent instructions name the shared change-delivery skill as the single owner of the delivery rules.
- The delivery, local cleanup and acceptance review specifications no longer exist after finalization.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "remove-local-delivery-automation",
  "sourcePr": 978,
  "archive": "openspec/changes/archive/2026-11-18-remove-local-delivery-automation/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-18-remove-local-delivery-automation/acceptance.md",
  "finalizedDate": "2026-11-18",
  "specBaseSha": "33b5d5979ba70609eb38c5bdad3ee7d2cf3adaca",
  "acceptanceScenarios": [
    "Pull-request validation contains no acceptance-record or finalized-delivery job and no acceptance route.",
    "A ready pull request that links a change still runs no test suite until its finalized head is recorded.",
    "The auto-merge workflow acts only on release reopening branches and never disarms another pull request.",
    "No script, test, configuration or document in the repository names a deleted delivery or cleanup file.",
    "Agent instructions name the shared change-delivery skill as the single owner of the delivery rules.",
    "The delivery, local cleanup and acceptance review specifications no longer exist after finalization."
  ],
  "archiveDigest": "54ea296eecbd5b8f26db83d7f57f67e7613aaf2fcf7c23ae5870078d63d86fb8",
  "specDigest": "be4dd236cdfaddd84a7146ee9e99dae911885e0367e36f74d64c028b1146d30b",
  "tasksDigest": "af74f403f5d3a2f98a1d4a54456ac80897fb5960af92d2cb2013c46420d038ea",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
