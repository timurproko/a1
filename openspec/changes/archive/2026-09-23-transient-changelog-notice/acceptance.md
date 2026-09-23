# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Expanded startup changelogs show only `Run /changelog to view the full release notes.` in the transient dock and open no screen.
- Collapsed startup changelogs use the same one-line transient dock notice without adding transcript content.
- Assistant and tool output cannot move the notice into the transcript; newer notices replace it and the next user prompt dismisses it.
- `/changelog` still opens the complete reference screen without feed output, while acknowledgement bookkeeping and the pinned comparison presentation remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "transient-changelog-notice",
  "sourcePr": 562,
  "archive": "openspec/changes/archive/2026-09-23-transient-changelog-notice/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-23-transient-changelog-notice/acceptance.md",
  "finalizedDate": "2026-09-23",
  "specBaseSha": "dd3680cc46b4e97044987765f051d4677ef6157d",
  "acceptanceScenarios": [
    "Expanded startup changelogs show only `Run /changelog to view the full release notes.` in the transient dock and open no screen.",
    "Collapsed startup changelogs use the same one-line transient dock notice without adding transcript content.",
    "Assistant and tool output cannot move the notice into the transcript; newer notices replace it and the next user prompt dismisses it.",
    "`/changelog` still opens the complete reference screen without feed output, while acknowledgement bookkeeping and the pinned comparison presentation remain unchanged."
  ],
  "archiveDigest": "2d32dc5b033c4024101972c93ca2182ab5dbda839a79d3727565fb0d708a8b4b",
  "specDigest": "e5b1e8e7e12014c63c3c49af0b20b86b9d529ad60b892d2076246a0bd64a7bc0",
  "tasksDigest": "d4b0c894dfbb64e9e9efee20e2a8c9eee83695f6d242cd4363a0afebc258112b",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
