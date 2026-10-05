# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- Bare A1 opens `/session` as a full-screen `Session Info` route without adding report or status rows to the feed.
- Session identity and complete message, token, cache-warming, and conditional cost details render under shared owned-screen section headings.
- Reopening captures current statistics, while scrolling, dismissal, stale-notice cleanup, and viewport restoration retain reference-screen behavior.
- The `a1 pi` comparison profile keeps the complete pinned session report in its chronological feed position.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "present-session-info-fullscreen",
  "sourcePr": 680,
  "archive": "openspec/changes/archive/2026-10-05-present-session-info-fullscreen/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-05-present-session-info-fullscreen/acceptance.md",
  "finalizedDate": "2026-10-05",
  "specBaseSha": "cd51876bf6cb9c8d3fb1af7d5b712e6f01c81d8b",
  "acceptanceScenarios": [
    "Bare A1 opens `/session` as a full-screen `Session Info` route without adding report or status rows to the feed.",
    "Session identity and complete message, token, cache-warming, and conditional cost details render under shared owned-screen section headings.",
    "Reopening captures current statistics, while scrolling, dismissal, stale-notice cleanup, and viewport restoration retain reference-screen behavior.",
    "The `a1 pi` comparison profile keeps the complete pinned session report in its chronological feed position."
  ],
  "archiveDigest": "8cdc1ee1ab8ba3e644371b2e6a5e90caf7886cf958b689136a3a573e4da172ea",
  "specDigest": "e5f4bf46bd0cb5638da2824b46029ed097e6f7da304ee596006cf9045e3953f1",
  "tasksDigest": "61e2685f44f598de84349ed46f28858ce90df39d7e9be69ae1041f684040dc52",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
