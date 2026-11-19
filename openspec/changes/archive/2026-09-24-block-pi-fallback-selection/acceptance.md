# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Bare A1 never paints Pi's white reverse-video fallback selection after residual or modified mouse input, Shift-arrow navigation, scrolling, or streaming updates.
- A1's dark-blue frame selection continues to span its content frame while controls, overlays, replacement surfaces, wheel routing, links, and right-click paste retain ownership.
- Mixed keyboard and mouse input preserves keyboard bytes in order, and bracketed paste preserves embedded mouse-looking bytes unchanged.
- Bare A1 restores its owned terminal-reporting modes on exit, while regular mode and the `a1 pi` comparison profile retain their existing selection behavior.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "block-pi-fallback-selection",
  "sourcePr": 578,
  "archive": "openspec/changes/archive/2026-09-24-block-pi-fallback-selection/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-24-block-pi-fallback-selection/acceptance.md",
  "finalizedDate": "2026-09-24",
  "specBaseSha": "02d3b56b9b116e850b8dce17292f79fe00e5a5d8",
  "acceptanceScenarios": [
    "Bare A1 never paints Pi's white reverse-video fallback selection after residual or modified mouse input, Shift-arrow navigation, scrolling, or streaming updates.",
    "A1's dark-blue frame selection continues to span its content frame while controls, overlays, replacement surfaces, wheel routing, links, and right-click paste retain ownership.",
    "Mixed keyboard and mouse input preserves keyboard bytes in order, and bracketed paste preserves embedded mouse-looking bytes unchanged.",
    "Bare A1 restores its owned terminal-reporting modes on exit, while regular mode and the `a1 pi` comparison profile retain their existing selection behavior."
  ],
  "archiveDigest": "7d289740d324a8404428c68c1ba1deb286bed34a0cb22edb21d84222997a9630",
  "specDigest": "c3003c591a80ea59385b02fcccc7763a72870df59b16aff2bd4f1fa221b8570a",
  "tasksDigest": "0a14f06925da57d6b404e60913784c7330a5329e8f7898b1fd6929094192859e",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
