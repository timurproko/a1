# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The engine, session-shell, owned-UI, and composition suites pass unchanged (662 cases): block identities, revisions, and settlement behave as before through the adapter.
- Driving `PiTranscriptProjection` directly with messages, tool events, and declaration failures yields the same identities, revisions, and settlement outcomes, and a repeated block is neither re-revisioned nor reported.
- `adapter.ts` no longer holds transcript state; every transcript read or write goes through the projection.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "extract-transcript-projection",
  "sourcePr": 482,
  "archive": "openspec/changes/archive/2026-09-18-extract-transcript-projection/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-18-extract-transcript-projection/acceptance.md",
  "finalizedDate": "2026-09-18",
  "specBaseSha": "68f2e1541689e9679b2e1aa31e092642966bb7ea",
  "acceptanceScenarios": [
    "The engine, session-shell, owned-UI, and composition suites pass unchanged (662 cases): block identities, revisions, and settlement behave as before through the adapter.",
    "Driving `PiTranscriptProjection` directly with messages, tool events, and declaration failures yields the same identities, revisions, and settlement outcomes, and a repeated block is neither re-revisioned nor reported.",
    "`adapter.ts` no longer holds transcript state; every transcript read or write goes through the projection."
  ],
  "archiveDigest": "4d5facfac6af6e44c394e835c882b86dd6562aab896feaa625c0430243db9ae4",
  "specDigest": "f47d95154d9f6ba4c0047f08a59acabbebf1357351b8007386de2541276dad59",
  "tasksDigest": "e4023654ebdf569913851d45e100152cd29f1c5ab8867037fce562a258cb373c",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
