# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Bare A1’s keyboard-shortcut sections use the Settings accent and place each table directly below its label without a blank spacer.
- Shortcut bindings, optional extension rows, wrapping, reference-screen interaction, and the pinned `a1 pi` presentation remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "style-shortcut-section-headings",
  "sourcePr": 535,
  "archive": "openspec/changes/archive/2026-09-22-style-shortcut-section-headings/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-22-style-shortcut-section-headings/acceptance.md",
  "finalizedDate": "2026-09-22",
  "specBaseSha": "6ae061516ba71675476541a958bd6e49903e280f",
  "acceptanceScenarios": [
    "Bare A1’s keyboard-shortcut sections use the Settings accent and place each table directly below its label without a blank spacer.",
    "Shortcut bindings, optional extension rows, wrapping, reference-screen interaction, and the pinned `a1 pi` presentation remain unchanged."
  ],
  "archiveDigest": "236c305b3c61ea08d5fb6cddd0320ae087f98c448f8a74f9439034732ef079b7",
  "specDigest": "01251da802f1867777e4b3b917fcaa701304acf4104d1a4fbc96dbee42f15fe1",
  "tasksDigest": "041fcf4afa65ff448eba42989c871e3f25d8ba904650d383c4919151e1a7128b",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
