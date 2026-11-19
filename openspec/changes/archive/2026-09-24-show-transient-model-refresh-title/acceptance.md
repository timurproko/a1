# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Successful catalog refresh shows a success-colored `(refreshed)` beside the Models title for one second without retaining the full success sentence in the body.
- Dirty scope state remains visible as `Models (unsaved) (refreshed)` and stays unsaved after the refresh acknowledgement disappears.
- Progress and timeout or failure details remain in the body, while replaced or disposed refresh timers produce no stale acknowledgement or late render.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "show-transient-model-refresh-title",
  "sourcePr": 583,
  "archive": "openspec/changes/archive/2026-09-24-show-transient-model-refresh-title/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-24-show-transient-model-refresh-title/acceptance.md",
  "finalizedDate": "2026-09-24",
  "specBaseSha": "7b8c463bace22cc8850900b418af4ef5c4daacd1",
  "acceptanceScenarios": [
    "Successful catalog refresh shows a success-colored `(refreshed)` beside the Models title for one second without retaining the full success sentence in the body.",
    "Dirty scope state remains visible as `Models (unsaved) (refreshed)` and stays unsaved after the refresh acknowledgement disappears.",
    "Progress and timeout or failure details remain in the body, while replaced or disposed refresh timers produce no stale acknowledgement or late render."
  ],
  "archiveDigest": "1d543b657efed18b1da5d57520bd6ba04d12f710d35c7b92254862fdeca4f03b",
  "specDigest": "0f8610451e9a5633e70a00a7b19c9eb071a7c093c1740ac78df9b81c8b843b04",
  "tasksDigest": "8420924136d6c33fcc45684c5ece3016c936cec922e8c772e461e2b78e072e14",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
