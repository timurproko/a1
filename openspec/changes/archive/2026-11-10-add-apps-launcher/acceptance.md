# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Ctrl+P opens searchable Apps from Agent, Settings, and Changelog while preserving the existing session and draft.
- Ctrl+M opens Models when the terminal distinguishes it from Enter; ordinary Enter and the models command remain available.
- Owned floating dialogs use contrasting opaque panels and a reliably darkened backdrop, including nested Settings selectors.
- Successful model changes update status state without redundant notices while actionable warnings and failures remain visible.
- The first footer row separates the linked PR number with a dim dot and clips safely without changing comparison presentation.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "add-apps-launcher",
  "sourcePr": 900,
  "archive": "openspec/changes/archive/2026-11-10-add-apps-launcher/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-10-add-apps-launcher/acceptance.md",
  "finalizedDate": "2026-11-10",
  "specBaseSha": "8c5a4d03abf3e403a929e81078823d286a2f860f",
  "acceptanceScenarios": [
    "Ctrl+P opens searchable Apps from Agent, Settings, and Changelog while preserving the existing session and draft.",
    "Ctrl+M opens Models when the terminal distinguishes it from Enter; ordinary Enter and the models command remain available.",
    "Owned floating dialogs use contrasting opaque panels and a reliably darkened backdrop, including nested Settings selectors.",
    "Successful model changes update status state without redundant notices while actionable warnings and failures remain visible.",
    "The first footer row separates the linked PR number with a dim dot and clips safely without changing comparison presentation."
  ],
  "archiveDigest": "ce75b672c4514fa97ed90220b893d76fb0dafe969ff1c2e43aef618177ea8e6d",
  "specDigest": "e7c56f8bab53a90ab43c7c2dc6335261244a0b716254a5a8d46d557f29c5e2a6",
  "tasksDigest": "5349f8a8a5112b61d63191c83e6d060dfd2844151a8892ccc0c7ac105dd3d0c6",
  "evidenceDigest": "3e7d0509d75932e29b0fb70e794f61744cf40b88975a3ef32654e52745559d79",
  "knownGaps": []
}
```
