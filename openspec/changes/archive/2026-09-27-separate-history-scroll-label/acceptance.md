# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Recalled-history position remains dim at the left inset without a trailing dot or joined overflow text.
- Hidden lines above appear as a centered `↑ N more` cue in the same border color and placement policy as the lower cue.
- Narrow widths keep history visible, shifting a complete overflow cue right when it fits and omitting only the cue when both labels cannot fit.
- The pinned `a1 pi` comparison keeps its existing editor overflow rendering.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "separate-history-scroll-label",
  "sourcePr": 605,
  "archive": "openspec/changes/archive/2026-09-27-separate-history-scroll-label/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-27-separate-history-scroll-label/acceptance.md",
  "finalizedDate": "2026-09-27",
  "specBaseSha": "4fbeff681ae2198e04d02a08040530e88a9f48d8",
  "acceptanceScenarios": [
    "Recalled-history position remains dim at the left inset without a trailing dot or joined overflow text.",
    "Hidden lines above appear as a centered `↑ N more` cue in the same border color and placement policy as the lower cue.",
    "Narrow widths keep history visible, shifting a complete overflow cue right when it fits and omitting only the cue when both labels cannot fit.",
    "The pinned `a1 pi` comparison keeps its existing editor overflow rendering."
  ],
  "archiveDigest": "9bc9af0c4d8ec077995b42467da001c9a9c49eceb9897f360f86608f75b3c759",
  "specDigest": "c77c93e01a73e9a15d2ce228a50c79338590e6485fbde7748a94092efe0f00d6",
  "tasksDigest": "c0895c9e920a08a61fdb3b34fb7424d9a7238b0df44823f5fa91869eefb8b0a0",
  "evidenceDigest": "20e2c606fbaec2a333d1e27cfc4b53f278a1031851199cbf48a698663c1a9461",
  "knownGaps": []
}
```
