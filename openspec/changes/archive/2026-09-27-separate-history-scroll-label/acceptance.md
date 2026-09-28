# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Recalled-history position remains dim at the left inset without a trailing dot or joined overflow text.
- Moving or placing the cursor within a recalled multiline prompt keeps its history position/total visible.
- Recalled multiline prompts show their full authored content instead of collapsing into a text-paste chip.
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
  "specBaseSha": "4e2d6abb1a45b9c2b2d6eaf42bf6b1463b05e7f9",
  "acceptanceScenarios": [
    "Recalled-history position remains dim at the left inset without a trailing dot or joined overflow text.",
    "Moving or placing the cursor within a recalled multiline prompt keeps its history position/total visible.",
    "Recalled multiline prompts show their full authored content instead of collapsing into a text-paste chip.",
    "Hidden lines above appear as a centered `↑ N more` cue in the same border color and placement policy as the lower cue.",
    "Narrow widths keep history visible, shifting a complete overflow cue right when it fits and omitting only the cue when both labels cannot fit.",
    "The pinned `a1 pi` comparison keeps its existing editor overflow rendering."
  ],
  "archiveDigest": "c0e0ed20fd06f23e184077ac6053d5ab505e49daf07ddfd925023944cca85ea6",
  "specDigest": "b00aca8db173b12fa122f05badbe96ddf061da30473f71bf1c5523f6efd63c43",
  "tasksDigest": "5106917041e261e39546f80cc3cec6c1048e01d1e328bb5eddad0824879aa7b3",
  "evidenceDigest": "aa09b264f58fc89ee7fa70bed1af053fa3be2e637e1a367da403b91b934f90f0",
  "knownGaps": []
}
```
