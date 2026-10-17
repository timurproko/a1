# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Prompt and footer/status pointer selections copy automatically on release when Copy on select is enabled and retain their visible highlight.
- With Copy on select disabled, prompt and footer/status selections do not write on release and copy through Ctrl+C.
- Autocomplete, prompt chrome, transient rows, widgets, replacement inputs, comparison mode, and regular terminal selection retain their established behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "copy-input-and-status-on-selection",
  "sourcePr": 793,
  "archive": "openspec/changes/archive/2026-10-17-copy-input-and-status-on-selection/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-17-copy-input-and-status-on-selection/acceptance.md",
  "finalizedDate": "2026-10-17",
  "specBaseSha": "ee097cfd95775697ffe0955e565d0a95cc4fe24b",
  "acceptanceScenarios": [
    "Prompt and footer/status pointer selections copy automatically on release when Copy on select is enabled and retain their visible highlight.",
    "With Copy on select disabled, prompt and footer/status selections do not write on release and copy through Ctrl+C.",
    "Autocomplete, prompt chrome, transient rows, widgets, replacement inputs, comparison mode, and regular terminal selection retain their established behavior."
  ],
  "archiveDigest": "d77325f61509b51036fe70bd5238bc07642f9d7849622f4e7a5267f55dacec0a",
  "specDigest": "640216b3b4f62cfa32a1037af20c00ac8559fdaa7b63df31a1423cc3eec431da",
  "tasksDigest": "86b72aec291a9b5da4e3399e0ef5f6bc24f20d3840ca6fca627c558fee2da068",
  "evidenceDigest": "3c292d1f1945bc1ff2526b1c6931fa77d1047026b576f20c6614b56f393d80cb",
  "knownGaps": []
}
```
