# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- `a1 update` and the automatic update install, report progress, print their result lines, and exit with the same codes as before.
- An update with no approved active release records and approves a recovery release before npm replaces the package.
- The package is replaced only through protected replacement, and a cancelled replacement still reports that the launcher is available and exits with status 130.
- When activation or maintenance fails after replacement, the update rolls back to the prior release, records the failure with the rollback result, and exits non-zero.
- A preflight failure still stops the update before any change and prints the recovery command.
- An interrupted update from a dead owner is still rolled back before the new update runs.
- `runSelfUpdate` leaves the long-function ratchet, and the startup graph is unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "update-install-path",
  "sourcePr": 888,
  "archive": "openspec/changes/archive/2026-11-08-update-install-path/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-08-update-install-path/acceptance.md",
  "finalizedDate": "2026-11-08",
  "specBaseSha": "3a3231fcad264f700e668322f49d18b2410013ed",
  "acceptanceScenarios": [
    "`a1 update` and the automatic update install, report progress, print their result lines, and exit with the same codes as before.",
    "An update with no approved active release records and approves a recovery release before npm replaces the package.",
    "The package is replaced only through protected replacement, and a cancelled replacement still reports that the launcher is available and exits with status 130.",
    "When activation or maintenance fails after replacement, the update rolls back to the prior release, records the failure with the rollback result, and exits non-zero.",
    "A preflight failure still stops the update before any change and prints the recovery command.",
    "An interrupted update from a dead owner is still rolled back before the new update runs.",
    "`runSelfUpdate` leaves the long-function ratchet, and the startup graph is unchanged."
  ],
  "archiveDigest": "6fdeacf92b4ce42ae1eb96304ee0776a12caaae6f7d190cdf6e7e9c87ad8940f",
  "specDigest": "75adad07e9b2d208432a99d21433ca425ec00322f6b133f64b171a75a5a6e434",
  "tasksDigest": "0113d58d54c52c3cb5300b023a376131335b5fcf14bdcfdf0e205612f74e2008",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
