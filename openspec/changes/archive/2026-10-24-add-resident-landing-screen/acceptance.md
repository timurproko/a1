# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Closing the last tab keeps `+` and the clock and shows the cwd where an Agent footer shows it, the version below in the footer dim, and the accent wordmark above, with no cursor.
- Closing the last Agent shows the landing instead of the hidden Settings tab, and the next bare `a1` still creates and views an Agent.
- Starting an Agent from the landing wipes the wordmark from the right into a white cell where the Agent caret appears.
- The Settings shortcut and the `+` launcher open Settings from the landing as quickly as beside an Agent.
- The landing follows the Background setting with the same canvas an Agent tab uses.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "add-resident-landing-screen",
  "sourcePr": 819,
  "archive": "openspec/changes/archive/2026-10-24-add-resident-landing-screen/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-24-add-resident-landing-screen/acceptance.md",
  "finalizedDate": "2026-10-24",
  "specBaseSha": "077e5c41bd6322c05457b59485082e97ce98f4fc",
  "acceptanceScenarios": [
    "Closing the last tab keeps `+` and the clock and shows the cwd where an Agent footer shows it, the version below in the footer dim, and the accent wordmark above, with no cursor.",
    "Closing the last Agent shows the landing instead of the hidden Settings tab, and the next bare `a1` still creates and views an Agent.",
    "Starting an Agent from the landing wipes the wordmark from the right into a white cell where the Agent caret appears.",
    "The Settings shortcut and the `+` launcher open Settings from the landing as quickly as beside an Agent.",
    "The landing follows the Background setting with the same canvas an Agent tab uses."
  ],
  "archiveDigest": "4905efde1799c5c5165ef626e41b5eb994b488af2947d6a528f18bccff0d69fd",
  "specDigest": "fddbcf92231177c4c68ad3b0fbc8027c61875076ab83614b8e8e82930ac62581",
  "tasksDigest": "ab4b80c9ce6304d5c817f97523494838813cef321d2b39bc032b14d84bc65293",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
