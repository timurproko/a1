# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A1 starts, renders, and accepts prompts in bare mode and in the pinned comparison profile exactly as before, including startup notices, the release changelog route, and the release banner.
- Dialogs, selectors, the login flow, slash commands, skills, bash input, follow-ups, image pastes, and copy behave as before, and a replaced session (new, resume, or fork) starts with no leftover dialog, notice, paste, or input surface.
- Resident tabs start, switch, rename, restart, recover unfinished prompts, report working and stalled status, and detach on quit as before.
- The architecture check fails a change that grows any recorded class or function, and a change that adds a new oversized one.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "decouple-session-architecture",
  "sourcePr": 795,
  "archive": "openspec/changes/archive/2026-10-19-decouple-session-architecture/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-19-decouple-session-architecture/acceptance.md",
  "finalizedDate": "2026-10-19",
  "specBaseSha": "a7d7fe85c13e82a3e089a8da07e1edafc66630fc",
  "acceptanceScenarios": [
    "A1 starts, renders, and accepts prompts in bare mode and in the pinned comparison profile exactly as before, including startup notices, the release changelog route, and the release banner.",
    "Dialogs, selectors, the login flow, slash commands, skills, bash input, follow-ups, image pastes, and copy behave as before, and a replaced session (new, resume, or fork) starts with no leftover dialog, notice, paste, or input surface.",
    "Resident tabs start, switch, rename, restart, recover unfinished prompts, report working and stalled status, and detach on quit as before.",
    "The architecture check fails a change that grows any recorded class or function, and a change that adds a new oversized one."
  ],
  "archiveDigest": "28412a3ceeab1bb33b424af5c8d44fd8df588799ba465ce753555d56c7fb27c5",
  "specDigest": "f0d4695345e07676dfb2fc62de660b603f2c43be4c815835386507aecb4b8872",
  "tasksDigest": "33b15e9b6369d189d62bb6ffa80b4dc818050f941cc4d77cedebc4e1252a7ad6",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
