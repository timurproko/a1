# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Scrolling, the scrollbar rail and its drag, the sticky prompt header, the jump-to-bottom control, and the tail notice's close control behave as before.
- Transcript and editor selection, copy-on-select, link hover cleanup, and right-click paste behave as before, and a drag that starts on the rail stays on the rail until release.
- Transcript frames render the same rows, frame descriptors, damage rows, and cache reuse as before.
- A bracketed paste that arrives in pieces is inserted once, with typed text before and after it kept in order; with paste disabled, the typed text still arrives and the pasted text is dropped; an oversized paste is still rejected.
- Word-left in the prompt still steps over chips as one word and stops on path boundaries.
- The default-model selector and the two-step thinking-level dialog search, navigate, select, go back, save, and report a refused save as before.
- `handlePreInput`, `TranscriptViewport.compose`, and `PromptSelectionInterceptor.handleInput` leave the long-function ratchet.
- `SessionViewportController` drops to 33 methods and 22 fields, `TranscriptViewport` to 29 fields, and `SettingsApp` to 29 methods; the startup graph grows from 194 to 197 files and by about 10 KB.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "input-drawing-split",
  "sourcePr": 887,
  "archive": "openspec/changes/archive/2026-11-08-input-drawing-split/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-08-input-drawing-split/acceptance.md",
  "finalizedDate": "2026-11-08",
  "specBaseSha": "94d7f041ad07949f9ed197276cad4aab1915db51",
  "acceptanceScenarios": [
    "Scrolling, the scrollbar rail and its drag, the sticky prompt header, the jump-to-bottom control, and the tail notice's close control behave as before.",
    "Transcript and editor selection, copy-on-select, link hover cleanup, and right-click paste behave as before, and a drag that starts on the rail stays on the rail until release.",
    "Transcript frames render the same rows, frame descriptors, damage rows, and cache reuse as before.",
    "A bracketed paste that arrives in pieces is inserted once, with typed text before and after it kept in order; with paste disabled, the typed text still arrives and the pasted text is dropped; an oversized paste is still rejected.",
    "Word-left in the prompt still steps over chips as one word and stops on path boundaries.",
    "The default-model selector and the two-step thinking-level dialog search, navigate, select, go back, save, and report a refused save as before.",
    "`handlePreInput`, `TranscriptViewport.compose`, and `PromptSelectionInterceptor.handleInput` leave the long-function ratchet.",
    "`SessionViewportController` drops to 33 methods and 22 fields, `TranscriptViewport` to 29 fields, and `SettingsApp` to 29 methods; the startup graph grows from 194 to 197 files and by about 10 KB."
  ],
  "archiveDigest": "ce4429c14e8af0d2b57aa3ca23933a7913962239f29f299303a1feed00759fdb",
  "specDigest": "dd1292a22f05b79622ffab535ceab23f89608b0342aea712408cb1f2a53b6958",
  "tasksDigest": "10c8d0fad9a9d90015a59c4d30e78e5099b0b35805b012fa92583b6fce828d46",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
