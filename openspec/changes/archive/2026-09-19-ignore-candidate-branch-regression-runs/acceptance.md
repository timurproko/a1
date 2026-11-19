# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A Full regression that fails on a `fix/nightly-regression-YYYY-MM-DD` branch opens and refreshes no triage pull request, and a manual triage dispatch with that run id reports the run's branch as the reason.
- A scheduled Full regression that fails on `develop` still opens or refreshes its candidate as before.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "ignore-candidate-branch-regression-runs",
  "sourcePr": 506,
  "archive": "openspec/changes/archive/2026-09-19-ignore-candidate-branch-regression-runs/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-19-ignore-candidate-branch-regression-runs/acceptance.md",
  "finalizedDate": "2026-09-19",
  "specBaseSha": "69a4d6ae33694eb931697587d8c044b4543e4c77",
  "acceptanceScenarios": [
    "A Full regression that fails on a `fix/nightly-regression-YYYY-MM-DD` branch opens and refreshes no triage pull request, and a manual triage dispatch with that run id reports the run's branch as the reason.",
    "A scheduled Full regression that fails on `develop` still opens or refreshes its candidate as before."
  ],
  "archiveDigest": "64d247e697bb97685dc0eaadfd66df2b7121aecfa83ac65612a09a17ea3ffc55",
  "specDigest": "7e6ed8f7c532d3879d543f8043a3ec726204a41068522a0ce8bb4806963fb001",
  "tasksDigest": "4b81d3517b3108d117fdab85ef52486d7b43ac3e07e5b5d2e93ec359d9896707",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
