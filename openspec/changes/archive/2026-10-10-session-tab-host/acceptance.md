# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Bare `a1` and `a1 pi` compose one terminal host and one presenter, and the reference screens and every existing session-shell suite pass unchanged.
- Attaching a second presenter repaints the terminal in full exactly once; its later frames use incremental damage within the new epoch and are never discarded as stale.
- A presenter that is not attached applies engine events to its own transcript, while its render requests, overlays, and program status never reach the terminal.
- Closing a presenter that is not the last one leaves the terminal running; closing the last one plays the quit presentation and restores the terminal as before.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "session-tab-host",
  "sourcePr": 735,
  "archive": "openspec/changes/archive/2026-10-10-session-tab-host/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-10-session-tab-host/acceptance.md",
  "finalizedDate": "2026-10-10",
  "specBaseSha": "a525dfb9ec882a71696bc4ea5edc5a564b7d3153",
  "acceptanceScenarios": [
    "Bare `a1` and `a1 pi` compose one terminal host and one presenter, and the reference screens and every existing session-shell suite pass unchanged.",
    "Attaching a second presenter repaints the terminal in full exactly once; its later frames use incremental damage within the new epoch and are never discarded as stale.",
    "A presenter that is not attached applies engine events to its own transcript, while its render requests, overlays, and program status never reach the terminal.",
    "Closing a presenter that is not the last one leaves the terminal running; closing the last one plays the quit presentation and restores the terminal as before."
  ],
  "archiveDigest": "9ff465a25e462d37b63a02a5f9cf71b5aa4b1fc63b5aeedd4170778b0729bb4e",
  "specDigest": "bdb9bdae9c2bca3b809e0261f97ab46423375e20c91542ef0c2c02d0569b236c",
  "tasksDigest": "123b27e8fea63a69a4619ef7698ce4b2faadf28a578e70e6c50b85d9b26ec6db",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
