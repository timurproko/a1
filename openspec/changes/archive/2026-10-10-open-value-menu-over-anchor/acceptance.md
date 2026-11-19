# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Opening a Settings value menu lays the value in effect over its source row instead of repeating it below.
- Near the top or bottom of the list, the menu shifts just far enough to stay inside the body.
- Clicking a value highlights the value in effect immediately, without needing pointer motion.
- Pointer motion onto another entry highlights it, and leaving the menu clears the highlight.
- Keyboard opening, arrow navigation, Escape cancellation, Enter confirmation, and press-outside dismissal behave as before.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "open-value-menu-over-anchor",
  "sourcePr": 742,
  "archive": "openspec/changes/archive/2026-10-10-open-value-menu-over-anchor/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-10-open-value-menu-over-anchor/acceptance.md",
  "finalizedDate": "2026-10-10",
  "specBaseSha": "0a9c1af9e3d834ff33a4e40ce3dbaed634b85a5a",
  "acceptanceScenarios": [
    "Opening a Settings value menu lays the value in effect over its source row instead of repeating it below.",
    "Near the top or bottom of the list, the menu shifts just far enough to stay inside the body.",
    "Clicking a value highlights the value in effect immediately, without needing pointer motion.",
    "Pointer motion onto another entry highlights it, and leaving the menu clears the highlight.",
    "Keyboard opening, arrow navigation, Escape cancellation, Enter confirmation, and press-outside dismissal behave as before."
  ],
  "archiveDigest": "d38f244404b885cb3191c5b350512554fdfd5798aabdfb7356eccb511bb5b1d4",
  "specDigest": "5d8083cfede431eb23a0e362a951a8ad6efc51c3d506d9030862f4db2e4262c8",
  "tasksDigest": "8c575da5761b599a13bcbf10887b8543665e92fdddd135c441f0faf01b27861a",
  "evidenceDigest": "1cfe18de9c442acc9e40885798fc3c7b0c62fde6cf298efead8189cadb55dede",
  "knownGaps": []
}
```
