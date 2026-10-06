# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- An unaccepted suggestion stays hidden while a typed draft remains and returns after the final Backspace removes it.
- Restoration reuses the same suggestion without another model request or duplicate diagnostic outcome.
- Tab accepts the restored suggestion without submitting it.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "restore-suggestion-after-backspace",
  "sourcePr": 691,
  "archive": "openspec/changes/archive/2026-10-06-restore-suggestion-after-backspace/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-06-restore-suggestion-after-backspace/acceptance.md",
  "finalizedDate": "2026-10-06",
  "specBaseSha": "99e849aca28c25b645cb50008d3427f4fdb2a050",
  "acceptanceScenarios": [
    "An unaccepted suggestion stays hidden while a typed draft remains and returns after the final Backspace removes it.",
    "Restoration reuses the same suggestion without another model request or duplicate diagnostic outcome.",
    "Tab accepts the restored suggestion without submitting it."
  ],
  "archiveDigest": "eaee6b6bbd512311ec1f722eefda52e7697439da711364576d278fa572443f53",
  "specDigest": "d483f4e1857ff216b1a6fe32db9556e1885519bba298f922411cca5ea09ceb3c",
  "tasksDigest": "8d44d73194ce81ec9d5e2b385eb010d5eb6a19e41563c37e8d4bea29a88ae3c8",
  "evidenceDigest": "536c28546a49febd39bbea69eca4d2b48f79f8e2cac3c91338133310a352d341",
  "knownGaps": []
}
```
