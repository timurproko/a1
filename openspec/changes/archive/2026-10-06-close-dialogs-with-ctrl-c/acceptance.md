# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- One Ctrl+C closes an active built-in dialog immediately, including when its search or input is populated.
- Ctrl+C in a nested dialog cancels only that active step and restores its expected parent surface.
- Ctrl+C closes extension-hosted replacement and overlay dialogs without forwarding the input to extension content.
- Close shortcut rows continue to advertise Escape or Esc without showing the implicit Ctrl+C alias.
- One Ctrl+C closes Settings, Changelog, Keyboard Shortcuts, and Session Info without invoking the application exit chord, including while Settings owns nested input.
- Ctrl+C outside dismissible-surface ownership retains the active editor, terminal, comparison-profile, or non-opted-in application's established behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "close-dialogs-with-ctrl-c",
  "sourcePr": 690,
  "archive": "openspec/changes/archive/2026-10-06-close-dialogs-with-ctrl-c/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-06-close-dialogs-with-ctrl-c/acceptance.md",
  "finalizedDate": "2026-10-06",
  "specBaseSha": "bb2b7e65d9673ec1ce2d3491acf66707118d7961",
  "acceptanceScenarios": [
    "One Ctrl+C closes an active built-in dialog immediately, including when its search or input is populated.",
    "Ctrl+C in a nested dialog cancels only that active step and restores its expected parent surface.",
    "Ctrl+C closes extension-hosted replacement and overlay dialogs without forwarding the input to extension content.",
    "Close shortcut rows continue to advertise Escape or Esc without showing the implicit Ctrl+C alias.",
    "One Ctrl+C closes Settings, Changelog, Keyboard Shortcuts, and Session Info without invoking the application exit chord, including while Settings owns nested input.",
    "Ctrl+C outside dismissible-surface ownership retains the active editor, terminal, comparison-profile, or non-opted-in application's established behavior."
  ],
  "archiveDigest": "90970a3d22924a8a0f780da693b14d03ccdf234fa13c84d87ed1ced3e9a9c49f",
  "specDigest": "0dd65f773ee98a914dfcc2baa43fd415da771a534d3bdc2fe0234a6b9a02e7ad",
  "tasksDigest": "4d9d948fca7e8465b3d42f7e33c97342aad54c4cb88ba571d02d70740e6f3568",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
