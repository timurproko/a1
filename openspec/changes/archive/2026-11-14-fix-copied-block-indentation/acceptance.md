# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Copied multiline assistant quotes paste without renderer-added continuation offsets or quote borders.
- Code indentation, literal border characters, internal blank lines, and selected Unicode text retain their content.
- Automatic selection copy and explicit frame copy produce the same corrected block content.
- Transcript appearance, ordinary clipboard paste, editor-owned copy and cut, and comparison-profile behavior remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-copied-block-indentation",
  "sourcePr": 929,
  "archive": "openspec/changes/archive/2026-11-14-fix-copied-block-indentation/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-14-fix-copied-block-indentation/acceptance.md",
  "finalizedDate": "2026-11-14",
  "specBaseSha": "2d5c3646784941978b9847b606705e3602c3f888",
  "acceptanceScenarios": [
    "Copied multiline assistant quotes paste without renderer-added continuation offsets or quote borders.",
    "Code indentation, literal border characters, internal blank lines, and selected Unicode text retain their content.",
    "Automatic selection copy and explicit frame copy produce the same corrected block content.",
    "Transcript appearance, ordinary clipboard paste, editor-owned copy and cut, and comparison-profile behavior remain unchanged."
  ],
  "archiveDigest": "4f8b56a77f6b9c101040e7cbf28211407cab7b2fb78f55c2d90fda0d036c1f20",
  "specDigest": "078add93ae5348eeac9bc92e0b8e8c3cf1761067e30aa64092a326ce0c402a33",
  "tasksDigest": "c4a473bf3389420ae9c60c19700ca07b3b9612cf9c538a1db9c8310da369f0d6",
  "evidenceDigest": "c08318888bbf841066bb8868e1b8a6f0dc467edc4da13989a89ce42227689d06",
  "knownGaps": []
}
```
