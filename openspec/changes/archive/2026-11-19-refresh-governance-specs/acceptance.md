# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- The change passes strict OpenSpec validation with versions 1.8.0 and 1.11.0.
- Archiving the change applies 11 added, 19 modified and 19 removed requirements without error.
- Docs governance, package identity, naming, code documentation and architecture checks pass on the archived tree.
- No file outside the change folder is modified by this pull request.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "refresh-governance-specs",
  "sourcePr": 988,
  "archive": "openspec/changes/archive/2026-11-19-refresh-governance-specs/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-19-refresh-governance-specs/acceptance.md",
  "finalizedDate": "2026-11-19",
  "specBaseSha": "510513ab0103ef9dd0ee468b8c9817bfbceac5ee",
  "acceptanceScenarios": [
    "The change passes strict OpenSpec validation with versions 1.8.0 and 1.11.0.",
    "Archiving the change applies 11 added, 19 modified and 19 removed requirements without error.",
    "Docs governance, package identity, naming, code documentation and architecture checks pass on the archived tree.",
    "No file outside the change folder is modified by this pull request."
  ],
  "archiveDigest": "fe2be8a848df213c4b28e239dc5c44f3bd27ed556f4443fb51a8d325cfcc0ec9",
  "specDigest": "885d44adf1e682b5658c8668e0dc17dd73c6d76225d9be9d8532944c303c05e1",
  "tasksDigest": "141c86b8bd9d755d8f6e129e29e0d2a375ce7769f679449754047c0aa1fa6aa7",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
