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
  "specBaseSha": "98b88f36b68d2ec70e2a3bd572cc49970d55dfbd",
  "acceptanceScenarios": [
    "Clicking transcript or viewport content leaves the ordinary prompt ready for clipboard and editing shortcuts without another prompt click.",
    "Paste, cut, undo, redo, and prompt navigation retain the existing draft, caret, selection, and history semantics.",
    "Transcript copy and viewport-owned actions keep precedence and do not also edit the prompt.",
    "Focused overlays and replacement inputs keep their local shortcuts without leaking input to the ordinary prompt."
  ],
  "archiveDigest": "ab369225daf6acfde7f4fbfa19c1009b07b351b92738515d15211a5471c400f0",
  "specDigest": "3f1a9f01f542a3c61104a99f90bde5a2b30a05292ac64b18ed4fb27b3c2162f6",
  "tasksDigest": "f843780a82286210d1d553a254a7f80abfc432107b6fc1d58deca22d5fe62127",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
