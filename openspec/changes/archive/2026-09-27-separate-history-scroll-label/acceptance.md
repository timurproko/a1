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
  "archiveDigest": "3a81d6e2e9123f297517cec32d2654c3cfcd681a922588be6d889f92546e4213",
  "specDigest": "b00aca8db173b12fa122f05badbe96ddf061da30473f71bf1c5523f6efd63c43",
  "tasksDigest": "5106917041e261e39546f80cc3cec6c1048e01d1e328bb5eddad0824879aa7b3",
  "evidenceDigest": "cea10c80668d5fe7ed8bacb613f0cef720ae305046d4e1c808d0b75ea41e19b3",
  "knownGaps": []
}
```
