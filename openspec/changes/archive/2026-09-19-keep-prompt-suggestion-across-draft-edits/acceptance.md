# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- With a suggestion shown in the empty editor, typing one character hides the ghost text and Tab and Enter act on the draft; deleting that character repaints the same suggestion without a second suggestion request, and Tab then accepts it.
- With a suggestion shown, typing a draft and pressing Ctrl+C once empties the editor and repaints the suggestion; pressing Enter on a typed prompt submits only that text and the suggestion does not return afterwards.
- Typing while a suggestion request is still generating records one `cancelled` outcome and its late result never appears.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "keep-prompt-suggestion-across-draft-edits",
  "sourcePr": 498,
  "archive": "openspec/changes/archive/2026-09-19-keep-prompt-suggestion-across-draft-edits/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-19-keep-prompt-suggestion-across-draft-edits/acceptance.md",
  "finalizedDate": "2026-09-19",
  "specBaseSha": "9b6ff9ff892b6609a139eeb301cb44e1ac5ce328",
  "acceptanceScenarios": [
    "With a suggestion shown in the empty editor, typing one character hides the ghost text and Tab and Enter act on the draft; deleting that character repaints the same suggestion without a second suggestion request, and Tab then accepts it.",
    "With a suggestion shown, typing a draft and pressing Ctrl+C once empties the editor and repaints the suggestion; pressing Enter on a typed prompt submits only that text and the suggestion does not return afterwards.",
    "Typing while a suggestion request is still generating records one `cancelled` outcome and its late result never appears."
  ],
  "archiveDigest": "7d865bcf2ffc0ce2906c5824fc6e874afb1dac8abbf56e6436d41d33d70888d9",
  "specDigest": "af184cfb4b7356a18b9662e688f5640ee672448a7aeb101fd24c0b684ae943b1",
  "tasksDigest": "ae0985ac0ae70a9106a3d3d257c45cb200e83d04d3a2d964d483c12298b6a926",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
