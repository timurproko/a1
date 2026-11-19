# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Opening `/models` invokes the background catalog refresh and shows muted `(refreshing)` beside the title for at least one second without rendering the full progress sentence in the body.
- Successful refresh preserves query, selection, scope, and dirty state, transitions `(refreshing)` to timed `(refreshed)`, and then removes the refresh suffix without clearing `(unsaved)`.
- Failure or timeout replaces the title progress with actionable body details, while a replaced or disposed timer produces no stale status or late render.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "show-model-refresh-progress-in-title",
  "sourcePr": 584,
  "archive": "openspec/changes/archive/2026-09-24-show-model-refresh-progress-in-title/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-24-show-model-refresh-progress-in-title/acceptance.md",
  "finalizedDate": "2026-09-24",
  "specBaseSha": "4920eed828387e598c69b09182f658e723e48b55",
  "acceptanceScenarios": [
    "Opening `/models` invokes the background catalog refresh and shows muted `(refreshing)` beside the title for at least one second without rendering the full progress sentence in the body.",
    "Successful refresh preserves query, selection, scope, and dirty state, transitions `(refreshing)` to timed `(refreshed)`, and then removes the refresh suffix without clearing `(unsaved)`.",
    "Failure or timeout replaces the title progress with actionable body details, while a replaced or disposed timer produces no stale status or late render."
  ],
  "archiveDigest": "95aeb9b2e06540529ac3eb0e8e88a0e6fc1e7027afbe844c77c4e7b53d16a149",
  "specDigest": "cdf0d16125a90d4d638747cb1bb338e3461fa81116fd7ced478efe3c8f8d0747",
  "tasksDigest": "8175b0786effc602cb1880ff7ddbc310f179ea34851d7726d2b87c396ca46eee",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
