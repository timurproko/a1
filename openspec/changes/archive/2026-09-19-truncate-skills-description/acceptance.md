# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Selecting a skill whose description is longer than the terminal width shows the description on a single row ending in `...`, with the hint footer directly below it.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "truncate-skills-description",
  "sourcePr": 518,
  "archive": "openspec/changes/archive/2026-09-19-truncate-skills-description/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-19-truncate-skills-description/acceptance.md",
  "finalizedDate": "2026-09-19",
  "specBaseSha": "dd5710bed849d2fa1c594c3682c52b84f4552a75",
  "acceptanceScenarios": [
    "Selecting a skill whose description is longer than the terminal width shows the description on a single row ending in `...`, with the hint footer directly below it."
  ],
  "archiveDigest": "e5a398a8bd50008e68b859ec075d55d0929d56aeabd9c31527f741bc28482c62",
  "specDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "tasksDigest": "4780e1771a5091a21e83b2a3628d69c98d59f251e992fa5c4e3e2837740092e4",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
