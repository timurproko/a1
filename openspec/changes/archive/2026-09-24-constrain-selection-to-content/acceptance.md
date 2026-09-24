# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Upward and downward edge-scrolled transcript selections remain inside the content rectangle while pinned editor and footer rows keep their ordinary presentation.
- Document-only visible-frame copy excludes dock text even after either source endpoint moves off screen.
- Explicit pointer motion across the transcript/dock boundary still paints and copies visible dock text in both drag directions.
- Dock reflow and scrollbar-edge presentation preserve the bounded selection without stale paint or changed rail semantics.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "constrain-selection-to-content",
  "sourcePr": 587,
  "archive": "openspec/changes/archive/2026-09-24-constrain-selection-to-content/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-24-constrain-selection-to-content/acceptance.md",
  "finalizedDate": "2026-09-24",
  "specBaseSha": "ace560033b5bd0dda5218e9a6b6842a510103383",
  "acceptanceScenarios": [
    "Upward and downward edge-scrolled transcript selections remain inside the content rectangle while pinned editor and footer rows keep their ordinary presentation.",
    "Document-only visible-frame copy excludes dock text even after either source endpoint moves off screen.",
    "Explicit pointer motion across the transcript/dock boundary still paints and copies visible dock text in both drag directions.",
    "Dock reflow and scrollbar-edge presentation preserve the bounded selection without stale paint or changed rail semantics."
  ],
  "archiveDigest": "cb16094f05b78f40a0b64cc7847452350370a7f2a801b2c80202a032983efe60",
  "specDigest": "3a2733343785c693cad2fc76ca476ef0bcd5e6cb26b6041174b4160b10bd7fd7",
  "tasksDigest": "b9f3a61f90a193388258723f72127142bffbef709679f358d2bb69d693bd72bd",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
