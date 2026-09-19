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
  "specBaseSha": "23bea061139bca3d77285a0dae7756fbdb8dacb0",
  "acceptanceScenarios": [
    "The settings screen lists `Quit animation` under `Generic` and no `Quit`, `Effect`, or `Duration` rows.",
    "With the switch on, `/quit` and the second `Ctrl+C` play the fall effect for 800 ms before the single alternate-screen leave; with it off, they leave immediately.",
    "A stored `quitEffect` or `quitEffectDurationMs` is removed by the version-7 migration and a version-5 `off` effect still lands as a disabled switch."
  ],
  "archiveDigest": "1de701c7a9e76e8602a2ca2e44f35688456274296a457301e62f9dfe889f3c6a",
  "specDigest": "ebc9cfb20a5363be7e87f4fc592ec0db100d15792c5c46a0e5a8f0cb1644c576",
  "tasksDigest": "c03854db6e76b05967239f265d830c76630cc8db50515f9d56cb7c4c1f106f8b",
  "evidenceDigest": "2231dc8481f76b575b94046a10e79a349439eaa441162fe211733cbe9dee3d71",
  "knownGaps": []
}
```
