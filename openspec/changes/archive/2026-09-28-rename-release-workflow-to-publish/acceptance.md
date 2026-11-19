# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The sole package publisher is exposed as `publish.yml` and `Publish` with its publication triggers, permissions, gates, and jobs otherwise unchanged.
- Development and stable commands dispatch `publish.yml`, and active governance, validation, documentation, and tests use the new workflow identity.
- Scheduled `Publish` failures retain nightly triage while historical `Release` provenance remains readable and mixed identity pairs fail closed.
- The runbook requires both npm package trusted-publisher settings to name `publish.yml` before any post-merge publication.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "rename-release-workflow-to-publish",
  "sourcePr": 612,
  "archive": "openspec/changes/archive/2026-09-28-rename-release-workflow-to-publish/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-28-rename-release-workflow-to-publish/acceptance.md",
  "finalizedDate": "2026-09-28",
  "specBaseSha": "28b223f5686abfbc97c99d6c5a0792cb4df5fcd4",
  "acceptanceScenarios": [
    "The sole package publisher is exposed as `publish.yml` and `Publish` with its publication triggers, permissions, gates, and jobs otherwise unchanged.",
    "Development and stable commands dispatch `publish.yml`, and active governance, validation, documentation, and tests use the new workflow identity.",
    "Scheduled `Publish` failures retain nightly triage while historical `Release` provenance remains readable and mixed identity pairs fail closed.",
    "The runbook requires both npm package trusted-publisher settings to name `publish.yml` before any post-merge publication."
  ],
  "archiveDigest": "770c8474f68b252e164e3a2444a2e88ff8c56a8a37a0af6df5d82fb0d6752cbf",
  "specDigest": "d78925c5df91ae4efd8c62a4f37878fdc4dbb8780b3f42e669ff9bb98daf7a9d",
  "tasksDigest": "75601c1f01ee54bd3a44c48daf376a8d64657dbf0187ebd6b11a89cbcb810a1b",
  "evidenceDigest": "6b332c89d69993360c16e43d2ce37fa71212e34cdd5f97a5ee9ff52474a07681",
  "knownGaps": []
}
```
