# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The settings screen opens on a `Generic` section whose `Exit animation` switch defaults to on, ahead of `Scroll`, `History`, `Quit`, and `Agent`.
- With the switch off, `/quit` and the second `Ctrl+C` leave the alternate screen immediately with no outro and no flashed frame, whether the switch was stored earlier or changed in the same session.
- A stored `off` effect migrates to a disabled switch with the default `fall` effect, and the effect menu offers only the four animations.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "expose-quit-animation-toggle",
  "sourcePr": 461,
  "archive": "openspec/changes/archive/2026-09-17-expose-quit-animation-toggle/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-17-expose-quit-animation-toggle/acceptance.md",
  "finalizedDate": "2026-09-17",
  "specBaseSha": "9448204a4c593148e415a9feef659293423948a6",
  "acceptanceScenarios": [
    "The settings screen opens on a `Generic` section whose `Exit animation` switch defaults to on, ahead of `Scroll`, `History`, `Quit`, and `Agent`.",
    "With the switch off, `/quit` and the second `Ctrl+C` leave the alternate screen immediately with no outro and no flashed frame, whether the switch was stored earlier or changed in the same session.",
    "A stored `off` effect migrates to a disabled switch with the default `fall` effect, and the effect menu offers only the four animations."
  ],
  "archiveDigest": "bb48dd81b2009f944c225046d236ec016fa38977409455eae1af0e51912fef21",
  "specDigest": "b5e34b6477b71d81bf42ae916666eeff4b31b10b7376cfcbe5a68b3c8f5d8e9b",
  "tasksDigest": "82db906d970e2bf201b8f33c6f301d0c4dbd4ffc6a1725bbbbf1ec0cbb6ee422",
  "evidenceDigest": "6131dfcabf0c76e7ff5fbdbde6b181500bb31adde556f216d42d388f33681ccc",
  "knownGaps": []
}
```
