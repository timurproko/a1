# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Bare A1 progress labels animate a neutral-white highlight while the spinner remains accent-coloured.
- Surrounding label text and the ellipsis remain muted without changing animation cadence, geometry, or lifecycle.
- The pinned `a1 pi` progress presentation remains unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "use-white-progress-highlight",
  "sourcePr": 601,
  "archive": "openspec/changes/archive/2026-09-27-use-white-progress-highlight/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-27-use-white-progress-highlight/acceptance.md",
  "finalizedDate": "2026-09-27",
  "specBaseSha": "f83c501794763b2f3ab2b2235fd4baac10dcdd01",
  "acceptanceScenarios": [
    "Bare A1 progress labels animate a neutral-white highlight while the spinner remains accent-coloured.",
    "Surrounding label text and the ellipsis remain muted without changing animation cadence, geometry, or lifecycle.",
    "The pinned `a1 pi` progress presentation remains unchanged."
  ],
  "archiveDigest": "4cba979072caa1ee5cc09ef1c0575e3b06ca0886db0dc1a415819b141c5c02c2",
  "specDigest": "532090307e6fc8fa9da2a9505013fa529e9dc9412b4a5d2fe4b64265a52614b7",
  "tasksDigest": "fdd370bfe722f5a50c1bebbe118d45a179631b471a4c7061286dd47b2085ee19",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
