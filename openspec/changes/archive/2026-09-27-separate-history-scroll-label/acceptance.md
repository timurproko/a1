# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Recalled-history position remains dim at the left inset without a trailing dot or joined overflow text.
- Hidden lines above appear as a centered `↑ N more` cue in the same border color and placement policy as the lower cue.
- Narrow collision widths retain a complete overflow cue and restore the history position when enough width returns.
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
    "Narrow collision widths retain a complete overflow cue and restore the history position when enough width returns.",
    "The pinned `a1 pi` comparison keeps its existing editor overflow rendering."
  ],
  "archiveDigest": "157bbe6a5675930d6fb740e1e880e267cff16aae7b9f2bdfb76099ccf2fe2d55",
  "specDigest": "a382816af24ff87657b75b567fcd9ca9707bd7ab79052ad3b8f149c596a8201d",
  "tasksDigest": "6bee1e6b1b57b563d6639cedd192506d9c5996ff329e711563010d76e988b7ac",
  "evidenceDigest": "0b7b8f652b16b68017393be5ec42a64b1234a0b321b277cae635958d3f9dcbe6",
  "knownGaps": []
}
```
