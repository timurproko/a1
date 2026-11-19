# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- A `Switched to …` notice raised while the agent is working stays below `Working...` through streamed text, further assistant blocks, and tool blocks, and remains after the run finishes.
- The next submitted prompt, an appended error, or a session reset removes it; the notice text starts one cell in.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "dock-notice-survives-agent-work",
  "sourcePr": 468,
  "archive": "openspec/changes/archive/2026-09-17-dock-notice-survives-agent-work/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-17-dock-notice-survives-agent-work/acceptance.md",
  "finalizedDate": "2026-09-17",
  "specBaseSha": "65daec4c4abaa29fb8d4b641d52008f499101ec3",
  "acceptanceScenarios": [
    "A `Switched to …` notice raised while the agent is working stays below `Working...` through streamed text, further assistant blocks, and tool blocks, and remains after the run finishes.",
    "The next submitted prompt, an appended error, or a session reset removes it; the notice text starts one cell in."
  ],
  "archiveDigest": "aa6fef313250171f8a958bcfdf678ec6b25b59c3282030d96f55a57aa765f2bd",
  "specDigest": "4314e6d43ad13e25ae7efd28bf79064775f06622c90a3c8890541b13d4870425",
  "tasksDigest": "287556b9c4c2b2a6365b8e3c7618be6a5533e6cc04c0a39b0a378020c220a140",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
