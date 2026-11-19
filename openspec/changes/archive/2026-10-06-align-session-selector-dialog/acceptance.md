# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Resume Session and rename mode use the same standard full-width top and bottom rule color as Session Tree and Models, distinct from the accent title.
- Resume Session shows one accent title and a stable lower-case filter/name/sort row without duplicated scope or loader progress.
- Progressive all-session discovery grows the ordinary result paging total while shortcuts and dynamic feedback remain at the bottom.
- Session titles, paths, message counts, and ages stay in aligned independently truncated columns.
- Selected sessions use Session Tree's accent `→`, accent non-bold title, muted metadata, and subtle purple full-row highlight.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "align-session-selector-dialog",
  "sourcePr": 693,
  "archive": "openspec/changes/archive/2026-10-06-align-session-selector-dialog/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-06-align-session-selector-dialog/acceptance.md",
  "finalizedDate": "2026-10-06",
  "specBaseSha": "457def6c1fbb7d1f045c715fc7c6d5adf8313f64",
  "acceptanceScenarios": [
    "Resume Session and rename mode use the same standard full-width top and bottom rule color as Session Tree and Models, distinct from the accent title.",
    "Resume Session shows one accent title and a stable lower-case filter/name/sort row without duplicated scope or loader progress.",
    "Progressive all-session discovery grows the ordinary result paging total while shortcuts and dynamic feedback remain at the bottom.",
    "Session titles, paths, message counts, and ages stay in aligned independently truncated columns.",
    "Selected sessions use Session Tree's accent `→`, accent non-bold title, muted metadata, and subtle purple full-row highlight."
  ],
  "archiveDigest": "a07aa104a01e3dd64da101051ebe0f0ff89f9080efb508973136e51798b4043d",
  "specDigest": "f8dadb539ba570fe1cf179ff4eee429a1234b09b1c9511c135fb40d4b74b86a1",
  "tasksDigest": "6727c7f041b0e5723250990d1497f660e8bcab4e00c17d45587fbee34a342d3a",
  "evidenceDigest": "7b3b22f34a34599e3466e23e89c1a5df555ae1feabbc078a7ef1240b2ffa697c",
  "knownGaps": []
}
```
