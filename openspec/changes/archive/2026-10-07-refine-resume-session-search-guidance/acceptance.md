# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Empty Resume Session searches show the comma-separated regex and exact-phrase guidance with a neutral-white active cursor cell and faint remaining text, and real query text replaces it without changing matching behavior.
- The ordinary footer presents search, navigation, selection, scope, session actions, dynamic path state, rename, and close guidance in one standard semantic row.
- Narrow layouts preserve the complete `Esc close` suffix, while delete confirmation, status feedback, loading, and existing session operations retain their behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "refine-resume-session-search-guidance",
  "sourcePr": 704,
  "archive": "openspec/changes/archive/2026-10-07-refine-resume-session-search-guidance/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-07-refine-resume-session-search-guidance/acceptance.md",
  "finalizedDate": "2026-10-07",
  "specBaseSha": "59de51109758b1e7c04691c44d39ed1dc7595fd5",
  "acceptanceScenarios": [
    "Empty Resume Session searches show the comma-separated regex and exact-phrase guidance with a neutral-white active cursor cell and faint remaining text, and real query text replaces it without changing matching behavior.",
    "The ordinary footer presents search, navigation, selection, scope, session actions, dynamic path state, rename, and close guidance in one standard semantic row.",
    "Narrow layouts preserve the complete `Esc close` suffix, while delete confirmation, status feedback, loading, and existing session operations retain their behavior."
  ],
  "archiveDigest": "a060b679e95f5773c58693e72b06223be21864df1b7aebe75189112c22b727be",
  "specDigest": "ccce64f2fcbf32215564f2cbe55a3e1cd7ab99ce23e50e12f35311a8d94e2357",
  "tasksDigest": "537e56c14f1f3096a260bf26d810d5a86df2c01d3d62ff317d94a06d69924242",
  "evidenceDigest": "7c2591fb1aa107793a6794dfb8d080679d7ee5cf754d5573fe4adc59483cb81d",
  "knownGaps": []
}
```
