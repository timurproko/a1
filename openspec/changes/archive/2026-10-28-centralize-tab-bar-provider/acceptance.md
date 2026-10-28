# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Agent, Settings, and Changelog behavior comes from one shared tab-kind provider.
- Shortcuts, the command palette, and the plus launcher apply the same create-or-toggle activation rules.
- Singleton tabs create, reveal, activate, and hide consistently while retaining their process and dragged slot.
- A new Agent created after Settings or Changelog appears after that tab at the end of the strip.
- Cold creation, standby promotion, and hidden-tab reveal ignore stopped records and use the same visible ordering rules.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "centralize-tab-bar-provider",
  "sourcePr": 847,
  "archive": "openspec/changes/archive/2026-10-28-centralize-tab-bar-provider/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-28-centralize-tab-bar-provider/acceptance.md",
  "finalizedDate": "2026-10-28",
  "specBaseSha": "81d81ade9416f501305300eafaafd2972b0efafb",
  "acceptanceScenarios": [
    "Agent, Settings, and Changelog behavior comes from one shared tab-kind provider.",
    "Shortcuts, the command palette, and the plus launcher apply the same create-or-toggle activation rules.",
    "Singleton tabs create, reveal, activate, and hide consistently while retaining their process and dragged slot.",
    "A new Agent created after Settings or Changelog appears after that tab at the end of the strip.",
    "Cold creation, standby promotion, and hidden-tab reveal ignore stopped records and use the same visible ordering rules."
  ],
  "archiveDigest": "8d9ed4b59707891a572a82714ea64ec65987d6a3ac37475b68d3b5649ed3c816",
  "specDigest": "5a0d1568c17caa4186db8d4f2cefdebc288949a592bb3c8985f0c4f329f550a4",
  "tasksDigest": "3fab7a3e1fb11b890a59ec8170524248a5f55fccbe03f858bccac54c0d19c2e9",
  "evidenceDigest": "f416eae4c9f91c83163a810cc1c8de467c6d27da096611f7c2f72fd9ce4f435d",
  "knownGaps": []
}
```
