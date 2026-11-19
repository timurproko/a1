# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Native stable publication runs from `release.yml`, and the reusable publisher rejects the obsolete stable caller path.
- Governance, runbook, and npm diagnostics consistently identify `release.yml` without changing stable release behavior.
- Historical `Release`/`release.yml` evidence remains readable without classifying the active `Publish stable release` workflow as a scheduled publisher.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "rename-stable-release-workflow",
  "sourcePr": 655,
  "archive": "openspec/changes/archive/2026-10-01-rename-stable-release-workflow/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-01-rename-stable-release-workflow/acceptance.md",
  "finalizedDate": "2026-10-01",
  "specBaseSha": "60a300a5575584e6fcb8848dd88793a47405260d",
  "acceptanceScenarios": [
    "Native stable publication runs from `release.yml`, and the reusable publisher rejects the obsolete stable caller path.",
    "Governance, runbook, and npm diagnostics consistently identify `release.yml` without changing stable release behavior.",
    "Historical `Release`/`release.yml` evidence remains readable without classifying the active `Publish stable release` workflow as a scheduled publisher."
  ],
  "archiveDigest": "30a882baa8b3cbedadee2f5d69aa7cae5b72d530bd11ee8e03c4b5da2f24efa6",
  "specDigest": "7dd337e4f55f3ecce6af143c6f5e81713591899c91a56437f6fd327b143b96b5",
  "tasksDigest": "04b5b8f6c771fee08680a3fbae3632032e234bf2d0f507e05277b485a45accae",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
