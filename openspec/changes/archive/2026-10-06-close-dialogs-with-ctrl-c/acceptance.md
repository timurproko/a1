# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- One Ctrl+C closes an active built-in dialog immediately, including when its search or input is populated.
- Ctrl+C in a nested dialog cancels only that active step and restores its expected parent surface.
- Ctrl+C closes extension-hosted replacement and overlay dialogs without forwarding the input to extension content.
- Dialog shortcut rows continue to advertise Escape or Esc without showing the implicit Ctrl+C alias.
- Ctrl+C outside dialog ownership retains the active editor or full-screen application's established behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "close-dialogs-with-ctrl-c",
  "sourcePr": 690,
  "archive": "openspec/changes/archive/2026-10-06-close-dialogs-with-ctrl-c/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-06-close-dialogs-with-ctrl-c/acceptance.md",
  "finalizedDate": "2026-10-06",
  "specBaseSha": "44a4dbf13767a0e3e92bdc63feeaf2181a4658eb",
  "acceptanceScenarios": [
    "One Ctrl+C closes an active built-in dialog immediately, including when its search or input is populated.",
    "Ctrl+C in a nested dialog cancels only that active step and restores its expected parent surface.",
    "Ctrl+C closes extension-hosted replacement and overlay dialogs without forwarding the input to extension content.",
    "Dialog shortcut rows continue to advertise Escape or Esc without showing the implicit Ctrl+C alias.",
    "Ctrl+C outside dialog ownership retains the active editor or full-screen application's established behavior."
  ],
  "archiveDigest": "2a77ae10cf0456402093ffa5c1ea8d049491850361118a9ee5214b25ae1c90c2",
  "specDigest": "eb311151a85ad673a974d058d9763229f8e69bb18d3ceadcf1fd4d9076edf429",
  "tasksDigest": "e15c557ab6e6d580f28b14556ac078ec981416cce8d0f92c331598c6f0e362bb",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
