# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Updating and reopening A1 reconnects the same live busy and idle Agents, drafts, queued work, interactions and sessions without restarting execution.
- New Agents and utilities use the selected release while retained Agents keep their original code, processes and writer custody.
- Incompatible or unverifiable runtime control refuses activation and retains an eligible verified prior client without stopping Agents.
- Client or coordinator replacement restores fenced live control without duplicate Agents or replayed input and retains required execution and private recovery artifacts.
- Connected-client readiness remains distinct from retained engine version and does not require restarting Agents after reconnection.
- New tabs append last, visible utilities activate in place, and utility toggles, close and reopen preserve stable order and coherent presentation without Agent restarts.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "preserve-agents-across-updates",
  "sourcePr": 858,
  "archive": "openspec/changes/archive/2026-11-01-preserve-agents-across-updates/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-01-preserve-agents-across-updates/acceptance.md",
  "finalizedDate": "2026-11-01",
  "specBaseSha": "78670a375c1e697328e7918ed41057d4ec6650ff",
  "acceptanceScenarios": [
    "Updating and reopening A1 reconnects the same live busy and idle Agents, drafts, queued work, interactions and sessions without restarting execution.",
    "New Agents and utilities use the selected release while retained Agents keep their original code, processes and writer custody.",
    "Incompatible or unverifiable runtime control refuses activation and retains an eligible verified prior client without stopping Agents.",
    "Client or coordinator replacement restores fenced live control without duplicate Agents or replayed input and retains required execution and private recovery artifacts.",
    "Connected-client readiness remains distinct from retained engine version and does not require restarting Agents after reconnection.",
    "New tabs append last, visible utilities activate in place, and utility toggles, close and reopen preserve stable order and coherent presentation without Agent restarts."
  ],
  "archiveDigest": "2bc8e03878b12306f29ea6cd9975e4f5b23ccfbd038671cbbd3968cb1ed9277e",
  "specDigest": "bbc73f0e5643695980bc4a1f468e9c25fa760ead1b7e49477f4b5c9327bb14f7",
  "tasksDigest": "ecb855339383b4dd8aef46fb70c20d3def3be087610f5dfc03c9d1c56ac7a2c4",
  "evidenceDigest": "7421cc143f1510d7b5cb076434b4b807e9b3651e1fbaf67d9f57e8df93520fb2",
  "knownGaps": []
}
```
