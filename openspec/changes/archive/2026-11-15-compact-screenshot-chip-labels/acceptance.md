# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Screenshot labels appear immediately after the camera icon in the editor, queued input, and submitted prompts.
- Pending, resized, failed, and count-rejected screenshots retain their labels and state-specific rendering without an icon separator.
- Screenshot attachment identities, backing tags, and original-source copy remain intact while editing and wrapping stay atomic.
- Filename-bearing image labels and pinned Pi presentation retain their existing behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "compact-screenshot-chip-labels",
  "sourcePr": 940,
  "archive": "openspec/changes/archive/2026-11-15-compact-screenshot-chip-labels/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-15-compact-screenshot-chip-labels/acceptance.md",
  "finalizedDate": "2026-11-15",
  "specBaseSha": "9893a86e1683942bb2efb04117f0411c8ccb63bd",
  "acceptanceScenarios": [
    "Screenshot labels appear immediately after the camera icon in the editor, queued input, and submitted prompts.",
    "Pending, resized, failed, and count-rejected screenshots retain their labels and state-specific rendering without an icon separator.",
    "Screenshot attachment identities, backing tags, and original-source copy remain intact while editing and wrapping stay atomic.",
    "Filename-bearing image labels and pinned Pi presentation retain their existing behavior."
  ],
  "archiveDigest": "0b5a8b397b9ddac4c76090039c33112d754308413787a7ee7401a9983391c6e3",
  "specDigest": "8a3a2565f2b2d204d2209984494437694ba4ce2261f9a844c973373f1e198a25",
  "tasksDigest": "1113f9991908397559e73d66d40c1eb114571114188f3134b156247bfb17dade",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
