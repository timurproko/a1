# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A development publication whose Windows startup sample exceeds its budget records the violation in its uploaded per-platform startup evidence, annotates the run, and still publishes.
- The same overrun on a nightly, stable, or Full regression lane fails with the unchanged message and blocks publication, and an unset or unrecognized mode enforces.
- The release-gate budget owner leaves the eager startup graph, which drops to 2 622 607 source bytes across an unchanged 142 files without altering any budget number.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "record-startup-budget-on-development-publication",
  "sourcePr": 443,
  "archive": "openspec/changes/archive/2026-09-16-record-startup-budget-on-development-publication/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-16-record-startup-budget-on-development-publication/acceptance.md",
  "finalizedDate": "2026-09-16",
  "specBaseSha": "60aaba043296a5be8d7591d0a579a8fe20a17f71",
  "acceptanceScenarios": [
    "A development publication whose Windows startup sample exceeds its budget records the violation in its uploaded per-platform startup evidence, annotates the run, and still publishes.",
    "The same overrun on a nightly, stable, or Full regression lane fails with the unchanged message and blocks publication, and an unset or unrecognized mode enforces.",
    "The release-gate budget owner leaves the eager startup graph, which drops to 2 622 607 source bytes across an unchanged 142 files without altering any budget number."
  ],
  "archiveDigest": "5d56ea863801f4a61ec2e7e5bd701b47f6e0f69ed1b5e38ced1f455bd745540d",
  "specDigest": "2018e517fc30ae4838243421fa1a210e0a550da790876b552c8f1c91f8a9b42e",
  "tasksDigest": "dd7e97137819c1fec2d2ba03448b3bb8b1a592e53aca388752e31e00ce71a571",
  "evidenceDigest": "ea9ec139987a66b6c3c902c8316fb27f5984be4e6116d5920e21a985410dfe21",
  "knownGaps": []
}
```
