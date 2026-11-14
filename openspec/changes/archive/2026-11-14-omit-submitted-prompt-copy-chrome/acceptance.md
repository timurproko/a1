# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Mixed prompt-and-reply selections omit submitted-prompt markers and padding while retaining the selected prompt text.
- Multiple prompts and wrapped continuation rows retain semantic alignment across forward, reverse, partial, and off-screen selections.
- Genuine indentation, literal marker characters, Unicode text, and internal blank lines remain unchanged.
- Automatic and explicit frame copy preserve assistant quote alignment and paste the same semantic text back into the editor.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "omit-submitted-prompt-copy-chrome",
  "sourcePr": 935,
  "archive": "openspec/changes/archive/2026-11-14-omit-submitted-prompt-copy-chrome/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-14-omit-submitted-prompt-copy-chrome/acceptance.md",
  "finalizedDate": "2026-11-14",
  "specBaseSha": "e7de9aba3b3adc5b13b5dc76391bdfea7b9388d3",
  "acceptanceScenarios": [
    "Mixed prompt-and-reply selections omit submitted-prompt markers and padding while retaining the selected prompt text.",
    "Multiple prompts and wrapped continuation rows retain semantic alignment across forward, reverse, partial, and off-screen selections.",
    "Genuine indentation, literal marker characters, Unicode text, and internal blank lines remain unchanged.",
    "Automatic and explicit frame copy preserve assistant quote alignment and paste the same semantic text back into the editor."
  ],
  "archiveDigest": "19689894dedb70f08b123b939ee87bf7876f50e2164b28b6a01417d948c95d96",
  "specDigest": "1a64a3bc457685f02f9f8c2b67bfc0dbb6fe0d825ed5ec5bfe88aefc687181b9",
  "tasksDigest": "b1f8d4156a853b49beb7e611a4f47df12c601539cc38396eb1382e35a3ea53f1",
  "evidenceDigest": "181e5c55f8173fe71d45e05f903dcc3f5077c5eb49f4a83a3257a4ce359259e3",
  "knownGaps": []
}
```
