# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- In `auto` and `always` modes, idle, track, and thumb cells continue each message or tool row's background without a contrasting gutter stripe.
- Source glyphs, links, emphasis, selection, and copied text still end before the reserved gutter, including wide and combining right-edge graphemes.
- `hidden` still returns the final column to content, while scrollbar gestures, wrapping, dock layout, and modal geometry remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "restore-scrollbar-background-continuity",
  "sourcePr": 582,
  "archive": "openspec/changes/archive/2026-09-24-restore-scrollbar-background-continuity/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-24-restore-scrollbar-background-continuity/acceptance.md",
  "finalizedDate": "2026-09-24",
  "specBaseSha": "ac123a6604960e8ecbed86a544d2e3d17086d65c",
  "acceptanceScenarios": [
    "In `auto` and `always` modes, idle, track, and thumb cells continue each message or tool row's background without a contrasting gutter stripe.",
    "Source glyphs, links, emphasis, selection, and copied text still end before the reserved gutter, including wide and combining right-edge graphemes.",
    "`hidden` still returns the final column to content, while scrollbar gestures, wrapping, dock layout, and modal geometry remain unchanged."
  ],
  "archiveDigest": "13df9333a3bf652b85faec66fd7d543a6129e6cf5b790101a4c54a3bf55a1724",
  "specDigest": "81f087796b6eec816b777898f3a863b405662e68f2e293200fe34a87844bc444",
  "tasksDigest": "df42c0e921dec4d2425c56db9680deaeddc7b3e9b4c8301669c7e5d55b44c57b",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
