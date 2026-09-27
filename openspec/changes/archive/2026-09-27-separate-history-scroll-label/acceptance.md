# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Recalled-history position remains dim at the left inset without a trailing dot or joined overflow text.
- Moving or placing the cursor within a recalled multiline prompt keeps its history position/total visible.
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
    "Moving or placing the cursor within a recalled multiline prompt keeps its history position/total visible.",
    "Hidden lines above appear as a centered `↑ N more` cue in the same border color and placement policy as the lower cue.",
    "Narrow widths keep history visible, shifting a complete overflow cue right when it fits and omitting only the cue when both labels cannot fit.",
    "The pinned `a1 pi` comparison keeps its existing editor overflow rendering."
  ],
  "archiveDigest": "de2f3e7d77a0ccc8aab7e5ba185a992bee7c30548366dac1e978951142549243",
  "specDigest": "197e249fbf9eb57dbdc09ac44b3c6622b9d46c92a77721c4ad1deb514045cf63",
  "tasksDigest": "c0895c9e920a08a61fdb3b34fb7424d9a7238b0df44823f5fa91869eefb8b0a0",
  "evidenceDigest": "7a783a6b164150e392e1e6eff64fb5781321d39756219826f72acd9e51381ec3",
  "knownGaps": []
}
```
