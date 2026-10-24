# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- Ordinary printable input opens Settings search immediately and retains the first character; `/` is ordinary query text.
- Settings search uses the agent editor's editing, selection, pointer, copy, and cut behavior with exact `Type search` and `Search settings` text.
- Settings remains single-line and rejects shortcut, complete bracketed, and fragmented bracketed paste while agent and pinned Pi behavior remain intact.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "unify-settings-search-input",
  "sourcePr": 822,
  "archive": "openspec/changes/archive/2026-10-24-unify-settings-search-input/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-24-unify-settings-search-input/acceptance.md",
  "finalizedDate": "2026-10-24",
  "specBaseSha": "3b474cdf46e31c9249b5cd3a6fb1833154c9981a",
  "acceptanceScenarios": [
    "Ordinary printable input opens Settings search immediately and retains the first character; `/` is ordinary query text.",
    "Settings search uses the agent editor's editing, selection, pointer, copy, and cut behavior with exact `Type search` and `Search settings` text.",
    "Settings remains single-line and rejects shortcut, complete bracketed, and fragmented bracketed paste while agent and pinned Pi behavior remain intact."
  ],
  "archiveDigest": "b3025d76c7339961f9ac6354e9a8a340498d99d9b57afd9a1fe8a8ffd6f414bd",
  "specDigest": "94dd7c631b9d60cc3deb60e1b19c1306c9fcd80319e7ff3de6dc469ee5c82dfa",
  "tasksDigest": "2cc96b94bee68a5ac50822c21252ccb18f71417e79eb738fa1608f5d997baadd",
  "evidenceDigest": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
  "knownGaps": []
}
```
