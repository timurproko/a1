# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Updating and reopening A1 reconnects the same live busy and idle Agents, drafts, queued work, interactions and sessions without restarting execution.
- New Agents and utilities use the selected release while retained Agents keep their original code, processes and writer custody.
- Incompatible or unverifiable runtime control refuses activation and retains an eligible verified prior client without stopping Agents.
- Client or coordinator replacement restores fenced live control without duplicate Agents or replayed input and retains required execution and private recovery artifacts.
- Connected-client readiness remains distinct from retained engine version and does not require restarting Agents after reconnection.

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
    "Connected-client readiness remains distinct from retained engine version and does not require restarting Agents after reconnection."
  ],
  "archiveDigest": "13a791601e784a17048650b13c1c52a2d11df5a1d93b3aa052118c2fdbc85d22",
  "specDigest": "890d7cc0d21ce89417aae9a31ada0b02ba83181fb9380d739e42414fb942c1c6",
  "tasksDigest": "df2f28d244b05569ddce64256815f4a2e83b8747754e3fc954ee256f8f9cc34a",
  "evidenceDigest": "86de065ed3e256c81aa01ec9240128485d7f5eaafcd96ada7efea84fb3b8dbdb",
  "knownGaps": []
}
```
