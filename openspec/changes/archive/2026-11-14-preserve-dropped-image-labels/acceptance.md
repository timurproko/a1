# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A single dropped supported image file shows a filename-bearing image-file chip and submits its prepared image bytes exactly once.
- Clipboard image bytes retain screenshot labels, and supplied image files never trigger native clipboard acquisition.
- Same-name file images remain distinct, with atomic editing, undo and redo, limits, cancellation, and durable history preserved.
- Ordinary text, URLs, non-image files, folders, and multiple or mixed path lists retain their existing behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "preserve-dropped-image-labels",
  "sourcePr": 930,
  "archive": "openspec/changes/archive/2026-11-14-preserve-dropped-image-labels/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-14-preserve-dropped-image-labels/acceptance.md",
  "finalizedDate": "2026-11-14",
  "specBaseSha": "2d5c3646784941978b9847b606705e3602c3f888",
  "acceptanceScenarios": [
    "A single dropped supported image file shows a filename-bearing image-file chip and submits its prepared image bytes exactly once.",
    "Clipboard image bytes retain screenshot labels, and supplied image files never trigger native clipboard acquisition.",
    "Same-name file images remain distinct, with atomic editing, undo and redo, limits, cancellation, and durable history preserved.",
    "Ordinary text, URLs, non-image files, folders, and multiple or mixed path lists retain their existing behavior."
  ],
  "archiveDigest": "23f74d0b181485cdaabc7a486cb1ccdef477c79ea6a4cc67ac891334f5391bdf",
  "specDigest": "8477a98376a58dcc6a91d5cfe8edb7760d424767aeaf7bd58cd5908ad4c65b1d",
  "tasksDigest": "4a6c6ce76a53ed423ff0136f42b1734a6d6fdb35e3e702c3789d560b2b96e224",
  "evidenceDigest": "b279a20b3ed2f00f767056dd607742208ea600f382e15ebc39a4e4e0e87ffb39",
  "knownGaps": []
}
```
