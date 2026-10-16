# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- In a resident tab, Ctrl+Left and Ctrl+Right move the prompt cursor by one word, matching direct solo-agent mode.
- Shift+Left and Shift+Right extend the prompt selection instead of acting as plain movement.
- Ctrl+Backspace and Ctrl+Delete delete a word, and Shift+Enter inserts a newline without submitting.
- Plain typing, Enter, arrows, and existing tab shortcuts behave as before.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "restore-resident-input-shortcuts",
  "sourcePr": 777,
  "archive": "openspec/changes/archive/2026-10-16-restore-resident-input-shortcuts/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-16-restore-resident-input-shortcuts/acceptance.md",
  "finalizedDate": "2026-10-16",
  "specBaseSha": "633517a1c1afc2519b6011204a07cf42fe8e7800",
  "acceptanceScenarios": [
    "In a resident tab, Ctrl+Left and Ctrl+Right move the prompt cursor by one word, matching direct solo-agent mode.",
    "Shift+Left and Shift+Right extend the prompt selection instead of acting as plain movement.",
    "Ctrl+Backspace and Ctrl+Delete delete a word, and Shift+Enter inserts a newline without submitting.",
    "Plain typing, Enter, arrows, and existing tab shortcuts behave as before."
  ],
  "archiveDigest": "d36aef51fc6c8031ea655ff40105f0763c4d0ed87a77aabfe101d0948de22012",
  "specDigest": "a74ae53ffcd0255ea1c235dcc83c38cf759d895fc910c1d5651a31941c5a88c5",
  "tasksDigest": "54fe8e863aa7ca60bf93dcd1c2f719619686e8cc4dde9dba0a4cd6cb1fe5faa2",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
