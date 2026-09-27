# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Observable compactions resume at 0% and advance after delivery suspension without falling back to a plain label.
- Repeated resume keeps one event listener and one stream wrapper, and disposal restores the configured stream function.
- Failed manual compaction shows Pi's actionable error while successful completion remains silent.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "restore-compaction-progress",
  "sourcePr": 595,
  "archive": "openspec/changes/archive/2026-09-27-restore-compaction-progress/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-27-restore-compaction-progress/acceptance.md",
  "finalizedDate": "2026-09-27",
  "specBaseSha": "92e3ed375ce7d16e52dbb8b0a9d64ac829701bff",
  "acceptanceScenarios": [
    "Observable compactions resume at 0% and advance after delivery suspension without falling back to a plain label.",
    "Repeated resume keeps one event listener and one stream wrapper, and disposal restores the configured stream function.",
    "Failed manual compaction shows Pi's actionable error while successful completion remains silent."
  ],
  "archiveDigest": "8c64c3af6bc291554b18d55b902967d04c4d444764a9d735bf7788baec717bf0",
  "specDigest": "b14bb142765c8f3ff29ab0a67a4867ad0fc90e940cec8f6b50c9806160f10ebe",
  "tasksDigest": "7e994252a18d2b653c6f8b40814bdd574c43c5008ee11d9a02a7cac7bf6808e4",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
