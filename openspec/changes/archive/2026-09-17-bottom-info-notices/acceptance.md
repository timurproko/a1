# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- In a fresh bare-A1 session, `/model` shows `Switched to …` directly above the editor with one blank row on each side and the viewport top stays empty; a second confirmation replaces it in place.
- A notice raised while the agent is working renders below `Working...`, survives streamed updates to the current block, and disappears when the next block, an error, or a session reset arrives.
- The same messages in `a1 pi` still append to the transcript as before.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "bottom-info-notices",
  "sourcePr": 467,
  "archive": "openspec/changes/archive/2026-09-17-bottom-info-notices/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-17-bottom-info-notices/acceptance.md",
  "finalizedDate": "2026-09-17",
  "specBaseSha": "538637b90723131c487870c56c22f00170b9a053",
  "acceptanceScenarios": [
    "In a fresh bare-A1 session, `/model` shows `Switched to …` directly above the editor with one blank row on each side and the viewport top stays empty; a second confirmation replaces it in place.",
    "A notice raised while the agent is working renders below `Working...`, survives streamed updates to the current block, and disappears when the next block, an error, or a session reset arrives.",
    "The same messages in `a1 pi` still append to the transcript as before."
  ],
  "archiveDigest": "95f6a5f48a02bf0ddfa6db56f9e8791567e3f6f958c933ec65f79d38a3aed7ca",
  "specDigest": "bcf1a70d80b6359731306a8450d6c2902faf2c138d7669df74a0e68ac51bf924",
  "tasksDigest": "962ab5b03950f478c7160815e1b22bda81b7a88153aaa45591b60493d1a213b7",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
