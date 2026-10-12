# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Killing the server while two tabs stream leaves both agents running; reconnecting shows both current screens
- One tab hanging, crashing, or ignoring input never slows or stops another tab
- A terminal that stops reading never stalls tabs or other terminals, and catches up on resume
- An oversized paste into a stalled tab is rejected visibly, with no partial delivery
- Opening a session already open in another A1 process, in any mode, is refused or offered as a fork and never written twice
- Ten tabs started at once all have their models available

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "resident-tabs-failure-isolation",
  "sourcePr": 747,
  "archive": "openspec/changes/archive/2026-10-12-resident-tabs-failure-isolation/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-12-resident-tabs-failure-isolation/acceptance.md",
  "finalizedDate": "2026-10-12",
  "specBaseSha": "b4b6780b7cf9770bdaa331c10270f8bcc8dbadd2",
  "acceptanceScenarios": [
    "Killing the server while two tabs stream leaves both agents running; reconnecting shows both current screens",
    "One tab hanging, crashing, or ignoring input never slows or stops another tab",
    "A terminal that stops reading never stalls tabs or other terminals, and catches up on resume",
    "An oversized paste into a stalled tab is rejected visibly, with no partial delivery",
    "Opening a session already open in another A1 process, in any mode, is refused or offered as a fork and never written twice",
    "Ten tabs started at once all have their models available"
  ],
  "archiveDigest": "805c8fd4e411c21feba366a01e5c97039ba96c9ff6e3b7e474ef7204e3fd1516",
  "specDigest": "d94c7e81ae5102e5ab5dc4bd876ec86c9acb3b96a5b8f6e830085311afb944ed",
  "tasksDigest": "fdd06d729a8b2b7dd5ad55a6a9de0c0ff6f03c1eedf676338d5a21238ef94539",
  "evidenceDigest": "7b5a60f2b23e1ca259f19b4feb19add75a95291209f83cce6e826b672e8d5d77",
  "knownGaps": []
}
```
