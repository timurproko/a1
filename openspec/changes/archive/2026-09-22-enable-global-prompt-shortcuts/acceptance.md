# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Clicking transcript or viewport content leaves the ordinary prompt ready for clipboard and editing shortcuts without another prompt click.
- Paste, cut, undo, redo, and prompt navigation retain the existing draft, caret, selection, and history semantics.
- Transcript copy and viewport-owned actions keep precedence and do not also edit the prompt.
- Focused overlays and replacement inputs keep their local shortcuts without leaking input to the ordinary prompt.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "enable-global-prompt-shortcuts",
  "sourcePr": 542,
  "archive": "openspec/changes/archive/2026-09-22-enable-global-prompt-shortcuts/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-22-enable-global-prompt-shortcuts/acceptance.md",
  "finalizedDate": "2026-09-22",
  "specBaseSha": "b26ad5dbcec4d83ea1c881a83edf045cb4ce31ad",
  "acceptanceScenarios": [
    "Clicking transcript or viewport content leaves the ordinary prompt ready for clipboard and editing shortcuts without another prompt click.",
    "Paste, cut, undo, redo, and prompt navigation retain the existing draft, caret, selection, and history semantics.",
    "Transcript copy and viewport-owned actions keep precedence and do not also edit the prompt.",
    "Focused overlays and replacement inputs keep their local shortcuts without leaking input to the ordinary prompt."
  ],
  "archiveDigest": "57192ad7a4d1c7b296bcc9724ffc8b107d745c532fb7e3ce3540bf0da73d0ff6",
  "specDigest": "3f1a9f01f542a3c61104a99f90bde5a2b30a05292ac64b18ed4fb27b3c2162f6",
  "tasksDigest": "f843780a82286210d1d553a254a7f80abfc432107b6fc1d58deca22d5fe62127",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
