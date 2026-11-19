# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Agents push implementation after only the type check, the touched test files, and strict change validation, without running preflight or broad test suites first.
- CI after the pull request becomes ready is the validation authority, and a CI failure is fixed by a further push to the same pull request.
- `npm run preflight` remains available as an optional tool for reproducing a failure CI reported.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "ci-only-validation",
  "sourcePr": 788,
  "archive": "openspec/changes/archive/2026-10-16-ci-only-validation/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-16-ci-only-validation/acceptance.md",
  "finalizedDate": "2026-10-16",
  "specBaseSha": "f89da8ff21ed1f134b3922e640da1283487fbf13",
  "acceptanceScenarios": [
    "Agents push implementation after only the type check, the touched test files, and strict change validation, without running preflight or broad test suites first.",
    "CI after the pull request becomes ready is the validation authority, and a CI failure is fixed by a further push to the same pull request.",
    "`npm run preflight` remains available as an optional tool for reproducing a failure CI reported."
  ],
  "archiveDigest": "7ee77f1d88679782c8bf8384b713dfc02e177e6038b168d2a436e147a687c85e",
  "specDigest": "c799d4b89ee87b89c193458d427eea22f8e241fa64e6ce497b89e053c45d47b0",
  "tasksDigest": "5749fdd55938dfc1e3ce64179e58ad0387b2a062b479a0628f75fc279fceb04c",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
