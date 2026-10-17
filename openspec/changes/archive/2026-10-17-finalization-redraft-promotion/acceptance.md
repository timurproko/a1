# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Returning a finalized pull request with every item checked to draft makes it ready again without a manual readiness change.
- A draft whose fence claims finalization but whose tree holds the active change again stays draft with a visible `draft-finalization-redraft-form` failure.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "finalization-redraft-promotion",
  "sourcePr": 799,
  "archive": "openspec/changes/archive/2026-10-17-finalization-redraft-promotion/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-17-finalization-redraft-promotion/acceptance.md",
  "finalizedDate": "2026-10-17",
  "specBaseSha": "488a97fcd8da77067afd57ee5442dd79c5f88dea",
  "acceptanceScenarios": [
    "Returning a finalized pull request with every item checked to draft makes it ready again without a manual readiness change.",
    "A draft whose fence claims finalization but whose tree holds the active change again stays draft with a visible `draft-finalization-redraft-form` failure."
  ],
  "archiveDigest": "a43269e1c0ab7be43a31b6144ff73b3c27ba660166830442494e147dd59a7e37",
  "specDigest": "7116f26668d0f1d015db02756b7d2cab3c939d60ab41b5647d747894273819a9",
  "tasksDigest": "9a2b7d4f569430c80f95040c73ae5563fe94482352e3213e0e2c597724a58150",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
