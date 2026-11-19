# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Strict validation of the change passes and every migration note names a requirement that exists after the change.
- Docs, package identity, identifier, code-documentation and architecture checks pass on the tree with the archive applied.
- No file outside the change folder is modified by this pull request.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "refresh-ui-specs",
  "sourcePr": 990,
  "archive": "openspec/changes/archive/2026-11-19-refresh-ui-specs/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-19-refresh-ui-specs/acceptance.md",
  "finalizedDate": "2026-11-19",
  "specBaseSha": "2a4504856f4f0cc9fdcbbb9da8556de7cbcedebd",
  "acceptanceScenarios": [
    "Strict validation of the change passes and every migration note names a requirement that exists after the change.",
    "Docs, package identity, identifier, code-documentation and architecture checks pass on the tree with the archive applied.",
    "No file outside the change folder is modified by this pull request."
  ],
  "archiveDigest": "13b1a057c272466f58cfd189e55e9716d0cdb8b804ea71a4b5e758a5a55611ac",
  "specDigest": "5f7bde36c238c36f9241327f93a93a6d39f18d1b960c6a16a3600b31aeb41a88",
  "tasksDigest": "d4d33c134d8daa6c3d532f417863665f5f1a71731914b4aa54a22e34b39370b5",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
