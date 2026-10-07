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
  "archiveDigest": "0119fbce6763b6d66f9f372827e46f40632200b9a7a947cd2ef85844d245ce60",
  "specDigest": "a0a76dec4936a5ccfd5185a2ff971f22d043ed9590fa2198008295dbf4839e8c",
  "tasksDigest": "6b1922b7a93c2cc79007e58d09203953a72d085aed307be1af0bb8cb64ad90d6",
  "evidenceDigest": "13c12dcd4e27886bf33231b29d418c3ef72e26789cbf83fa6071dd532477c8f9",
  "knownGaps": []
}
```
