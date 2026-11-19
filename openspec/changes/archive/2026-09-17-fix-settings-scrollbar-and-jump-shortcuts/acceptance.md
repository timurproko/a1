# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The settings list rail follows the live Scrollbar mode and style: always draws on overflow, auto shows on scroll, hover, or drag and fades on its own, hidden draws nothing.
- Dragging the thumb scrolls the settings list and pressing the track pages it.
- Ctrl+Home and Ctrl+End select the first and last setting in the list and in search, while plain Home and End move the search cursor only.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-settings-scrollbar-and-jump-shortcuts",
  "sourcePr": 460,
  "archive": "openspec/changes/archive/2026-09-17-fix-settings-scrollbar-and-jump-shortcuts/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-17-fix-settings-scrollbar-and-jump-shortcuts/acceptance.md",
  "finalizedDate": "2026-09-17",
  "specBaseSha": "464b1338be354745169a55bbddccae9211ab1e33",
  "acceptanceScenarios": [
    "The settings list rail follows the live Scrollbar mode and style: always draws on overflow, auto shows on scroll, hover, or drag and fades on its own, hidden draws nothing.",
    "Dragging the thumb scrolls the settings list and pressing the track pages it.",
    "Ctrl+Home and Ctrl+End select the first and last setting in the list and in search, while plain Home and End move the search cursor only."
  ],
  "archiveDigest": "95e12a56675d7e43e662c1bf4b0587294094e8d2197212f05579c71ebafd8d81",
  "specDigest": "8c627a014755f29af653887f7fc046b88b0f3687be1334d38bf8e7211cb024f4",
  "tasksDigest": "b55c2a0b33edf84aae3506c15fc48d32d437f32e683751c4d934dc0393d93009",
  "evidenceDigest": "908005166d5e1dc38b6f3f2d983847c1ab8ac8e5e1d48dd3081aaaab92bc0997",
  "knownGaps": []
}
```
