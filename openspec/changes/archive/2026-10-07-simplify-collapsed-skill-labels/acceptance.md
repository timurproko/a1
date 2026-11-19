# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The collapsed Skills dialog lists bare skill names without `skill:` prefixes.
- Selecting a bare skill label still submits the matching `/skill:` prompt through the ordinary prompt path.
- Expanded skill commands and `/skills:` tunnel results retain their command-oriented labels.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "simplify-collapsed-skill-labels",
  "sourcePr": 699,
  "archive": "openspec/changes/archive/2026-10-07-simplify-collapsed-skill-labels/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-07-simplify-collapsed-skill-labels/acceptance.md",
  "finalizedDate": "2026-10-07",
  "specBaseSha": "885df1a2bf8583efe61517f1b383d7347f79db3a",
  "acceptanceScenarios": [
    "The collapsed Skills dialog lists bare skill names without `skill:` prefixes.",
    "Selecting a bare skill label still submits the matching `/skill:` prompt through the ordinary prompt path.",
    "Expanded skill commands and `/skills:` tunnel results retain their command-oriented labels."
  ],
  "archiveDigest": "c43d36ab682cbdcaa6155462e583004393ce6c1ec4977e13db07dfd3ecaab53d",
  "specDigest": "c9a8ef8d1e04b8816d9ee61066b3b6e996657c0ef4d92dc9800166bc59664a13",
  "tasksDigest": "fc2d922a5e04f83fee1278178bfb171db534ec7c066f1ff7a0822ae3a4cdc95f",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
