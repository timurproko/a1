# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- The governance definition holds no rulesets or protected refs, and its validation rejects neither absence.
- The governance check and its apply command read and write no ruleset on GitHub.
- The runbook names the shared declaration and the delivery protect command as the way to change protection.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "share-repository-rulesets",
  "sourcePr": 979,
  "archive": "openspec/changes/archive/2026-11-18-share-repository-rulesets/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-18-share-repository-rulesets/acceptance.md",
  "finalizedDate": "2026-11-18",
  "specBaseSha": "fb038d6ccacabc2bbeb41eada1b4daf38a24e2e6",
  "acceptanceScenarios": [
    "The governance definition holds no rulesets or protected refs, and its validation rejects neither absence.",
    "The governance check and its apply command read and write no ruleset on GitHub.",
    "The runbook names the shared declaration and the delivery protect command as the way to change protection."
  ],
  "archiveDigest": "7f60bc3bb31f04b4cd18f017d62b48c0f81e781304cdbb449e63cb0c09c85fdb",
  "specDigest": "4d2b498ad573944726e72f4c09da73f6661f58d86cc31058b37a40a6e7463dfc",
  "tasksDigest": "ce8e9144f726aaab85928d92c93ff42a6457c903b5b6d50b59bfb512f3ce2d95",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
