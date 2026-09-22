# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Regular pull requests retain bounded Development validation without scheduling PR Full regression from paths, unknown inputs, or labels.
- Only an App-created repair with generated failed-Full-regression provenance verified against GitHub receives the complete PR matrix.
- Planning-only repair drafts stay lightweight, while an eligible implemented repair requires fresh complete evidence on its final head.
- Scheduled and manually dispatched Full regression retain their complete non-publishing coverage independently of PR selection.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "limit-pr-full-regression-to-ci-repairs",
  "sourcePr": 551,
  "archive": "openspec/changes/archive/2026-09-22-limit-pr-full-regression-to-ci-repairs/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-22-limit-pr-full-regression-to-ci-repairs/acceptance.md",
  "finalizedDate": "2026-09-22",
  "specBaseSha": "91acd99bef9292e5d0d69bc58a1860c212eda179",
  "acceptanceScenarios": [
    "Regular pull requests retain bounded Development validation without scheduling PR Full regression from paths, unknown inputs, or labels.",
    "Only an App-created repair with generated failed-Full-regression provenance verified against GitHub receives the complete PR matrix.",
    "Planning-only repair drafts stay lightweight, while an eligible implemented repair requires fresh complete evidence on its final head.",
    "Scheduled and manually dispatched Full regression retain their complete non-publishing coverage independently of PR selection."
  ],
  "archiveDigest": "fdad83c5b59486c21231064b348fc61e36d32be6ff1f61abc652136f976dfe2d",
  "specDigest": "9cb352e1c344ebf9a64968feb52ad786ab36ce588cace65f1e734d4e53f92642",
  "tasksDigest": "d6b70cd051780d33b60a7ac833d9c5afa37f84357174f3b72dea85559c8b45b8",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
