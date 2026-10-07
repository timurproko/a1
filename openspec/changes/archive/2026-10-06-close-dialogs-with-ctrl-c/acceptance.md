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
  "specBaseSha": "ff896747fedf55174cdee19e2deaaaf377dfeb90",
  "acceptanceScenarios": [
    "One Ctrl+C closes an active built-in dialog immediately, including when its search or input is populated.",
    "Ctrl+C in a nested dialog cancels only that active step and restores its expected parent surface.",
    "Ctrl+C closes extension-hosted replacement and overlay dialogs without forwarding the input to extension content.",
    "Close shortcut rows continue to advertise Escape or Esc without showing the implicit Ctrl+C alias.",
    "One Ctrl+C closes Settings, Changelog, Keyboard Shortcuts, and Session Info without invoking the application exit chord, including while Settings owns nested input.",
    "Ctrl+C outside dismissible-surface ownership retains the active editor, terminal, comparison-profile, or non-opted-in application's established behavior."
  ],
  "archiveDigest": "e1399f4bcbdb4487c51599ad1214a42b906a976134dfb5c825f6bdcd8f3e768c",
  "specDigest": "a3e68f28eb95e81f1c7897b33d8cbf08a9443ac51c0717f44974f1141bfec1ca",
  "tasksDigest": "4d9d948fca7e8465b3d42f7e33c97342aad54c4cb88ba571d02d70740e6f3568",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
