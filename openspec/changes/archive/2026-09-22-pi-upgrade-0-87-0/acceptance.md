# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Run /session and /hotkeys in bare A1 and confirm both still match the pinned engine after the upgrade.
- Open /settings and confirm every agent setting the pinned selector exposes is still reachable and editable.
- Submit an ordinary prompt, let the turn settle, and confirm the transcript, footer usage, and status are unchanged.
- Read a text file whose first bytes are GIF and confirm its text reaches the transcript instead of being dropped.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "pi-upgrade-0-87-0",
  "sourcePr": 537,
  "archive": "openspec/changes/archive/2026-09-22-pi-upgrade-0-87-0/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-22-pi-upgrade-0-87-0/acceptance.md",
  "finalizedDate": "2026-09-22",
  "specBaseSha": "6f8aa6f4cf4f63e5ad3801432fda6e2e094ac7f8",
  "acceptanceScenarios": [
    "Run /session and /hotkeys in bare A1 and confirm both still match the pinned engine after the upgrade.",
    "Open /settings and confirm every agent setting the pinned selector exposes is still reachable and editable.",
    "Submit an ordinary prompt, let the turn settle, and confirm the transcript, footer usage, and status are unchanged.",
    "Read a text file whose first bytes are GIF and confirm its text reaches the transcript instead of being dropped."
  ],
  "archiveDigest": "bfc24ae07054f57ebc42e705509ef7bc8bd69b8e1e0b3e270fdb6b4e1b11e939",
  "specDigest": "e7e84484950dce6f03733a717627fb9ed780fe166fab1b544825a02d1fa1e1f1",
  "tasksDigest": "e4841ffd2656624b5c4322ce48a22b35f7d3bf4d9703591f5e99692703429318",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
