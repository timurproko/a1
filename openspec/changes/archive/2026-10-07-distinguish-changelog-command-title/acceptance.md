# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `/changelog` opens the complete packaged release-note history under the `Changelog` title.
- An eligible automatic current-release note opens under `What's New` with its acknowledgement lifecycle unchanged.
- `a1 pi` retains its pinned in-feed changelog presentation.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "distinguish-changelog-command-title",
  "sourcePr": 707,
  "archive": "openspec/changes/archive/2026-10-07-distinguish-changelog-command-title/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-07-distinguish-changelog-command-title/acceptance.md",
  "finalizedDate": "2026-10-07",
  "specBaseSha": "f0b7a339cc3ebc23d846bac061b3a8f319ce5667",
  "acceptanceScenarios": [
    "`/changelog` opens the complete packaged release-note history under the `Changelog` title.",
    "An eligible automatic current-release note opens under `What's New` with its acknowledgement lifecycle unchanged.",
    "`a1 pi` retains its pinned in-feed changelog presentation."
  ],
  "archiveDigest": "71924409f1af388118c2704c7063443bde7db061032ed796ef059523820f20e1",
  "specDigest": "bb9b3c244b19932e13a59a7cf2b13488712eb2327cd91d00a46cd405a35075a7",
  "tasksDigest": "834c025fb71f59e5d142109bd9687591430e70c02a6b0d7c2b6774593c8ce05c",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
