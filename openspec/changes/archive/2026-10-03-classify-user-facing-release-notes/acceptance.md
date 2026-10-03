# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Generated notes omit non-breaking chores and historical generated regression repairs while retaining explicit breaking changes.
- Historical and newly titled Pi upgrades appear under Changed.
- New regression proposals use chore semantics and new Pi proposals use upgrade semantics without changing trusted branch identities.
- A release range containing only filtered maintenance reports that it has no user-facing changes.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "classify-user-facing-release-notes",
  "sourcePr": 663,
  "archive": "openspec/changes/archive/2026-10-03-classify-user-facing-release-notes/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-03-classify-user-facing-release-notes/acceptance.md",
  "finalizedDate": "2026-10-03",
  "specBaseSha": "2d80cd383be864221019ca221458cda816a13f90",
  "acceptanceScenarios": [
    "Generated notes omit non-breaking chores and historical generated regression repairs while retaining explicit breaking changes.",
    "Historical and newly titled Pi upgrades appear under Changed.",
    "New regression proposals use chore semantics and new Pi proposals use upgrade semantics without changing trusted branch identities.",
    "A release range containing only filtered maintenance reports that it has no user-facing changes."
  ],
  "archiveDigest": "461043b0ac69c1c9994b11248c0d4d546141e3588c20668b77711909aae36865",
  "specDigest": "9c86c1d1fa3db003f3117f1c97123511127b03aae3eebbbd2dea338b9118c620",
  "tasksDigest": "0533e675d0cdf96d434aca673f09564ef984258b996d10db3711ef41a6d65917",
  "evidenceDigest": "ad59b61e79ed6ff781e35539a1ed97bd67ecd339421c79fa1c24bd22255aeb73",
  "knownGaps": []
}
```
