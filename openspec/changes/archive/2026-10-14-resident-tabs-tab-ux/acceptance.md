# Conditional implementation acceptance

Verdict: accepted only when an authorized human manually merges the containing exact pull-request head after required current-head validation, or personally enables native auto-merge for that unchanged head and GitHub integrates it after the validation succeeds.

The maintainer integration decision accepts these scenarios:
- Bare `a1` opens the resident tab strip with always-visible close buttons, overflow, clock, mouse selection, drag reorder, and inline rename, while `a1 solo` and `a1 pi` launch directly with no Tabs settings section.
- Each tab shows its agent's live status and resolved accent, and default-named tabs take an automatic name unless the user renamed them.
- `Alt+A` creates a tab from the matching prewarmed standby, `Alt+W` closes a tab gracefully while preserving its session, and a tab shortcut that conflicts with an existing binding is disabled instead of overriding it.
- Typing in another terminal moves control of the viewed tab to it automatically; the previous terminal becomes a viewer whose input never reaches the agent.
- `/quit` and empty-editor `Ctrl+D` detach only the local terminal and report how many agents are still running, and are refused safely when control moved after the command was entered.
- Selecting a session that is already open views its tab instead of starting a second writer.
- Settings > Tabs offers only the tab limit and automatic naming, and the tab limit is clamped to 1 through 50.
- Typing echoes and new standby tabs accept input within the declared latency budgets on Windows x64, macOS arm64, and Linux x64.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "resident-tabs-tab-ux",
  "sourcePr": 749,
  "archive": "openspec/changes/archive/2026-10-14-resident-tabs-tab-ux/",
  "acceptanceManifest": "openspec/changes/archive/2026-10-14-resident-tabs-tab-ux/acceptance.md",
  "finalizedDate": "2026-10-14",
  "specBaseSha": "6b595737d3b0676a46bf8f2cf343aa9b55528177",
  "acceptanceScenarios": [
    "Bare `a1` opens the resident tab strip with always-visible close buttons, overflow, clock, mouse selection, drag reorder, and inline rename, while `a1 solo` and `a1 pi` launch directly with no Tabs settings section.",
    "Each tab shows its agent's live status and resolved accent, and default-named tabs take an automatic name unless the user renamed them.",
    "`Alt+A` creates a tab from the matching prewarmed standby, `Alt+W` closes a tab gracefully while preserving its session, and a tab shortcut that conflicts with an existing binding is disabled instead of overriding it.",
    "Typing in another terminal moves control of the viewed tab to it automatically; the previous terminal becomes a viewer whose input never reaches the agent.",
    "`/quit` and empty-editor `Ctrl+D` detach only the local terminal and report how many agents are still running, and are refused safely when control moved after the command was entered.",
    "Selecting a session that is already open views its tab instead of starting a second writer.",
    "Settings > Tabs offers only the tab limit and automatic naming, and the tab limit is clamped to 1 through 50.",
    "Typing echoes and new standby tabs accept input within the declared latency budgets on Windows x64, macOS arm64, and Linux x64."
  ],
  "archiveDigest": "7bfe970e134ff6aa7a18b06b831e134bff5d64b729e2353704652693523f86ba",
  "specDigest": "4459e566bf92e5896d00c8f4ed417b651c2d058a5d2352102f4ead060bbce4ea",
  "tasksDigest": "3b4b4e9af75ca3cf26f284533aab5418c06efeb54f6160f3391ce561b25ae6c9",
  "evidenceDigest": "8a03a61f9c02c3b09851830d097221f1234daaa4073fd74198189c41b0a73602",
  "knownGaps": []
}
```
