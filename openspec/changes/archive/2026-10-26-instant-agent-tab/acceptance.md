# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Creating an Agent immediately selects one new chip and displays an empty, cursor-free body until the Agent UI draws.
- An early registry update never adds a second new Agent chip; the real chip replaces the provisional one with the first complete screen.
- Typing during startup reaches only the new Agent, while a refused creation restores the previous view without a ghost tab.

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
    "Creating an Agent immediately selects one new chip and displays an empty, cursor-free body until the Agent UI draws.",
    "An early registry update never adds a second new Agent chip; the real chip replaces the provisional one with the first complete screen.",
    "Typing during startup reaches only the new Agent, while a refused creation restores the previous view without a ghost tab."
  ],
  "archiveDigest": "bb613407afa0f23773f8143e18ae1188edc32265a774d51c3b2c54ed5e642dd5",
  "specDigest": "9ba814c9e2a9bab83671859c0bb010fd10cd222bd729c2aab922c44efea0b6a9",
  "tasksDigest": "9bd0d3c4bae6e36316c939128a66e79dd3b8c7f369908be3f452adb419fdacf7",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
