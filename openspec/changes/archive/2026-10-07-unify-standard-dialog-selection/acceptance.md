# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Standard item-bounded lists use the blue selection surface without filling unused row width or introducing bold text.
- Resume Session keeps its full-row geometry and semantic title colors without making selected titles bold.
- Session Tree preserves user, assistant, system, tool, error, label, timestamp, and description colors while selected.
- Existing dialog, Settings, autocomplete, and comparison-profile behavior remains unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "unify-standard-dialog-selection",
  "sourcePr": 686,
  "archive": "openspec/changes/archive/2026-10-07-unify-standard-dialog-selection/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-07-unify-standard-dialog-selection/acceptance.md",
  "finalizedDate": "2026-10-07",
  "specBaseSha": "b21a9779baf6ed9e410f57a9f6c40e12403f5f86",
  "acceptanceScenarios": [
    "Standard item-bounded lists use the blue selection surface without filling unused row width or introducing bold text.",
    "Resume Session keeps its full-row geometry and semantic title colors without making selected titles bold.",
    "Session Tree preserves user, assistant, system, tool, error, label, timestamp, and description colors while selected.",
    "Existing dialog, Settings, autocomplete, and comparison-profile behavior remains unchanged."
  ],
  "archiveDigest": "9acf9815ed7695ade4555d48da81ef24a121fcdee2319ea742a6951822dfa92f",
  "specDigest": "a0a76dec4936a5ccfd5185a2ff971f22d043ed9590fa2198008295dbf4839e8c",
  "tasksDigest": "6b1922b7a93c2cc79007e58d09203953a72d085aed307be1af0bb8cb64ad90d6",
  "evidenceDigest": "55afe56bdb762df2716f9d449f1e9eb2bb79e575fcf7d33074221128e178de96",
  "knownGaps": []
}
```
