# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The jump-to-bottom background ends at the visible control instead of painting an isolated cell at the terminal edge.
- Idle, track, and thumb gutter cells retain the underlying ordinary or selected transcript surface.
- Normal, pointed-at, selected, and cached control frames preserve existing labels, hit regions, copy behavior, and follow-end navigation.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "prevent-bottom-control-gutter-bleed",
  "sourcePr": 677,
  "archive": "openspec/changes/archive/2026-10-05-prevent-bottom-control-gutter-bleed/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-05-prevent-bottom-control-gutter-bleed/acceptance.md",
  "finalizedDate": "2026-10-05",
  "specBaseSha": "90863d18d2eccd946a333ddb06dc03d0a26958c2",
  "acceptanceScenarios": [
    "The jump-to-bottom background ends at the visible control instead of painting an isolated cell at the terminal edge.",
    "Idle, track, and thumb gutter cells retain the underlying ordinary or selected transcript surface.",
    "Normal, pointed-at, selected, and cached control frames preserve existing labels, hit regions, copy behavior, and follow-end navigation."
  ],
  "archiveDigest": "db1d62556ea48ddb2c7b1a353e0535e852ca538df59612c98050f3b3d9fb3376",
  "specDigest": "d8b8b77eb92757588c37c4a136cdaee42c8960148f361e8c9cb81dd4cb4e497f",
  "tasksDigest": "af1ba695240a3763d85b58f450c075262f914b9c7928cfb1ad18516a6a1fb24f",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
