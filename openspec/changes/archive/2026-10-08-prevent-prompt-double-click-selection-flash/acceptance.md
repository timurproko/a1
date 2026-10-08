# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Held prompt multi-clicks never paint selection through unused input-row cells.
- No-drag prompt clicks retain exact editor caret, word, and logical-line selection behavior.
- Distinct prompt motion promotes from the original press cell into complete-frame selection.
- Transcript selection, controls, modal ownership, and comparison-profile behavior remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "prevent-prompt-double-click-selection-flash",
  "sourcePr": 719,
  "archive": "openspec/changes/archive/2026-10-08-prevent-prompt-double-click-selection-flash/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-08-prevent-prompt-double-click-selection-flash/acceptance.md",
  "finalizedDate": "2026-10-08",
  "specBaseSha": "9b111cb55360e6ffa84e1e6534c3365c95be46cb",
  "acceptanceScenarios": [
    "Held prompt multi-clicks never paint selection through unused input-row cells.",
    "No-drag prompt clicks retain exact editor caret, word, and logical-line selection behavior.",
    "Distinct prompt motion promotes from the original press cell into complete-frame selection.",
    "Transcript selection, controls, modal ownership, and comparison-profile behavior remain unchanged."
  ],
  "archiveDigest": "cb1bf554cd8d26da94c09526eb441d3a74bd5608bf76b08d7b413b723c75e1fc",
  "specDigest": "910a9d3bba0df13f8afa4b418d933b71b601c928d3a892d93257f1b1c677550a",
  "tasksDigest": "b42045af26f580f04a1d1e815a751068dfadf8d4c5805d00d529f19f8ebd2732",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
