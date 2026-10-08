# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Autocomplete selection markers use the working indicator's one-cell gutter while prompt text retains its two-cell prefix.
- Autocomplete and history counters use the shared three-cell inset with full-width, narrow, and overflow border behavior preserved.
- Completion content, styling, navigation, pagination, prompt stability, and comparison-profile presentation remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "align-input-menu-and-counters",
  "sourcePr": 726,
  "archive": "openspec/changes/archive/2026-10-08-align-input-menu-and-counters/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-08-align-input-menu-and-counters/acceptance.md",
  "finalizedDate": "2026-10-08",
  "specBaseSha": "3b2c0f1dc8c8878f1f3c9e31b0e4387ec5d412c2",
  "acceptanceScenarios": [
    "Autocomplete selection markers use the working indicator's one-cell gutter while prompt text retains its two-cell prefix.",
    "Autocomplete and history counters use the shared three-cell inset with full-width, narrow, and overflow border behavior preserved.",
    "Completion content, styling, navigation, pagination, prompt stability, and comparison-profile presentation remain unchanged."
  ],
  "archiveDigest": "951d03f3d01f7da81bab4fbdfb49ba5177f710aace6d59fe4455000a4d416b07",
  "specDigest": "f9671586a11d0aa109542f6ec65246751f6a9496d4807b414a0cd460dcd9d472",
  "tasksDigest": "9007047072991ec9d340582981686101c98281def67e77f6bbcf4b1a698c7801",
  "evidenceDigest": "9e0e83c7c1b261d57c5517900eb4e157aca82a9e8985b158f626042573307848",
  "knownGaps": []
}
```
