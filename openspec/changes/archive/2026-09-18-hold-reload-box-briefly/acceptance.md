# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A reload that completes 50 ms after the box appears keeps the box for a further 350 ms, then restores the editor and shows the completion notice.
- A reload that already used 400 ms removes the box immediately with no extra wait.
- Existing reload cases keep their timing through the fixture's zero-window default.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "hold-reload-box-briefly",
  "sourcePr": 470,
  "archive": "openspec/changes/archive/2026-09-18-hold-reload-box-briefly/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-18-hold-reload-box-briefly/acceptance.md",
  "finalizedDate": "2026-09-18",
  "specBaseSha": "c78fe1b8157133bb967cf56780efebe88bfa0508",
  "acceptanceScenarios": [
    "A reload that completes 50 ms after the box appears keeps the box for a further 350 ms, then restores the editor and shows the completion notice.",
    "A reload that already used 400 ms removes the box immediately with no extra wait.",
    "Existing reload cases keep their timing through the fixture's zero-window default."
  ],
  "archiveDigest": "b3d6bf2cae6ff6003fd8c983d1aa1bad6425d5be1b2a608596b03779b9d65616",
  "specDigest": "2efe85f301ca44b96f847dd3aede80f42d94e6f05dc9abc99a7246a91fe0196e",
  "tasksDigest": "e5baebeb302e893de3465b430791873e7fd1afa5def0db9b532076384a26daea",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
