# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- `/quit` and the second `Ctrl+C` play the configured outro over the last frame on the alternate screen, then leave it exactly once with only the dim resume hint in the parent terminal.
- Bare A1 prints neither its final fullscreen frame nor the conversation transcript after restoration, while `a1 pi` keeps pinned `fullscreenExitOutput` behavior.
- `/settings` → Quit offers `Effect` (default `fall`) and `Duration` (default 800 ms), and `off` restores the terminal immediately.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "play-quit-outro-on-clean-exit",
  "sourcePr": 449,
  "archive": "openspec/changes/archive/2026-09-17-play-quit-outro-on-clean-exit/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-17-play-quit-outro-on-clean-exit/acceptance.md",
  "finalizedDate": "2026-09-17",
  "specBaseSha": "394066930b6727ad3fc6174dd11ebbe68ddfd552",
  "acceptanceScenarios": [
    "`/quit` and the second `Ctrl+C` play the configured outro over the last frame on the alternate screen, then leave it exactly once with only the dim resume hint in the parent terminal.",
    "Bare A1 prints neither its final fullscreen frame nor the conversation transcript after restoration, while `a1 pi` keeps pinned `fullscreenExitOutput` behavior.",
    "`/settings` → Quit offers `Effect` (default `fall`) and `Duration` (default 800 ms), and `off` restores the terminal immediately."
  ],
  "archiveDigest": "2421f7c2191f22e7a33f49d47fbc99c3b045cdccff37046224a12aaad7f1d7f0",
  "specDigest": "1a818f8c2ce44b04e9558b64bcab687f917a2c6da292a97a5f38f0e514480630",
  "tasksDigest": "a8e4cd0f442bff801f73ec5ab773908f340510518f521754732ea3c1fe8e3bf5",
  "evidenceDigest": "6388911d9c6324c06e2eb620f2f3be4eccf8ce8987ad3c4b24696fe22c8d1893",
  "knownGaps": []
}
```
