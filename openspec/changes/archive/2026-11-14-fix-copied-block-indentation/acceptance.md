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
  "specBaseSha": "64a2430263b0a95ae4a0d22d881a3b8424097a26",
  "acceptanceScenarios": [
    "Copied multiline assistant quotes paste without renderer-added continuation offsets or quote borders.",
    "Code indentation, literal border characters, internal blank lines, and selected Unicode text retain their content.",
    "Automatic selection copy and explicit frame copy produce the same corrected block content.",
    "Transcript appearance, ordinary clipboard paste, editor-owned copy and cut, and comparison-profile behavior remain unchanged."
  ],
  "archiveDigest": "59ec105c9e7644d28ed4e8e3add78103d0ef461a0806545cb08d9017a46c1c77",
  "specDigest": "078add93ae5348eeac9bc92e0b8e8c3cf1761067e30aa64092a326ce0c402a33",
  "tasksDigest": "c4a473bf3389420ae9c60c19700ca07b3b9612cf9c538a1db9c8310da369f0d6",
  "evidenceDigest": "b8c27d0c10a09e2f34ec2735d7fccf4f9577013f3b3234f5fad4068cf20b82fe",
  "knownGaps": []
}
```
