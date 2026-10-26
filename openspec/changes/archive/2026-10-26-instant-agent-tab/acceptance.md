# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Requesting an Agent immediately selects one chip and displays an empty conversation, ruled prompt with a visual caret, and both footer rows without loading text.
- The provisional footer shows zero new-tab usage with the latest Agent model/context hints when available, or neutral values until the new Agent reports its own.
- The first complete Agent frame replaces the provisional shell and chip without duplicates; input during startup reaches only the new Agent.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "instant-agent-tab",
  "sourcePr": 837,
  "archive": "openspec/changes/archive/2026-10-26-instant-agent-tab/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-26-instant-agent-tab/acceptance.md",
  "finalizedDate": "2026-10-26",
  "specBaseSha": "9525032c2c6d40dff58f20976ed8009054913c94",
  "acceptanceScenarios": [
    "Requesting an Agent immediately selects one chip and displays an empty conversation, ruled prompt with a visual caret, and both footer rows without loading text.",
    "The provisional footer shows zero new-tab usage with the latest Agent model/context hints when available, or neutral values until the new Agent reports its own.",
    "The first complete Agent frame replaces the provisional shell and chip without duplicates; input during startup reaches only the new Agent."
  ],
  "archiveDigest": "c7f2f7ad9b72310a6faf772604cb5d81b9ab4ae2a4622cb8f74431384c2dab34",
  "specDigest": "e952648e8ca01822050b54f779f5b5a180915ee9c30b424f80438e4f8a66823e",
  "tasksDigest": "19041fb97c10ae12d223e8c2414d8ee46c8d658e71034a7da26a2211f8341419",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
