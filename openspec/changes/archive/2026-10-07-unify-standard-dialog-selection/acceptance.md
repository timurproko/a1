# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Standard item-bounded lists use the blue selection surface without filling unused row width or introducing bold text.
- Resume Session uses blue `selectedBg` across its full-row geometry with a non-bold checkmark-green selected title and muted metadata.
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
    "Resume Session uses blue `selectedBg` across its full-row geometry with a non-bold checkmark-green selected title and muted metadata.",
    "Session Tree preserves user, assistant, system, tool, error, label, timestamp, and description colors while selected.",
    "Existing dialog, Settings, autocomplete, and comparison-profile behavior remains unchanged."
  ],
  "archiveDigest": "0560421eb3ed892c8a08b884b58b691b59443d06325d48a75441cb776cf82f7f",
  "specDigest": "182b89cbd0b781d2580831df1fd90282d4186a178c70e584745124394118b0d3",
  "tasksDigest": "1c7a561a3e4bd823bd885e77ade992b255ca6b96fa960d0819604e4171f4abc7",
  "evidenceDigest": "c60e9256a152e15c8f87f713e08d3748b580148844da6b8e0cc4a376532bf91a",
  "knownGaps": []
}
```
