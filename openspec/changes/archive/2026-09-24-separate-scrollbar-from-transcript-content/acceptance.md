# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- With `auto` or `always` selected, mixed transcript and tool blocks end in a rectangular content edge before a neutral, uninterrupted scrollbar gutter during scrolling, hover, and auto-hide expiry.
- The final content grapheme remains selectable and copyable in both drag directions, while source background, emphasis, links, and selection never enter the gutter.
- `hidden` restores the final column to transcript content, and editor, footer, modal, wheel, paging, and scrollbar-drag behavior remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "separate-scrollbar-from-transcript-content",
  "sourcePr": 576,
  "archive": "openspec/changes/archive/2026-09-24-separate-scrollbar-from-transcript-content/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-24-separate-scrollbar-from-transcript-content/acceptance.md",
  "finalizedDate": "2026-09-24",
  "specBaseSha": "70b9ebd2329cba5e75176a43abc7d732aaf187cd",
  "acceptanceScenarios": [
    "With `auto` or `always` selected, mixed transcript and tool blocks end in a rectangular content edge before a neutral, uninterrupted scrollbar gutter during scrolling, hover, and auto-hide expiry.",
    "The final content grapheme remains selectable and copyable in both drag directions, while source background, emphasis, links, and selection never enter the gutter.",
    "`hidden` restores the final column to transcript content, and editor, footer, modal, wheel, paging, and scrollbar-drag behavior remain unchanged."
  ],
  "archiveDigest": "2be2761079ad8f1c336a0eb7a6790415a545ccf2db66c02c94d41ab639ee5c0c",
  "specDigest": "20f95d6c82853782fcd6185750b85fe8cccb8b43e7508022962ee850f246ec57",
  "tasksDigest": "a98664f53cc68f1d658bd4cf3235001c8c3bb9ae9d6378c3f424a4e67484d316",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
