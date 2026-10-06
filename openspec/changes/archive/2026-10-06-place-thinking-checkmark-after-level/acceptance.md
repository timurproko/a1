# Conditional implementation acceptance

Verdict: accepted only when the containing exact pull-request head is manually merged by an authorized human after required current-head validation.

The manual merge accepts these scenarios:
- The configured default thinking level shows one success-green `●`, every other level shows a dim `○`, and `[default]` is absent.
- The active thinking level keeps its success-green checkmark one space after the level name while descriptions remain column-aligned.
- Pressing Space moves and persists the single filled default marker without changing the active session level or closing the selector.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "place-thinking-checkmark-after-level",
  "sourcePr": 685,
  "archive": "openspec/changes/archive/2026-10-06-place-thinking-checkmark-after-level/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-06-place-thinking-checkmark-after-level/acceptance.md",
  "finalizedDate": "2026-10-06",
  "specBaseSha": "8158cebda549493781558a73f127922e640ee2f1",
  "acceptanceScenarios": [
    "The configured default thinking level shows one success-green `●`, every other level shows a dim `○`, and `[default]` is absent.",
    "The active thinking level keeps its success-green checkmark one space after the level name while descriptions remain column-aligned.",
    "Pressing Space moves and persists the single filled default marker without changing the active session level or closing the selector."
  ],
  "archiveDigest": "0f87a29dc8d9d9eda73b64d85d1d5900d09408693f762c93d2985415e6e1e6d9",
  "specDigest": "f029ce4e4e111c537a3e297ba132384548c2b402e7395622dc2a6bfa153d3722",
  "tasksDigest": "de2cf974a0c673c9b9b933c53bdf219616b6f12b3a5973428801fbf1387c500e",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
