# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- One dark-blue visual range spans transcript, transient, blank, prompt, widget, and footer/status rows in either direction while preserving source styling and foreground controls.
- Releasing a nonempty range asynchronously copies its exact visible plain text, retains the highlight, and shows a copied-character acknowledgement.
- Prompt clicks retain editor behavior while prompt drags become frame selection, and controls, overlays, wheel input, links, and right-click paste retain their established ownership.
- Streaming and long-session selection work stays bounded to the visible frame, and later composition cannot mutate a release-time clipboard snapshot.
- Ctrl+C still re-copies and clears retained frame selection, while keyboard prompt copy, semantic /copy, regular mode, and a1 pi behavior remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "select-complete-session-frame",
  "sourcePr": 569,
  "archive": "openspec/changes/archive/2026-09-23-select-complete-session-frame/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-23-select-complete-session-frame/acceptance.md",
  "finalizedDate": "2026-09-23",
  "specBaseSha": "374c94657ab917d49148fe27f2fb1a3f6b2f40f4",
  "acceptanceScenarios": [
    "One dark-blue visual range spans transcript, transient, blank, prompt, widget, and footer/status rows in either direction while preserving source styling and foreground controls.",
    "Releasing a nonempty range asynchronously copies its exact visible plain text, retains the highlight, and shows a copied-character acknowledgement.",
    "Prompt clicks retain editor behavior while prompt drags become frame selection, and controls, overlays, wheel input, links, and right-click paste retain their established ownership.",
    "Streaming and long-session selection work stays bounded to the visible frame, and later composition cannot mutate a release-time clipboard snapshot.",
    "Ctrl+C still re-copies and clears retained frame selection, while keyboard prompt copy, semantic /copy, regular mode, and a1 pi behavior remain unchanged."
  ],
  "archiveDigest": "3664c2a4a753e9a525d91d795b349d56034e6ad88560507dd203fe5c4892bdda",
  "specDigest": "fe7e4af4d224e6fa7500fd7b5b54097f2985b9df9522759fc160d8de4711c0c8",
  "tasksDigest": "b655e9c5b5bd2ffcc98f44c5c9478d1fddfa6c4cefd2acdb35676754b295d905",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
