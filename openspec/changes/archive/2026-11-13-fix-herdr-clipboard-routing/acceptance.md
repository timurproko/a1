# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Herdr identity selects terminal-owned copy even when the emulator name is absent or overridden.
- Selection autocopy and explicit copy submit the complete text once without writing the agent host clipboard.
- Unavailable, denied, or oversized terminal delivery fails without substituting a host-native clipboard write.
- Terminal-provided paste inserts once without a redundant read, while raw native paste remains unavailable unless an explicit clipboard port supplies it.
- Non-Herdr destination rules, clipboard limits, delivery acknowledgement semantics, and the comparison profile remain unchanged.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "fix-herdr-clipboard-routing",
  "sourcePr": 922,
  "archive": "openspec/changes/archive/2026-11-13-fix-herdr-clipboard-routing/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-13-fix-herdr-clipboard-routing/acceptance.md",
  "finalizedDate": "2026-11-13",
  "specBaseSha": "41ab0cfa23a7793ed80bec89aff54c804d8973ec",
  "acceptanceScenarios": [
    "Herdr identity selects terminal-owned copy even when the emulator name is absent or overridden.",
    "Selection autocopy and explicit copy submit the complete text once without writing the agent host clipboard.",
    "Unavailable, denied, or oversized terminal delivery fails without substituting a host-native clipboard write.",
    "Terminal-provided paste inserts once without a redundant read, while raw native paste remains unavailable unless an explicit clipboard port supplies it.",
    "Non-Herdr destination rules, clipboard limits, delivery acknowledgement semantics, and the comparison profile remain unchanged."
  ],
  "archiveDigest": "bc4b1ce129589023cb216ae0a4604b5df86dedc88d30f98c3a0c0799dea3e571",
  "specDigest": "17ef3b6987a9b95f476f34122b9599b3d3fdb9246f64552232019844b7220b05",
  "tasksDigest": "0404d5bcdcd4ad7a1c09aab0f3136b4c51a23cabf2bf24a24e564bc91c558a2e",
  "evidenceDigest": "71d2e02f23ff115ead432dad590f7776348d7cd437ba05a173bb00dc19bb579d",
  "knownGaps": []
}
```
