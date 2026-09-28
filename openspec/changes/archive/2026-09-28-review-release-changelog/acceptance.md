# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Stable release dispatch requires an editable, same-repository release-note PR manually merged by an authorized human from the exact current source.
- The reviewed Markdown is packaged, validated against the stable version, and reused verbatim for the GitHub Release while immutable publication and reopening safeguards remain intact.
- Bare A1 presents packaged release history through `/changelog` and opens the matching stable note once after higher-priority startup prompts.
- Per-profile claims and acknowledgements preserve pending notes across previews, downgrades, concurrent launches, failures, and exits before a rendered close while `a1 pi` retains its pinned Pi changelog.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "review-release-changelog",
  "sourcePr": 613,
  "archive": "openspec/changes/archive/2026-09-28-review-release-changelog/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-28-review-release-changelog/acceptance.md",
  "finalizedDate": "2026-09-28",
  "specBaseSha": "6ed84ba8a160c11dbd33f69004db4593396dbbb1",
  "acceptanceScenarios": [
    "Stable release dispatch requires an editable, same-repository release-note PR manually merged by an authorized human from the exact current source.",
    "The reviewed Markdown is packaged, validated against the stable version, and reused verbatim for the GitHub Release while immutable publication and reopening safeguards remain intact.",
    "Bare A1 presents packaged release history through `/changelog` and opens the matching stable note once after higher-priority startup prompts.",
    "Per-profile claims and acknowledgements preserve pending notes across previews, downgrades, concurrent launches, failures, and exits before a rendered close while `a1 pi` retains its pinned Pi changelog."
  ],
  "archiveDigest": "ad548729989f2891b60d517f902267ff41ff8eb80e4978eb824cc27e9d0fdfdd",
  "specDigest": "ea5568691559e5962280f74ff8ac77be0d740174b7ff3a594caec22fbb5cd9f0",
  "tasksDigest": "68e813cf94f4a6ed28df81be37d64f9920b2d99dcc1124cf9a6d32ba1263c9b4",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
