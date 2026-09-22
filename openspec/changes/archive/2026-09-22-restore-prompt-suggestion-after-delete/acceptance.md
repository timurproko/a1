# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A delivered prompt suggestion stays hidden while a draft owns the editor and returns immediately when the complete draft is deleted.
- Deleting a draft closes its visible or pending autocomplete before the restored suggestion reclaims presentation and Tab.
- Restoring the suggestion reuses the original candidate without another model request or duplicate displayed diagnostic.
- Backspace, whole-draft deletion, and the clear shortcut restore suggestions through coordinated input in standard and persistent-history editors.
- Submitting a draft or crossing another suggestion lifecycle boundary still retires the old suggestion instead of restoring it.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "restore-prompt-suggestion-after-delete",
  "sourcePr": 550,
  "archive": "openspec/changes/archive/2026-09-22-restore-prompt-suggestion-after-delete/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-22-restore-prompt-suggestion-after-delete/acceptance.md",
  "finalizedDate": "2026-09-22",
  "specBaseSha": "9fa1e231a33ab9aad337850d843739cfcedc88b4",
  "acceptanceScenarios": [
    "A delivered prompt suggestion stays hidden while a draft owns the editor and returns immediately when the complete draft is deleted.",
    "Deleting a draft closes its visible or pending autocomplete before the restored suggestion reclaims presentation and Tab.",
    "Restoring the suggestion reuses the original candidate without another model request or duplicate displayed diagnostic.",
    "Backspace, whole-draft deletion, and the clear shortcut restore suggestions through coordinated input in standard and persistent-history editors.",
    "Submitting a draft or crossing another suggestion lifecycle boundary still retires the old suggestion instead of restoring it."
  ],
  "archiveDigest": "07967bad80f5c6727e394f22bcc94f9a6e4a93e1b66b8ea60a63e563b563b37d",
  "specDigest": "941fd64d2ac91b52eac02486fcf940569c6c02e42430a1ba4906258dd88fc333",
  "tasksDigest": "58c4c13e09099a23a40b73182771753ebe3e4fa0d9bcbad67819c5f3f6db11cd",
  "evidenceDigest": "5447ed27efa42ec1f0fb0aaf5c4d4f424a715f2f9878df3c228fc9cf37935512",
  "knownGaps": []
}
```
