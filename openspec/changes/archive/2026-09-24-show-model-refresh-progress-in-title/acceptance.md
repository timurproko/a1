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
  "archiveDigest": "8b32120ce82d8f796b1fa888fe418bb82889021bb30ac5f45260016c34b6df60",
  "specDigest": "53c7c0ae83a0cae6f8c256d340e71354423910599246e5558d66151a46e69742",
  "tasksDigest": "7caca3d08c5f080cd5b5d5b4c1bc3df5937c464a5075437f93d1a4ff81ddae82",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
