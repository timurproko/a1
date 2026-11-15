# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A running publication job updates its existing row to Passed with a green bulb when it succeeds in a capable interactive terminal.
- Concurrent jobs retain separate aligned rows, and unchanged polling snapshots do not duplicate status output.
- Color opt-outs retain neutral live rows, while redirected, dumb, resized, or undersized terminals preserve safe append-only status transitions.
- Failure details and interrupted observation remain readable below progress without changing publication outcomes or gates.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "update-publication-status-in-place",
  "sourcePr": 945,
  "archive": "openspec/changes/archive/2026-11-15-update-publication-status-in-place/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-15-update-publication-status-in-place/acceptance.md",
  "finalizedDate": "2026-11-15",
  "specBaseSha": "e8c7249b169d21cfb7b9f106d3bb7a3ab5b166e4",
  "acceptanceScenarios": [
    "A running publication job updates its existing row to Passed with a green bulb when it succeeds in a capable interactive terminal.",
    "Concurrent jobs retain separate aligned rows, and unchanged polling snapshots do not duplicate status output.",
    "Color opt-outs retain neutral live rows, while redirected, dumb, resized, or undersized terminals preserve safe append-only status transitions.",
    "Failure details and interrupted observation remain readable below progress without changing publication outcomes or gates."
  ],
  "archiveDigest": "00973981576cd33371a915c4c794a9ce36c245ed02b381a0c2c909324d0523f8",
  "specDigest": "d83ff11afc254ff3c636349aaf0f91af73455706da70bf48c5ed4e3319c7a374",
  "tasksDigest": "e6a6bda3c7d101c19169707f8a1be0131addd4fcf6394a08402ffb9b104d1d7c",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
