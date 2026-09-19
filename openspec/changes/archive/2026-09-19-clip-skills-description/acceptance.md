# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Selecting a skill whose description is longer than the terminal width shows the description on a single row cut at the last visible column with no `...`, with the hint footer directly below it.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "clip-skills-description",
  "sourcePr": 520,
  "archive": "openspec/changes/archive/2026-09-19-clip-skills-description/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-19-clip-skills-description/acceptance.md",
  "finalizedDate": "2026-09-19",
  "specBaseSha": "ded6e2e11e5062783fc2ac725f9c684f85c6eb33",
  "acceptanceScenarios": [
    "Selecting a skill whose description is longer than the terminal width shows the description on a single row cut at the last visible column with no `...`, with the hint footer directly below it."
  ],
  "archiveDigest": "b9e62abd54adcddbfdcdb3d38883c008dc2979526807f50358fd959d291867d6",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "cbb57473f1b43c73083b7d2eb75cfeb3b8fea8b920cd14aa431817b502f04e5f",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
