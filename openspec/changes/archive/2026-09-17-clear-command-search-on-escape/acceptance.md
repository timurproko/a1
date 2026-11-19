# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Typing `/`, `/mod`, or `/skill:r` in bare A1 and pressing Escape closes the menu and leaves an empty prompt without calling the interrupt handler.
- Escape on an argument, path, resource, or extension-provider menu, on a search containing a space or nested slash, or in the `a1 pi` comparison profile only closes the menu and keeps the typed text.
- The pinned Pi source ledger records the owned-editor deviation and its current hash so architecture governance passes.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "clear-command-search-on-escape",
  "sourcePr": 451,
  "archive": "openspec/changes/archive/2026-09-17-clear-command-search-on-escape/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-17-clear-command-search-on-escape/acceptance.md",
  "finalizedDate": "2026-09-17",
  "specBaseSha": "e8beafbe01d38db6cb70d4198cc4f187c58e1060",
  "acceptanceScenarios": [
    "Typing `/`, `/mod`, or `/skill:r` in bare A1 and pressing Escape closes the menu and leaves an empty prompt without calling the interrupt handler.",
    "Escape on an argument, path, resource, or extension-provider menu, on a search containing a space or nested slash, or in the `a1 pi` comparison profile only closes the menu and keeps the typed text.",
    "The pinned Pi source ledger records the owned-editor deviation and its current hash so architecture governance passes."
  ],
  "archiveDigest": "0507bbf1f0611386443cb3991580af8804acb5c98c8e5ccc486fa5044c278ccd",
  "specDigest": "76ff321a6e6255df5ac3ebceebc786add40bbb8c716925f33b6e4b99f7494adf",
  "tasksDigest": "f2b90fab5e9eed90e1dbd3d256c4c8ccdc455d40859cf8bfcf17023217a45e7a",
  "evidenceDigest": "ecbb80a1953fbe53358ce30a4fb2bb003bba2fd656fb673730c1e33fbf2ddb04",
  "knownGaps": []
}
```
