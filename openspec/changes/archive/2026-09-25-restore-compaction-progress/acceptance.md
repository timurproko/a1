# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Observable compactions resume at 0% and advance after delivery suspension without falling back to a plain label.
- Repeated resume keeps one event listener and one stream wrapper, and disposal restores the configured stream function.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "restore-compaction-progress",
  "sourcePr": 595,
  "archive": "openspec/changes/archive/2026-09-25-restore-compaction-progress/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-25-restore-compaction-progress/acceptance.md",
  "finalizedDate": "2026-09-25",
  "specBaseSha": "92e3ed375ce7d16e52dbb8b0a9d64ac829701bff",
  "acceptanceScenarios": [
    "Observable compactions resume at 0% and advance after delivery suspension without falling back to a plain label.",
    "Repeated resume keeps one event listener and one stream wrapper, and disposal restores the configured stream function."
  ],
  "archiveDigest": "ee481d9d4a34204afc80b50f4a1d5e36d7591e2bc623bcc77aa7afe9d46667d4",
  "specDigest": "dc0b3294533c4bbe4d53e6e9a9e676813d85325848c3e15d511aba4e72ee09b5",
  "tasksDigest": "6310e77132bfbb9eb9f10c37400a18f1dcfa77cb319db0612da4c12080a8babe",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
