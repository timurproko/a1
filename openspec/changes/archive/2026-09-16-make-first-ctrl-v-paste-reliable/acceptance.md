# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A cold bare-A1 prompt pastes readable external clipboard content on the first Ctrl+V without right-click priming.
- An inconclusive first clipboard backend falls through within the original deadline and inserts once; failed attempts do not poison later pastes.
- Terminal-provided paste remains exactly once while modal and a1 pi input ownership remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "make-first-ctrl-v-paste-reliable",
  "sourcePr": 432,
  "archive": "openspec/changes/archive/2026-09-16-make-first-ctrl-v-paste-reliable/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-16-make-first-ctrl-v-paste-reliable/acceptance.md",
  "finalizedDate": "2026-09-16",
  "specBaseSha": "94075aef090d324b3b596e175516d677483cca10",
  "acceptanceScenarios": [
    "A cold bare-A1 prompt pastes readable external clipboard content on the first Ctrl+V without right-click priming.",
    "An inconclusive first clipboard backend falls through within the original deadline and inserts once; failed attempts do not poison later pastes.",
    "Terminal-provided paste remains exactly once while modal and a1 pi input ownership remain unchanged."
  ],
  "archiveDigest": "7c94bec263563a54b4b667e288daa9b081e68f2de41002013d93b56ffa1ebbed",
  "specDigest": "60cf392de001a397bc9ebb5bd38a2e88c99e958a38660416333e421c606e860c",
  "tasksDigest": "9e537cae7b4a61a602d1206b931c5e99be6bec01c52a23f9ac2f10ce6732ca52",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
