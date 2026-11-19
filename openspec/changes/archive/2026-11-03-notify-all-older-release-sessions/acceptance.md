# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Every older published process reports `Update installed, restart to update` from approved local active-release state without depending on registry access or update mode.
- Malformed, unapproved, equal, older, cross-channel, and unpublished release comparisons remain silent and mutation-free.
- Tab Bar Right Side defaults to Version then Time and persists any independently enabled subset through its searchable multi-select dialog.
- The tab strip shows the immutable executing attach-client version, gives Version up before Time on narrow rows, and preserves overflow and hit geometry.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "notify-all-older-release-sessions",
  "sourcePr": 864,
  "archive": "openspec/changes/archive/2026-11-03-notify-all-older-release-sessions/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-03-notify-all-older-release-sessions/acceptance.md",
  "finalizedDate": "2026-11-03",
  "specBaseSha": "32afd4b3acaa0de3fddb429058084448ef5874fb",
  "acceptanceScenarios": [
    "Every older published process reports `Update installed, restart to update` from approved local active-release state without depending on registry access or update mode.",
    "Malformed, unapproved, equal, older, cross-channel, and unpublished release comparisons remain silent and mutation-free.",
    "Tab Bar Right Side defaults to Version then Time and persists any independently enabled subset through its searchable multi-select dialog.",
    "The tab strip shows the immutable executing attach-client version, gives Version up before Time on narrow rows, and preserves overflow and hit geometry."
  ],
  "archiveDigest": "1323f042e9d5ca0ff7048b321b1930d2efe73938423d61856785a5386941fce3",
  "specDigest": "f3f0d2a5e1ec305ac8134a710c4b3382cae649acf467191fe5dc51554c3d8a36",
  "tasksDigest": "a2d58d5ca2a45dbe796d0b0866aefbb4337be3b3af2a9c5c27c36a1e96a81fbe",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
