# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Selected autocomplete arrows and primary candidates use the cyan accent while rendered descriptions remain muted.
- Built-in, runtime-provided, and skills-tunnel completions preserve their text, navigation, and completion behavior.
- Narrow rows without rendered descriptions and the `a1 pi` comparison profile retain their existing selected styling.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "mute-selected-command-descriptions",
  "sourcePr": 531,
  "archive": "openspec/changes/archive/2026-09-22-mute-selected-command-descriptions/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-22-mute-selected-command-descriptions/acceptance.md",
  "finalizedDate": "2026-09-22",
  "specBaseSha": "4605f4a27c89cfbb85a9354eb82f4e02c4f88dc3",
  "acceptanceScenarios": [
    "Selected autocomplete arrows and primary candidates use the cyan accent while rendered descriptions remain muted.",
    "Built-in, runtime-provided, and skills-tunnel completions preserve their text, navigation, and completion behavior.",
    "Narrow rows without rendered descriptions and the `a1 pi` comparison profile retain their existing selected styling."
  ],
  "archiveDigest": "1d6d104e6d47d240b5f42d0dc61dd1c33ae134f2b1643800266b32ecc71e073d",
  "specDigest": "c3f8c4ff6d0c7f8ec874f42023cd8f7fa53ba6ea197669b9cae1183d0148cd03",
  "tasksDigest": "b3b5f6eec5fe80ae150e42849e46cfec2bf4e74ea3a26d5c7bab1a9e84b0d35f",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
