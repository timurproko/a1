# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Spinner style shows dots, circle, diamond, square, none in the dropdown and when cycling the row.
- Missing or invalid spinner settings use dots with the unchanged dot animation.
- Existing saved spinner choices remain selected, and accepting dots retains the current storage identifier.
- Preview navigation and cancellation leave the saved choice unchanged and stop preview timers on close.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "name-dot-spinner",
  "sourcePr": 914,
  "archive": "openspec/changes/archive/2026-11-11-name-dot-spinner/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-11-name-dot-spinner/acceptance.md",
  "finalizedDate": "2026-11-11",
  "specBaseSha": "81969ce6924469b3081347067fd0d0190359b132",
  "acceptanceScenarios": [
    "Spinner style shows dots, circle, diamond, square, none in the dropdown and when cycling the row.",
    "Missing or invalid spinner settings use dots with the unchanged dot animation.",
    "Existing saved spinner choices remain selected, and accepting dots retains the current storage identifier.",
    "Preview navigation and cancellation leave the saved choice unchanged and stop preview timers on close."
  ],
  "archiveDigest": "26fde4aa3678587f8459109e664ed7743304cd10d07e18edbb8015a52fefdbd7",
  "specDigest": "2c0c1b722c53686737bf2a00244afd2709d96e795ee7786d7986d06e5a9c88a8",
  "tasksDigest": "a3866d6de44d5e8fc7ec2e844cd117f106bb29a507059aa6fcf2bed0d99a9288",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
