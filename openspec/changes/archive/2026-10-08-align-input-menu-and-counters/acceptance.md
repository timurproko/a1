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
  "archiveDigest": "182db554a86ecec0a2543816d0038a7f675b68abf54c92b88ca4b45ab733bf20",
  "specDigest": "f9671586a11d0aa109542f6ec65246751f6a9496d4807b414a0cd460dcd9d472",
  "tasksDigest": "9007047072991ec9d340582981686101c98281def67e77f6bbcf4b1a698c7801",
  "evidenceDigest": "2bbb4ae397bdb8b10d029168e7f6e56033f22c34a30c2b661320b714a38a4251",
  "knownGaps": []
}
```
