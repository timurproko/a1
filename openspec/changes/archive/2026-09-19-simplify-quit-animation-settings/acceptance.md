# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The settings screen lists `Quit animation` under `Generic` and no `Quit`, `Effect`, or `Duration` rows.
- With the switch on, `/quit` and the second `Ctrl+C` play the fall effect for 800 ms before the single alternate-screen leave; with it off, they leave immediately.
- A stored `quitEffect` or `quitEffectDurationMs` is removed by the version-7 migration and a version-5 `off` effect still lands as a disabled switch.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "simplify-quit-animation-settings",
  "sourcePr": 513,
  "archive": "openspec/changes/archive/2026-09-19-simplify-quit-animation-settings/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-19-simplify-quit-animation-settings/acceptance.md",
  "finalizedDate": "2026-09-19",
  "specBaseSha": "33b73b87ce6a4f1847878d553ab328542379a396",
  "acceptanceScenarios": [
    "The settings screen lists `Quit animation` under `Generic` and no `Quit`, `Effect`, or `Duration` rows.",
    "With the switch on, `/quit` and the second `Ctrl+C` play the fall effect for 800 ms before the single alternate-screen leave; with it off, they leave immediately.",
    "A stored `quitEffect` or `quitEffectDurationMs` is removed by the version-7 migration and a version-5 `off` effect still lands as a disabled switch."
  ],
  "archiveDigest": "039cc02113cb152ff6ee3d3c15d74b3d3a0d4f1f81a1a5e233529da38dfab73b",
  "specDigest": "b55f2d1740b7d8c5a7815d0f2306954018709d8180816b20e3948960aa9efa6b",
  "tasksDigest": "c03854db6e76b05967239f265d830c76630cc8db50515f9d56cb7c4c1f106f8b",
  "evidenceDigest": "2231dc8481f76b575b94046a10e79a349439eaa441162fe211733cbe9dee3d71",
  "knownGaps": []
}
```
