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
  "archiveDigest": "654ace056b64695e57cbc67c8f32cad3b8f09df9e94e092d2849f1010a7b94c8",
  "specDigest": "b14bb142765c8f3ff29ab0a67a4867ad0fc90e940cec8f6b50c9806160f10ebe",
  "tasksDigest": "dd90ffad9b6f43cffee545ba9bc49da36e0904192de6f92270b3d4f9281b6545",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
