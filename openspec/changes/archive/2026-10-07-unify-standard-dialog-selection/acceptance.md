# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Standard item-bounded lists use the blue selection surface without filling unused row width or introducing bold text.
- Resume Session uses blue `selectedBg` across its full-row geometry with a non-bold checkmark-green selected title and muted metadata, while a retained resume notice keeps exactly one empty row before either the open dialog or restored editor.
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
    "Resume Session uses blue `selectedBg` across its full-row geometry with a non-bold checkmark-green selected title and muted metadata, while a retained resume notice keeps exactly one empty row before either the open dialog or restored editor.",
    "Session Tree preserves user, assistant, system, tool, error, label, timestamp, and description colors while selected.",
    "Existing dialog, Settings, autocomplete, and comparison-profile behavior remains unchanged."
  ],
  "archiveDigest": "c2b249a912fe8fb4aba495149afbd1aee73b96a7a07d3f40d4c77eff6b7666f7",
  "specDigest": "277a4f983dfa846a4ff99bb87e3f967be1af1b32bd335d94db9cf021b37ecc06",
  "tasksDigest": "0c216069abeb0279a4f51914f8e09c66be279580ca17228927dc165291e76b12",
  "evidenceDigest": "7c71e38c98ce333ab521f4e4fe35a41a7e958bedff4131761fbb1969504f604e",
  "knownGaps": []
}
```
