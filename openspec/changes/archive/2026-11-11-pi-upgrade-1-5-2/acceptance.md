# Conditional implementation acceptance

Verdict: accepted only when an authorized human directly merges the containing exact pull-request head after required current-head validation, explicitly asks the active agent to execute that protected exact-head merge while it is currently eligible, or personally enables native auto-merge for the unchanged head and GitHub integrates it after validation succeeds.

The maintainer integration decision accepts these scenarios:
- A1 pins Pi 1.5.2 at upstream commit b4afddd, and its vendored copies, inventories, public API and feature baselines, and parity records match that release.
- Missing-folder recovery offers Continue, Fork, and Cancel; Continue uses the current folder without persisting its cwd choice.
- Fork creates a new session ID and preserves the original, while cancellation and failed switches leave no unused fork or duplicate import.
- Startup recovery and interactive session replacement retain single-writer protection and existing cross-project fork policy.
- Standalone parity refresh generates its source-side settings metadata before loading consumers.

```openspec-delivery
{
  "version": 3,
  "repository": "timurproko/a1",
  "change": "pi-upgrade-1-5-2",
  "sourcePr": 906,
  "archive": "openspec/changes/archive/2026-11-11-pi-upgrade-1-5-2/",
  "acceptanceManifest": "openspec/changes/archive/2026-11-11-pi-upgrade-1-5-2/acceptance.md",
  "finalizedDate": "2026-11-11",
  "specBaseSha": "5541bb5d1f37699974aef66d8bb4604a85527355",
  "acceptanceScenarios": [
    "A1 pins Pi 1.5.2 at upstream commit b4afddd, and its vendored copies, inventories, public API and feature baselines, and parity records match that release.",
    "Missing-folder recovery offers Continue, Fork, and Cancel; Continue uses the current folder without persisting its cwd choice.",
    "Fork creates a new session ID and preserves the original, while cancellation and failed switches leave no unused fork or duplicate import.",
    "Startup recovery and interactive session replacement retain single-writer protection and existing cross-project fork policy.",
    "Standalone parity refresh generates its source-side settings metadata before loading consumers."
  ],
  "archiveDigest": "9ace222bfdbd1b3c664bda808c465ff2fb5d6b0e522ba2c7b3d07ab7bfe2adae",
  "specDigest": "1566803f6900acc4730e5081eb54ccdc207e92fad6ed384d1d14439abd0e9665",
  "tasksDigest": "6fbb4f31b952668510d3971b1914d93459852f93d4cac1ffeb78759ee93fd8f8",
  "evidenceDigest": "b682a619966474977daea8bbe7a084a3c17fafa7886554efd293c47740f24693",
  "knownGaps": []
}
```
