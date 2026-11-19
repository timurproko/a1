# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- An exact bot-generated four-file reopening is verified against its current identities, manifests, published Release, and note before receiving lightweight validation.
- A verified reopening omits generic analysis and unrelated product lanes, while the protected aggregate accepts only the intentional skips for that exact head.
- Stale, malformed, unavailable, or lookalike reopening evidence receives no exemption, and documentation auto-merge independently re-verifies the candidate before integration.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "route-release-reopening-validation",
  "sourcePr": 708,
  "archive": "openspec/changes/archive/2026-10-07-route-release-reopening-validation/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-07-route-release-reopening-validation/acceptance.md",
  "finalizedDate": "2026-10-07",
  "specBaseSha": "852ba46d8ea5b99513b595877c3770f9ae76d21e",
  "acceptanceScenarios": [
    "An exact bot-generated four-file reopening is verified against its current identities, manifests, published Release, and note before receiving lightweight validation.",
    "A verified reopening omits generic analysis and unrelated product lanes, while the protected aggregate accepts only the intentional skips for that exact head.",
    "Stale, malformed, unavailable, or lookalike reopening evidence receives no exemption, and documentation auto-merge independently re-verifies the candidate before integration."
  ],
  "archiveDigest": "d93746d0b64be2a03de5e87b826edd4118ee35219fb81468c20fbeb723270f8a",
  "specDigest": "b05220d0f8884ca9eb8f8a1f601d1da25a1417663e3c51e273343ef641a62a9c",
  "tasksDigest": "20fe1e2b915cdc43b36a7ebc22e5431f80246c92419189908e5b74e19a041027",
  "evidenceDigest": "b72567d709bb5ae90b07f84fc02d8c18b253b62c12563c450601441be13f238b",
  "knownGaps": []
}
```
